// --- WhatsApp Bot — single-instance & no-QR-after-connected -----------------
// Corta pods concurrentes (lock exclusivo), evita QR tras conectar, y bloquea
// doble initialize. Pensado para orquestadores tipo Northflank.
// ----------------------------------------------------------------------------

import fs from 'fs';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- logs con PID (ojo: cada contenedor tendrá su propio PID 1/2/etc.)
const PID = process.pid;
const log = (...args) => console.log(`[pid ${PID}]`, ...args);

// ---- Lock EXCLUSIVO por archivo: si ya hay otro proceso, este sale.
const SESSION_DIR = '/wwebjs_auth';
const LOCK_PATH = `${SESSION_DIR}/.session.lock`;
let lockFd = null;
function acquireExclusiveLock() {
  const STALE_MS = 2 * 60 * 1000; // 2 min: si el lock es más viejo, se considera huérfano
  try {
    fs.mkdirSync(SESSION_DIR, { recursive: true });

    // ¿Se pidió forzar reset por env?
    if (process.env.FORCE_LOCK_RESET === 'true') {
      try { fs.unlinkSync(LOCK_PATH); } catch {}
    }

    // Si ya existe, ¿está "viejo"? -> bórralo
    if (fs.existsSync(LOCK_PATH)) {
      try {
        const st = fs.statSync(LOCK_PATH);
        const age = Date.now() - st.mtimeMs;
        if (age > STALE_MS) {
          log(`🧹 Lock viejo (~${Math.round(age/1000)}s). Eliminando ${LOCK_PATH}`);
          fs.unlinkSync(LOCK_PATH);
        } else {
          // No está viejo -> respetamos el lock y salimos
          log('🔒 Otra instancia ya usa la sesión (lock existe, reciente). Saliendo.');
          process.exit(0);
        }
      } catch (err) {
        log('⚠️ No pude evaluar el lock existente, salgo por seguridad:', err?.message || err);
        process.exit(0);
      }
    }

    // Intentar crear lock atómico
    lockFd = fs.openSync(LOCK_PATH, 'wx');
    fs.writeFileSync(LOCK_PATH, String(PID));

    const cleanup = () => {
      try { if (lockFd) fs.closeSync(lockFd); } catch {}
      try { fs.unlinkSync(LOCK_PATH); } catch {}
    };
    process.on('exit', cleanup);
    process.on('SIGINT', () => { cleanup(); process.exit(0); });
    process.on('SIGTERM', () => { cleanup(); process.exit(0); });

    log('🔑 Lock exclusivo adquirido');
  } catch (e) {
    if (e?.code === 'EEXIST') {
      log('🔒 Otra instancia ya usa la sesión (lock existe). Saliendo.');
      process.exit(0);
    } else {
      log('⚠️ Error adquiriendo lock:', e?.message || e);
      process.exit(0);
    }
  }
}

acquireExclusiveLock();

// ---- Estado app/bot
const inscripcionesSorteo = new Map();
const __cooldown = new Map();
let lastQRDataURL = null;
let client = null;
let initInProgress = false;
let isReady = false;

// ---- Manejo de errores no atrapados (evita crash y loop de reinicios)
process.on('unhandledRejection', (err) => log('⚠️ unhandledRejection:', err));
process.on('uncaughtException', (err) => log('⚠️ uncaughtException:', err));

