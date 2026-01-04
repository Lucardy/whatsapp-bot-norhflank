// --- WhatsApp Bot — Multi-instance & Multi-session --------------------------
// Soporta múltiples cuentas de WhatsApp simultáneamente.
// Cada sesión tiene su propia carpeta de autenticación y maneja sus propios mensajes.
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

// ---- Configuración de Sesiones Multi-Cuenta
// Prioridad: 1) Variable de entorno SESSIONS, 2) Archivo sessions-config.json, 3) Default
function loadSessionsConfig() {
  // Opción 1: Variable de entorno
  if (process.env.SESSIONS) {
    return process.env.SESSIONS.split(',').map(s => s.trim()).filter(s => s);
  }
  
  // Opción 2: Archivo de configuración
  try {
    const configPath = path.join(__dirname, 'sessions-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.sessions && Array.isArray(config.sessions) && config.sessions.length > 0) {
        return config.sessions;
      }
    }
  } catch (err) {
    log('⚠️ Error cargando sessions-config.json:', err?.message || err);
  }
  
  // Opción 3: Default
  return ['unikuo'];
}

const SESSIONS_CONFIG = loadSessionsConfig();

// SESSION_BASE_DIR: carpeta base donde se guardan todas las sesiones
const SESSION_BASE_DIR = process.env.SESSION_BASE_DIR || path.join(__dirname, 'sessions');

log('📋 Sesiones configuradas:', SESSIONS_CONFIG);
log('📁 Directorio base de sesiones:', SESSION_BASE_DIR);

// ---- Estado app/bot
const __cooldown = new Map();

