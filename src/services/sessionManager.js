// Gestor de sesiones de WhatsApp
import path from 'path';
import { fileURLToPath } from 'url';
import { log, logSession } from '../utils/logger/index.js';

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

  async createSession(sessionId, autoInit = false) {
    const { canCreateSession, createSessionData } = await import('./sessionManager/sessionLifecycle.js');
    
    if (!canCreateSession(sessionId, this.sessions)) {
      return this.sessions.get(sessionId).client;
    }

    const sessionPath = path.join(this.sessionBaseDir, sessionId);
    log(`🔧 Creando sesión: ${sessionId} en ${sessionPath}`);

    const sessionData = createSessionData(sessionId, sessionPath);
    this.sessions.set(sessionId, sessionData);

    const client = await this.buildClient(sessionId, sessionPath);
    sessionData.client = client;

    // Solo inicializar automáticamente si se solicita
    if (autoInit) {
      this.ensureInit(sessionId).catch(err => {
        log(`❌ Error inicializando sesión ${sessionId}:`, err?.message || err);
      });
    }

    return client;
  }

  /**
   * Inicia una sesión (genera QR si es necesario)
   * @param {string} sessionId - ID de la sesión a iniciar
   */
  async startSession(sessionId) {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      log(`⚠️ Sesión ${sessionId} no existe. Creándola primero...`);
      await this.createSession(sessionId, false);
    }

    // Si ya está inicializada, no hacer nada
    if (sessionData?.isReady) {
      log(`✅ Sesión ${sessionId} ya está conectada`);
      return;
    }

    // Inicializar si no está en progreso
    if (!sessionData?.initInProgress) {
      log(`🚀 Iniciando sesión: ${sessionId}`);
      await this.ensureInit(sessionId).catch(err => {
        log(`❌ Error inicializando sesión ${sessionId}:`, err?.message || err);
      });
    } else {
      log(`⏳ Sesión ${sessionId} ya está en proceso de inicialización`);
    }
  }

  async buildClient(sessionId, sessionPath) {
    const { createWhatsAppClient } = await import('./sessionManager/clientBuilder.js');
    const { setupEventListeners } = await import('./sessionManager/eventListeners.js');
    
    // Crear el cliente
    const client = createWhatsAppClient(sessionId, sessionPath);
    
    // Obtener datos de sesión
    const sessionData = this.sessions.get(sessionId);
    
    // Configurar todos los event listeners
    await setupEventListeners(
      client,
      sessionId,
      sessionPath,
      sessionData,
      () => this.ensureInit(sessionId)
    );

    return client;
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
        sessionData.client = await this.buildClient(sessionId, sessionPath);
      } else {
        logSession(sessionId, '♻️ Cliente ya existe, reutilizando...');
      }
      logSession(sessionId, '🔄 Llamando a client.initialize()...');
      await sessionData.client.initialize();
      logSession(sessionId, '✅ client.initialize() completado');
      
      // Verificar si el cliente ya está listo (puede pasar si se reutiliza un cliente existente)
      // Si ya está listo, ejecutar la lógica del 'ready' manualmente
      try {
        const state = await sessionData.client.getState();
        if (state === 'CONNECTED' && !sessionData.isReady) {
          logSession(sessionId, '🔄 Cliente ya está conectado, ejecutando lógica de ready manualmente...');
          const { markSessionReady } = await import('./sessionManager/stateManager.js');
          const { setSessionReadyTime } = await import('./messageHandler/index.js');
          const { captureAndSavePhoneNumber } = await import('./sessionManager/phoneCapture.js');
          
          const readyTime = Date.now();
          markSessionReady(sessionData, sessionId, readyTime);
          setSessionReadyTime(sessionId, readyTime);
          await captureAndSavePhoneNumber(sessionData.client, sessionId, sessionData);
          
          sessionData.isReady = true;
          sessionData.lastQRDataURL = null;
          
          logSession(sessionId, '✅ BOT IS READY (verificado manualmente) | state =', state);
          logSession(sessionId, '🎯 Listener de mensajes registrado y activo');
          logSession(sessionId, '📬 El bot está listo para recibir mensajes');
        } else if (state === 'CONNECTED' && sessionData.isReady) {
          logSession(sessionId, '✅ Cliente ya estaba listo y marcado como ready');
        } else {
          logSession(sessionId, `⏳ Cliente en estado: ${state}, esperando eventos...`);
        }
      } catch (stateError) {
        logSession(sessionId, `⚠️ Error verificando estado del cliente: ${stateError?.message || stateError}`);
      }
    } catch (e) {
      logSession(sessionId, '❌ Error en initialize():', e?.message || e, e?.stack);
      try { await sessionData.client?.destroy(); } catch {}
      sessionData.client = null;
    } finally {
      sessionData.initInProgress = false;
      logSession(sessionId, '🏁 ensureInit() finalizado');
    }
  }

  /**
   * Elimina una sesión completamente (destruye el cliente y elimina del Map)
   * @param {string} sessionId - ID de la sesión a eliminar
   * @param {boolean} deleteAuth - Si true, elimina también la carpeta de autenticación
   */
  async destroySession(sessionId, deleteAuth = false) {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      log(`⚠️ Sesión ${sessionId} no existe para eliminar`);
      return false;
    }

    log(`🗑️ Eliminando sesión: ${sessionId}`);

    // Destruir cliente
    if (sessionData.client) {
      try {
        await sessionData.client.destroy();
        log(`✅ Cliente de sesión ${sessionId} destruido`);
      } catch (err) {
        log(`⚠️ Error destruyendo cliente de sesión ${sessionId}:`, err?.message || err);
      }
    }

    // Eliminar del Map
    this.sessions.delete(sessionId);
    log(`✅ Sesión ${sessionId} eliminada del manager`);

    // Eliminar autenticación usando sessionLifecycle
    const sessionPath = path.join(this.sessionBaseDir, sessionId);
    const { cleanupSession } = await import('./sessionManager/sessionLifecycle.js');
    await cleanupSession(sessionPath, deleteAuth);

    return true;
  }

  /**
   * Resetea una sesión (elimina autenticación y fuerza nuevo QR)
   * @param {string} sessionId - ID de la sesión a resetear
   * @param {boolean} deleteAll - Si true, elimina la carpeta completa (recomendado para cambio de WhatsApp)
   */
  async resetSession(sessionId, deleteAll = false) {
    log(`🔄 Reseteando sesión: ${sessionId}${deleteAll ? ' (eliminando todo)' : ''}`);

    // Obtener datos de sesión antes de destruir
    const currentSessionData = this.sessions.get(sessionId);

    // Limpiar recursos de la sesión (timeouts, intervals, listeners)
    try {
      const { cleanupSessionResources } = await import('../utils/resourceCleanup.js');
      cleanupSessionResources(sessionId);
    } catch (err) {
      log(`⚠️ Error limpiando recursos: ${err?.message || err}`);
    }

    // Destruir sesión actual completamente
    if (currentSessionData?.client) {
      try {
        // Remover todos los event listeners antes de destruir
        if (currentSessionData.client.removeAllListeners) {
          currentSessionData.client.removeAllListeners();
        }
        
        // Forzar logout/desconexión antes de destruir
        await currentSessionData.client.logout().catch(() => {});
        await currentSessionData.client.destroy();
        log(`✅ Cliente desconectado y destruido`);
      } catch (err) {
        log(`⚠️ Error destruyendo cliente:`, err?.message || err);
      }
    }

    // Eliminar del Map
    this.sessions.delete(sessionId);

    // Eliminar autenticación usando sessionLifecycle
    const sessionPath = path.join(this.sessionBaseDir, sessionId);
    const { cleanupSession } = await import('./sessionManager/sessionLifecycle.js');
    await cleanupSession(sessionPath, deleteAll);

    // Esperar un poco para asegurar que todo se limpió
    await new Promise(resolve => setTimeout(resolve, deleteAll ? 2000 : 1000));

    // Recrear sesión con flag forceQR activado (auto-inicializar después de reset)
    await this.createSession(sessionId, true);
    const newSessionData = this.sessions.get(sessionId);
    if (newSessionData) {
      newSessionData.forceQR = true; // Forzar mostrar QR incluso si se conecta rápido
      newSessionData.isReady = false; // Asegurar que no esté marcada como ready
    }
    log(`✅ Sesión ${sessionId} reseteada y recreada (forzando QR)`);
  }
}