// ---- Fábrica del cliente (listeners se montan UNA vez por instancia)
function buildClient() {
  const c = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
    // webVersion: '2.2412.54', // <- activar solo si necesitas “clavar” versión Web temporalmente
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/wa-version.json',
    },
    puppeteer: {
      // Config crítico para contenedores (Northflank)
      headless: true,
      executablePath: puppeteer.executablePath(),        // usa Chromium de Puppeteer
      protocolTimeout: 120_000,                           // margen por latencias en cloud
      defaultViewport: { width: 800, height: 600, deviceScaleFactor: 1 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--no-zygote',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--no-first-run',
        '--no-default-browser-check',
        '--mute-audio',
        '--window-size=800,600',
        '--blink-settings=imagesEnabled=false'
      ]
    }
  });

  // Listeners con .once para evitar duplicados de logs/acciones por instancia
  c.once('authenticated', async () => {
    const s = await c.getState().catch(() => 'NO_STATE');
    log('🔐 authenticated, state =', s);
  });

  c.once('ready', async () => {
    isReady = true;
    lastQRDataURL = null; // no más QR tras conectar
    const s = await c.getState().catch(() => 'NO_STATE');
    log('✅ BOT IS READY | state =', s);
  });

  c.on('change_state', (s) => {
    isReady = (s === 'CONNECTED');
    log('🔁 change_state:', s);
  });

  c.on('auth_failure', (m) => log('❌ auth_failure:', m));

  c.on('disconnected', async (reason) => {
  log('⚠️ disconnected, motivo:', reason);
  if (reason === 'LOGOUT') {
    log('🔄 Necesita re-escaneo de QR (logout desde el celular o conflicto de sesión)');
  }
  isReady = false;
  try { await c.destroy(); } catch {}
  client = null;
  setTimeout(() => ensureInit().catch(() => {}), 3000);
});


  // QR: NO publicar si ya está conectado
  c.on('qr', async (qr) => {
    if (isReady) {
      log('🔇 QR ignorado (ya conectado)');
      return;
    }
    log('🟩 QR solicitado (cliente pidió autenticación)');
    try { qrcodeTerminal.generate(qr, { small: true }); } catch {}
    try {
      lastQRDataURL = await QRCode.toDataURL(qr);
      log('📷 QR generado y cacheado en memoria');
      try {
        await QRCode.toFile(path.join(__dirname, 'qr.png'), qr);
        log('💾 QR guardado como qr.png (opcional)');
      } catch (err) {
        log('⚠️ No se pudo escribir qr.png:', err?.message || err);
      }
    } catch (err) {
      log('❌ Error generando QR:', err);
    }
  });

  // Mensajes (tus respuestas)
  c.on('message', async (msg) => {
    try {
      log('📨 Mensaje recibido - from:', msg.from, 'body:', (msg.body || '').substring(0, 50));
      
      if (msg.fromMe) {
        log('⏭️ Ignorado: mensaje propio');
        return;
      }
      if (msg.from === 'status@broadcast') {
        log('⏭️ Ignorado: status broadcast');
        return;
      }
      if (msg.from.endsWith('@g.us')) {
        log('⏭️ Ignorado: mensaje de grupo');
        return;
      }

      try {
        const now = Date.now();
        const last = __cooldown.get(msg.from) || 0;
        if (now - last < 1500) {
          log('⏭️ Ignorado: cooldown activo');
          return;
        }
        __cooldown.set(msg.from, now);
      } catch {}

      const texto = (msg.body || '').trim().toLowerCase();
      const telefono = (msg.from || '').split('@')[0] || '';
      const usuario = inscripcionesSorteo.get(msg.from);
      
      log('✅ Procesando mensaje - texto:', texto, 'teléfono:', telefono);

    if (usuario?.estado === 'esperando_nombre') {
      usuario.nombre = (msg.body || '').trim();
      usuario.estado = 'completado';
      await msg.reply(`✅ ¡Gracias ${usuario.nombre}! Estás participando del sorteo con el número ${usuario.telefono}. ¡Mucha suerte! 🎉`);

      try {
        const resp = await fetch('https://script.google.com/macros/s/AKfycbxkk6uC3K6mN6dbRWzviSLYViqN8ML3Vq0L_pQ5jm46eSfThviuaiOp7UGcEZx-mBLKPw/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: usuario.nombre, telefono: usuario.telefono }),
        });
        log('✅ Respuesta de Google Sheets:', await resp.text());
      } catch (error) {
        log('❌ Error al enviar datos a Google Sheets:', error);
      }

      await msg.reply(`👋 ¿Qué quieres hacer ahora?
1️⃣ Ver la carta  
2️⃣ Consultar horarios  
3️⃣ Hacer una reserva  
4️⃣ Conocer nuestra ubicación`);
      return;
    }

    switch (texto) {
      case '1':
        await msg.reply(`🍽️ Ambas cartas: https://www.laprincesa.cl/carta`);
        break;
      case '2':
        await msg.reply(`⏰ Horarios:
- Lunes a sábados: 12:00 a 23:00
- Domingos: 12:00 a 20:00`);
        break;
      case '3':
        await msg.reply(`📅 Para hacer una reserva: https://tinyurl.com/uaxzmbr6`);
        break;
      case '4':
        await msg.reply(`📍 Paseo Colina Sur 14500, local 102 y 106. https://maps.app.goo.gl/rECKibRJ2Sz6RgfZA`);
        break;
      case '86':
        inscripcionesSorteo.set(msg.from, { estado: 'esperando_nombre', telefono });
        await msg.reply(`🎁 ¡Estás participando del sorteo!

Por favor respondé este mensaje con tu nombre completo para finalizar tu inscripción.

✅ Hemos registrado tu número: ${telefono}`);
        break;
      default:
        await msg.reply(`👋 ¡Hola! Soy Alma, bot de La Princesa y Ramona. ¿Qué quieres hacer?
1️⃣ Ver la carta  
2️⃣ Consultar horarios  
3️⃣ Hacer una reserva  
4️⃣ Conocer nuestra ubicación`);
    }
    } catch (error) {
      log('❌ Error procesando mensaje:', error?.message || error, error?.stack);
    }
  });

  return c;
}