// ---- SessionManager: Maneja múltiples sesiones de WhatsApp
class SessionManager {
  constructor() {
    this.sessions = new Map(); // sessionId -> { client, isReady, lastQRDataURL, initInProgress }
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  getAllSessions() {
    return Array.from(this.sessions.entries()).map(([id, data]) => ({
      id,
      isReady: data.isReady,
      hasQR: !!data.lastQRDataURL
    }));
  }

  async createSession(sessionId) {
    if (this.sessions.has(sessionId)) {
      log(`⚠️ Sesión ${sessionId} ya existe`);
      return this.sessions.get(sessionId).client;
    }

    const sessionPath = path.join(SESSION_BASE_DIR, sessionId);
    log(`🔧 Creando sesión: ${sessionId} en ${sessionPath}`);

    const sessionData = {
      client: null,
      isReady: false,
      lastQRDataURL: null,
      initInProgress: false
    };

    this.sessions.set(sessionId, sessionData);

    const client = this.buildClient(sessionId, sessionPath);
    sessionData.client = client;

    // Inicializar en background
    this.ensureInit(sessionId).catch(err => {
      log(`❌ Error inicializando sesión ${sessionId}:`, err?.message || err);
    });

    return client;
  }

  buildClient(sessionId, sessionPath) {
    log(`🔧 Creando cliente WhatsApp para sesión: ${sessionId}`);
    const c = new Client({
      authStrategy: new LocalAuth({ dataPath: sessionPath }),
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/wa-version.json',
      },
      puppeteer: {
        headless: true,
        executablePath: puppeteer.executablePath(),
        protocolTimeout: 120_000,
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

    const sessionData = this.sessions.get(sessionId);

    // Listeners
    c.once('authenticated', async () => {
      const s = await c.getState().catch(() => 'NO_STATE');
      log(`🔐 [${sessionId}] authenticated, state =`, s);
    });

    c.once('ready', async () => {
      sessionData.isReady = true;
      sessionData.lastQRDataURL = null;
      const s = await c.getState().catch(() => 'NO_STATE');
      log(`✅ [${sessionId}] BOT IS READY | state =`, s);
      log(`🎯 [${sessionId}] Listener de mensajes registrado y activo`);
      log(`📬 [${sessionId}] El bot está listo para recibir mensajes`);
      
      const listeners_create = c.listenerCount('message_create');
      const listeners_message = c.listenerCount('message');
      log(`🔍 [${sessionId}] Listeners registrados - message_create: ${listeners_create}, message: ${listeners_message}`);
    });

    c.on('change_state', (s) => {
      sessionData.isReady = (s === 'CONNECTED');
      log(`🔁 [${sessionId}] change_state:`, s);
    });

    c.on('auth_failure', (m) => log(`❌ [${sessionId}] auth_failure:`, m));

    c.on('disconnected', async (reason) => {
      log(`⚠️ [${sessionId}] disconnected, motivo:`, reason);
      if (reason === 'LOGOUT') {
        log(`🔄 [${sessionId}] Necesita re-escaneo de QR (logout desde el celular o conflicto de sesión)`);
      }
      sessionData.isReady = false;
      try { await c.destroy(); } catch {}
      sessionData.client = null;
      setTimeout(() => this.ensureInit(sessionId).catch(() => {}), 3000);
    });

    // QR
    c.on('qr', async (qr) => {
      if (sessionData.isReady) {
        log(`🔇 [${sessionId}] QR ignorado (ya conectado)`);
        return;
      }
      log(`🟩 [${sessionId}] QR solicitado (cliente pidió autenticación)`);
      try { qrcodeTerminal.generate(qr, { small: true }); } catch {}
      try {
        sessionData.lastQRDataURL = await QRCode.toDataURL(qr);
        log(`📷 [${sessionId}] QR generado y cacheado en memoria`);
        try {
          await QRCode.toFile(path.join(__dirname, `qr_${sessionId}.png`), qr);
          log(`💾 [${sessionId}] QR guardado como qr_${sessionId}.png (opcional)`);
        } catch (err) {
          log(`⚠️ [${sessionId}] No se pudo escribir qr_${sessionId}.png:`, err?.message || err);
        }
      } catch (err) {
        log(`❌ [${sessionId}] Error generando QR:`, err);
      }
    });

    // Mensajes
    log(`📝 [${sessionId}] Registrando listener de mensajes...`);
    log(`🔔 [${sessionId}] Listener "message_create" será activado cuando el cliente esté ready`);
    
    const handleMessage = async (msg) => {
      const msgId = msg.id?._serialized || msg.id || 'unknown';
      log(`📨 [${sessionId}] ========== MENSAJE RECIBIDO ==========`);
      log(`📨 [${sessionId}] ID:`, msgId);
      log(`📨 [${sessionId}] From:`, msg.from);
      log(`📨 [${sessionId}] Body:`, (msg.body || '').substring(0, 100));
      log(`📨 [${sessionId}] FromMe:`, msg.fromMe);
      log(`📨 [${sessionId}] IsGroup:`, msg.from?.endsWith('@g.us'));
      
      try {
        if (msg.fromMe) {
          log(`⏭️ [${sessionId}] Ignorado: mensaje propio`);
          return;
        }
        if (msg.from === 'status@broadcast') {
          log(`⏭️ [${sessionId}] Ignorado: status broadcast`);
          return;
        }
        if (msg.from.endsWith('@g.us')) {
          log(`⏭️ [${sessionId}] Ignorado: mensaje de grupo`);
          return;
        }

        try {
          const now = Date.now();
          const last = __cooldown.get(msg.from) || 0;
          if (now - last < 1500) {
            log(`⏭️ [${sessionId}] Ignorado: cooldown activo (último:`, last, 'ahora:', now, 'diff:', now - last);
            return;
          }
          __cooldown.set(msg.from, now);
          log(`✅ [${sessionId}] Cooldown actualizado`);
        } catch (err) {
          log(`⚠️ [${sessionId}] Error en cooldown:`, err?.message || err);
        }

        const texto = (msg.body || '').trim().toLowerCase();
        const telefono = (msg.from || '').split('@')[0] || '';
        
        log(`✅ [${sessionId}] Procesando mensaje - texto:`, texto, 'teléfono:', telefono);

        // Mismo handler de mensajes que antes (mismo para todas las sesiones por ahora)
        switch (texto) {
          case '1':
            log(`💬 [${sessionId}] Respondiendo: opción 1 (precios)`);
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
              log(`✅ [${sessionId}] Respuesta enviada exitosamente. ID:`, result?.id?._serialized || result?.id);
            } catch (replyError) {
              log(`❌ [${sessionId}] Error al enviar respuesta (opción 1):`, replyError?.message || replyError, replyError?.stack);
            }
            break;
          case '2':
            log(`💬 [${sessionId}] Respondiendo: opción 2 (trabajos)`);
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
              log(`✅ [${sessionId}] Respuesta enviada exitosamente. ID:`, result?.id?._serialized || result?.id);
            } catch (replyError) {
              log(`❌ [${sessionId}] Error al enviar respuesta (opción 2):`, replyError?.message || replyError, replyError?.stack);
            }
            break;
          case '3':
            log(`💬 [${sessionId}] Respondiendo: opción 3 (página web)`);
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
              log(`✅ [${sessionId}] Respuesta enviada exitosamente. ID:`, result?.id?._serialized || result?.id);
            } catch (replyError) {
              log(`❌ [${sessionId}] Error al enviar respuesta (opción 3):`, replyError?.message || replyError, replyError?.stack);
            }
            break;
          case '4':
            log(`💬 [${sessionId}] Respondiendo: opción 4 (agente)`);
            try {
              const result = await msg.reply(`👤 *Hablar con un Agente*

¡Perfecto! Un agente de Unikuo se comunicará contigo en la brevedad.

⏰ Te responderemos pronto por este mismo WhatsApp.

Mientras tanto, puedes revisar nuestras opciones anteriores si tienes alguna otra consulta.`);
              log(`✅ [${sessionId}] Respuesta enviada exitosamente. ID:`, result?.id?._serialized || result?.id);
            } catch (replyError) {
              log(`❌ [${sessionId}] Error al enviar respuesta (opción 4):`, replyError?.message || replyError, replyError?.stack);
            }
            break;
          default:
            log(`💬 [${sessionId}] Respondiendo: mensaje por defecto (menú inicial)`);
            try {
              const result = await msg.reply(`👋 ¡Hola! 👋

Bienvenido a *Unikuo*, servicio de creación de páginas web. Estoy aquí para ayudarte.

¿Qué te gustaría saber?

1️⃣ Consultar precios
2️⃣ Información de nuestros trabajos
3️⃣ Ver nuestra página web
4️⃣ Hablar con un agente personal

Escribe el número de la opción que te interesa.`);
              log(`✅ [${sessionId}] Respuesta enviada exitosamente. ID:`, result?.id?._serialized || result?.id);
            } catch (replyError) {
              log(`❌ [${sessionId}] Error al enviar respuesta (default):`, replyError?.message || replyError, replyError?.stack);
            }
        }
        log(`📨 [${sessionId}] ========== FIN PROCESAMIENTO MENSAJE ==========`);
      } catch (error) {
        log(`❌ [${sessionId}] Error procesando mensaje:`, error?.message || error);
        log(`❌ [${sessionId}] Stack:`, error?.stack);
        log(`📨 [${sessionId}] ========== ERROR EN MENSAJE ==========`);
      }
    };

    c.on('message_create', handleMessage);
    c.on('message', handleMessage);
    log(`✅ [${sessionId}] Listeners registrados en "message" y "message_create"`);

    return c;
  }

