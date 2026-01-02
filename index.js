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
// SESSION_DIR: en producción (Northflank) usa /wwebjs_auth, localmente usa ./wwebjs_auth
const SESSION_DIR = process.env.SESSION_DIR || path.join(__dirname, 'wwebjs_auth');
const LOCK_PATH = path.join(SESSION_DIR, '.session.lock');
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
  log('🔧 Creando nuevo cliente WhatsApp...');
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
    log('🎯 Listener de mensajes registrado y activo');
    log('📬 El bot está listo para recibir mensajes');
    
    // Verificar que los listeners estén activos
    const listeners_create = c.listenerCount('message_create');
    const listeners_message = c.listenerCount('message');
    log('🔍 Listeners registrados - message_create:', listeners_create, 'message:', listeners_message);
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
  log('📝 Registrando listener de mensajes...');
  log('🔔 Listener "message_create" será activado cuando el cliente esté ready');
  
  // Función para procesar mensajes
  const handleMessage = async (msg) => {
    const msgId = msg.id?._serialized || msg.id || 'unknown';
    log('📨 ========== MENSAJE RECIBIDO ==========');
    log('📨 ID:', msgId);
    log('📨 From:', msg.from);
    log('📨 Body:', (msg.body || '').substring(0, 100));
    log('📨 FromMe:', msg.fromMe);
    log('📨 IsGroup:', msg.from?.endsWith('@g.us'));
    
    try {
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
          log('⏭️ Ignorado: cooldown activo (último:', last, 'ahora:', now, 'diff:', now - last);
          return;
        }
        __cooldown.set(msg.from, now);
        log('✅ Cooldown actualizado');
      } catch (err) {
        log('⚠️ Error en cooldown:', err?.message || err);
      }

      const texto = (msg.body || '').trim().toLowerCase();
      const telefono = (msg.from || '').split('@')[0] || '';
      
      log('✅ Procesando mensaje - texto:', texto, 'teléfono:', telefono);

      switch (texto) {
        case '1':
          log('💬 Respondiendo: opción 1 (precios)');
          try {
            const result = await msg.reply(`💰 *Nuestros Planes de Páginas Web*

Ofrecemos planes mensuales que incluyen:
• Diseño profesional
• Hosting y dominio
• Mantenimiento continuo
• Soporte técnico

📋 *Planes disponibles:*

• *Landing Page*: $24.000/mes
• *Catálogo Online*: $41.000/mes
• *Business Web*: $58.000/mes

💬 Para más detalles o consultas personalizadas, elige la opción 4 para hablar con un agente.`);
            log('✅ Respuesta enviada exitosamente. ID:', result?.id?._serialized || result?.id);
          } catch (replyError) {
            log('❌ Error al enviar respuesta (opción 1):', replyError?.message || replyError, replyError?.stack);
          }
          break;
        case '2':
          log('💬 Respondiendo: opción 2 (trabajos)');
          try {
            const result = await msg.reply(`🎨 *Nuestros Trabajos*

Creamos páginas web profesionales y modernas para tu negocio. Nuestros servicios incluyen:

✨ *Lo que ofrecemos:*
• Diseño responsive (se adapta a móviles)
• Optimización para buscadores (SEO)
• Integración con redes sociales
• Formularios de contacto
• Panel de administración
• Actualizaciones de contenido

🚀 *Tecnologías que utilizamos:*
• Diseño moderno y profesional
• Velocidad optimizada
• Seguridad implementada

💡 Todos nuestros sitios incluyen mantenimiento continuo y soporte técnico.`);
            log('✅ Respuesta enviada exitosamente. ID:', result?.id?._serialized || result?.id);
          } catch (replyError) {
            log('❌ Error al enviar respuesta (opción 2):', replyError?.message || replyError, replyError?.stack);
          }
          break;
        case '3':
          log('💬 Respondiendo: opción 3 (página web)');
          try {
            const result = await msg.reply(`🌐 *Nuestra Página Web*

Visita nuestro sitio para conocer más sobre nuestros servicios:

🔗 https://unikuoweb.com/

Allí encontrarás:
• Portafolio de trabajos
• Información detallada de servicios
• Casos de éxito
• Formulario de contacto

💬 ¿Tienes alguna pregunta? Elige la opción 4 para hablar con un agente.`);
            log('✅ Respuesta enviada exitosamente. ID:', result?.id?._serialized || result?.id);
          } catch (replyError) {
            log('❌ Error al enviar respuesta (opción 3):', replyError?.message || replyError, replyError?.stack);
          }
          break;
        case '4':
          log('💬 Respondiendo: opción 4 (agente)');
          try {
            const result = await msg.reply(`👤 *Hablar con un Agente*

¡Perfecto! Un agente de Unikuo se comunicará contigo en la brevedad.

⏰ Te responderemos pronto por este mismo WhatsApp.

Mientras tanto, puedes revisar nuestras opciones anteriores si tienes alguna otra consulta.`);
            log('✅ Respuesta enviada exitosamente. ID:', result?.id?._serialized || result?.id);
          } catch (replyError) {
            log('❌ Error al enviar respuesta (opción 4):', replyError?.message || replyError, replyError?.stack);
          }
          break;
        default:
          log('💬 Respondiendo: mensaje por defecto (menú inicial)');
          try {
            const result = await msg.reply(`👋 ¡Hola! 👋

Bienvenido a *Unikuo*, servicio de creación de páginas web. Estoy aquí para ayudarte.

¿Qué te gustaría saber?

1️⃣ Consultar precios
2️⃣ Información de nuestros trabajos
3️⃣ Ver nuestra página web
4️⃣ Hablar con un agente personal

Escribe el número de la opción que te interesa.`);
            log('✅ Respuesta enviada exitosamente. ID:', result?.id?._serialized || result?.id);
          } catch (replyError) {
            log('❌ Error al enviar respuesta (default):', replyError?.message || replyError, replyError?.stack);
          }
      }
      log('📨 ========== FIN PROCESAMIENTO MENSAJE ==========');
    } catch (error) {
      log('❌ Error procesando mensaje:', error?.message || error);
      log('❌ Stack:', error?.stack);
      log('📨 ========== ERROR EN MENSAJE ==========');
    }
  };
  
  // Registrar en ambos eventos para mayor compatibilidad
  c.on('message_create', handleMessage);
  c.on('message', handleMessage);
  log('✅ Listeners registrados en "message" y "message_create"');

  return c;
}

// ---- Inicialización con guardia (nunca en paralelo)
async function ensureInit() {
  if (initInProgress) { log('⏳ init en curso, omito reintento'); return; }
  initInProgress = true;
  try {
    log('🚀 Iniciando ensureInit()...');
    if (!client) {
      log('📦 Cliente no existe, creando nuevo...');
      client = buildClient();
    } else {
      log('♻️ Cliente ya existe, reutilizando...');
    }
    log('🔄 Llamando a client.initialize()...');
    await client.initialize();
    log('✅ client.initialize() completado');
  } catch (e) {
    log('❌ Error en initialize():', e?.message || e, e?.stack);
    try { await client?.destroy(); } catch {}
    client = null;
  } finally {
    initInProgress = false;
    log('🏁 ensureInit() finalizado');
  }
}

// Heartbeat (solo informa; nada de reintentos agresivos aquí)
setInterval(async () => {
  const s = await client?.getState?.().catch(() => 'NO_STATE');
  log('🩺 heartbeat state:', s ?? 'null');
}, 10000);

// Arranque
log('🚀 Bot iniciando en Northflank…');
log('📦 Versión con logs extendidos - Build 2026-01-02');
log('📁 SESSION_DIR:', SESSION_DIR);
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