// ---- Inicialización con guardia (nunca en paralelo)
async function ensureInit() {
  if (initInProgress) { log('⏳ init en curso, omito reintento'); return; }
  initInProgress = true;
  try {
    if (!client) client = buildClient();
    await client.initialize();
  } catch (e) {
    log('❌ Error en initialize():', e);
    try { await client?.destroy(); } catch {}
    client = null;
  } finally {
    initInProgress = false;
  }
}

// Heartbeat (solo informa; nada de reintentos agresivos aquí)
setInterval(async () => {
  const s = await client?.getState?.().catch(() => 'NO_STATE');
  log('🩺 heartbeat state:', s ?? 'null');
}, 10000);

// Arranque
log('🚀 Bot iniciando en Northflank…');
ensureInit().catch(() => {});

// --------------------- Servidor HTTP ---------------------
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (_req, res) => res.send('🟢 Bot de WhatsApp activo en Northflank'));

app.get('/qr', (_req, res) => {
  if (isReady) return res.status(204).send(); // no mostrar QR si ya está conectado
  if (!lastQRDataURL) return res.status(503).send('⚠️ QR aún no generado. Recarga cada 2–3 s.');
  const img = Buffer.from(lastQRDataURL.split(',')[1], 'base64');
  res.set('Content-Type', 'image/png');
  res.send(img);
});

app.get('/state', async (_req, res) => {
  try {
    const state = await client?.getState?.().catch(() => 'NO_STATE');
    res.json({ state: state ?? null });
  } catch (e) {
    res.status(500).json({ state: 'ERROR', error: String(e) });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true, ready: isReady, qr: !!lastQRDataURL }));

app.post('/restart', async (_req, res) => {
  try {
    log('♻️ Reiniciando cliente…');
    isReady = false;
    initInProgress = false;
    lastQRDataURL = null;
    try { await client?.destroy(); } catch {}
    client = null;
    await ensureInit();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

const server = app.listen(port, () => log(`🌐 Servidor web escuchando en http://localhost:${port}`));

// Apagado limpio del HTTP server
process.on('SIGTERM', () => {
  try { server.close(() => log('🛑 HTTP server cerrado')); } catch {}
});