  async ensureInit(sessionId) {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      log(`⚠️ Sesión ${sessionId} no existe`);
      return;
    }

    if (sessionData.initInProgress) {
      log(`⏳ [${sessionId}] init en curso, omito reintento`);
      return;
    }

    sessionData.initInProgress = true;
    try {
      log(`🚀 [${sessionId}] Iniciando ensureInit()...`);
      if (!sessionData.client) {
        log(`📦 [${sessionId}] Cliente no existe, creando nuevo...`);
        const sessionPath = path.join(SESSION_BASE_DIR, sessionId);
        sessionData.client = this.buildClient(sessionId, sessionPath);
      } else {
        log(`♻️ [${sessionId}] Cliente ya existe, reutilizando...`);
      }
      log(`🔄 [${sessionId}] Llamando a client.initialize()...`);
      await sessionData.client.initialize();
      log(`✅ [${sessionId}] client.initialize() completado`);
    } catch (e) {
      log(`❌ [${sessionId}] Error en initialize():`, e?.message || e, e?.stack);
      try { await sessionData.client?.destroy(); } catch {}
      sessionData.client = null;
    } finally {
      sessionData.initInProgress = false;
      log(`🏁 [${sessionId}] ensureInit() finalizado`);
    }
  }
}

const sessionManager = new SessionManager();

// ---- Inicialización de todas las sesiones
async function initializeAllSessions() {
  log('🚀 Iniciando todas las sesiones...');
  fs.mkdirSync(SESSION_BASE_DIR, { recursive: true });
  
  for (const sessionId of SESSIONS_CONFIG) {
    log(`📦 Creando sesión: ${sessionId}`);
    await sessionManager.createSession(sessionId);
    // Pequeño delay entre inicializaciones para no saturar
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  log(`✅ ${SESSIONS_CONFIG.length} sesión(es) en proceso de inicialización`);
}

// Heartbeat para todas las sesiones
setInterval(async () => {
  for (const sessionId of SESSIONS_CONFIG) {
    const sessionData = sessionManager.getSession(sessionId);
    if (sessionData?.client) {
      const s = await sessionData.client.getState?.().catch(() => 'NO_STATE');
      log(`🩺 [${sessionId}] heartbeat state:`, s ?? 'null');
    }
  }
}, 10000);

// Arranque
log('🚀 Bot Multi-Sesión iniciando...');
log('📦 Versión Multi-Cuenta - Build 2026-01-02');
initializeAllSessions().catch(err => {
  log('❌ Error inicializando sesiones:', err?.message || err);
});

// ---- Manejo de errores no atrapados (evita crash y loop de reinicios)
process.on('unhandledRejection', (err) => log('⚠️ unhandledRejection:', err));
process.on('uncaughtException', (err) => log('⚠️ uncaughtException:', err));


// --------------------- Servidor HTTP ---------------------
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (_req, res) => {
  const sessions = sessionManager.getAllSessions();
  res.json({ 
    message: '🟢 Bot Multi-Sesión de WhatsApp activo',
    sessions: sessions.length,
    activeSessions: sessions.filter(s => s.isReady).length
  });
});

