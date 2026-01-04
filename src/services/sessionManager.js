// Gestor de sesiones de WhatsApp
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import { log, logSession } from '../utils/logger.js';
import { handleMessage } from './messageHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class SessionManager {
  constructor(sessionBaseDir) {
    this.sessions = new Map(); // sessionId -> { client, isReady, lastQRDataURL, initInProgress }
    this.sessionBaseDir = sessionBaseDir;
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

    const sessionPath = path.join(this.sessionBaseDir, sessionId);
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
    logSession(sessionId, '🔧 Creando cliente WhatsApp');
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

    // Listeners de eventos
    c.once('authenticated', async () => {
      const s = await c.getState().catch(() => 'NO_STATE');
      logSession(sessionId, '🔐 authenticated, state =', s);
    });

    c.once('ready', async () => {
      sessionData.isReady = true;
      sessionData.lastQRDataURL = null;
      const s = await c.getState().catch(() => 'NO_STATE');
      logSession(sessionId, '✅ BOT IS READY | state =', s);
      logSession(sessionId, '🎯 Listener de mensajes registrado y activo');
      logSession(sessionId, '📬 El bot está listo para recibir mensajes');
      
      const listeners_create = c.listenerCount('message_create');
      const listeners_message = c.listenerCount('message');
      logSession(sessionId, `🔍 Listeners registrados - message_create: ${listeners_create}, message: ${listeners_message}`);
    });

    c.on('change_state', (s) => {
      sessionData.isReady = (s === 'CONNECTED');
      logSession(sessionId, '🔁 change_state:', s);
    });

    c.on('auth_failure', (m) => logSession(sessionId, '❌ auth_failure:', m));

    c.on('disconnected', async (reason) => {
      logSession(sessionId, '⚠️ disconnected, motivo:', reason);
      if (reason === 'LOGOUT') {
        logSession(sessionId, '🔄 Necesita re-escaneo de QR (logout desde el celular o conflicto de sesión)');
      }
      sessionData.isReady = false;
      try { await c.destroy(); } catch {}
      sessionData.client = null;
      setTimeout(() => this.ensureInit(sessionId).catch(() => {}), 3000);
    });

    // QR
    c.on('qr', async (qr) => {
      if (sessionData.isReady) {
        logSession(sessionId, '🔇 QR ignorado (ya conectado)');
        return;
      }
      logSession(sessionId, '🟩 QR solicitado (cliente pidió autenticación)');
      try { qrcodeTerminal.generate(qr, { small: true }); } catch {}
      try {
        sessionData.lastQRDataURL = await QRCode.toDataURL(qr);
        logSession(sessionId, '📷 QR generado y cacheado en memoria');
        try {
          const projectRoot = path.resolve(__dirname, '../..');
          await QRCode.toFile(path.join(projectRoot, `qr_${sessionId}.png`), qr);
          logSession(sessionId, `💾 QR guardado como qr_${sessionId}.png (opcional)`);
        } catch (err) {
          logSession(sessionId, `⚠️ No se pudo escribir qr_${sessionId}.png:`, err?.message || err);
        }
      } catch (err) {
        logSession(sessionId, '❌ Error generando QR:', err);
      }
    });

    // Mensajes - usar el messageHandler
    logSession(sessionId, '📝 Registrando listener de mensajes...');
    logSession(sessionId, '🔔 Listener "message_create" será activado cuando el cliente esté ready');
    
    c.on('message_create', (msg) => handleMessage(msg, sessionId));
    c.on('message', (msg) => handleMessage(msg, sessionId));
    logSession(sessionId, '✅ Listeners registrados en "message" y "message_create"');

    return c;
  }

  async ensureInit(sessionId) {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      logSession(sessionId, '⚠️ Sesión no existe');
      return;
    }

    if (sessionData.initInProgress) {
      logSession(sessionId, '⏳ init en curso, omito reintento');
      return;
    }

    sessionData.initInProgress = true;
    try {
      logSession(sessionId, '🚀 Iniciando ensureInit()...');
      if (!sessionData.client) {
        logSession(sessionId, '📦 Cliente no existe, creando nuevo...');
        const sessionPath = path.join(this.sessionBaseDir, sessionId);
        sessionData.client = this.buildClient(sessionId, sessionPath);
      } else {
        logSession(sessionId, '♻️ Cliente ya existe, reutilizando...');
      }
      logSession(sessionId, '🔄 Llamando a client.initialize()...');
      await sessionData.client.initialize();
      logSession(sessionId, '✅ client.initialize() completado');
    } catch (e) {
      logSession(sessionId, '❌ Error en initialize():', e?.message || e, e?.stack);
      try { await sessionData.client?.destroy(); } catch {}
      sessionData.client = null;
    } finally {
      sessionData.initInProgress = false;
      logSession(sessionId, '🏁 ensureInit() finalizado');
    }
  }
}