// Listar todas las sesiones
app.get('/sessions', (_req, res) => {
  const sessions = sessionManager.getAllSessions();
  res.json({ sessions });
});

// QR de una sesión específica
app.get('/qr/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const sessionData = sessionManager.getSession(sessionId);
  
  if (!sessionData) {
    return res.status(404).json({ error: `Sesión ${sessionId} no encontrada` });
  }
  
  if (sessionData.isReady) {
    return res.status(204).send(); // no mostrar QR si ya está conectado
  }
  
  if (!sessionData.lastQRDataURL) {
    return res.status(503).send('⚠️ QR aún no generado. Recarga cada 2–3 s.');
  }
  
  const img = Buffer.from(sessionData.lastQRDataURL.split(',')[1], 'base64');
  res.set('Content-Type', 'image/png');
  res.send(img);
});

// QR de la primera sesión (compatibilidad hacia atrás)
app.get('/qr', (req, res) => {
  if (SESSIONS_CONFIG.length === 0) {
    return res.status(503).send('⚠️ No hay sesiones configuradas');
  }
  res.redirect(`/qr/${SESSIONS_CONFIG[0]}`);
});

// Estado de una sesión específica
app.get('/state/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionData = sessionManager.getSession(sessionId);
    
    if (!sessionData) {
      return res.status(404).json({ error: `Sesión ${sessionId} no encontrada` });
    }
    
    const state = await sessionData.client?.getState?.().catch(() => 'NO_STATE');
    res.json({ 
      sessionId,
      state: state ?? null,
      isReady: sessionData.isReady,
      hasQR: !!sessionData.lastQRDataURL
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Estado de todas las sesiones
app.get('/state', async (req, res) => {
  try {
    const states = {};
    for (const sessionId of SESSIONS_CONFIG) {
      const sessionData = sessionManager.getSession(sessionId);
      if (sessionData?.client) {
        const state = await sessionData.client.getState?.().catch(() => 'NO_STATE');
        states[sessionId] = {
          state: state ?? null,
          isReady: sessionData.isReady,
          hasQR: !!sessionData.lastQRDataURL
        };
      }
    }
    res.json({ states });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Health check
app.get('/health', (_req, res) => {
  const sessions = sessionManager.getAllSessions();
  const activeSessions = sessions.filter(s => s.isReady).length;
  res.json({ 
    ok: true, 
    totalSessions: sessions.length,
    activeSessions,
    sessions: sessions
  });
});

// Reiniciar una sesión específica
app.post('/restart/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionData = sessionManager.getSession(sessionId);
    
    if (!sessionData) {
      return res.status(404).json({ error: `Sesión ${sessionId} no encontrada` });
    }
    
    log(`♻️ [${sessionId}] Reiniciando sesión…`);
    sessionData.isReady = false;
    sessionData.initInProgress = false;
    sessionData.lastQRDataURL = null;
    try { await sessionData.client?.destroy(); } catch {}
    sessionData.client = null;
    await sessionManager.ensureInit(sessionId);
    res.json({ ok: true, sessionId });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Reiniciar todas las sesiones (compatibilidad hacia atrás)
app.post('/restart', async (req, res) => {
  try {
    log('♻️ Reiniciando todas las sesiones…');
    for (const sessionId of SESSIONS_CONFIG) {
      const sessionData = sessionManager.getSession(sessionId);
      if (sessionData) {
        sessionData.isReady = false;
        sessionData.initInProgress = false;
        sessionData.lastQRDataURL = null;
        try { await sessionData.client?.destroy(); } catch {}
        sessionData.client = null;
        await sessionManager.ensureInit(sessionId);
      }
    }
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
