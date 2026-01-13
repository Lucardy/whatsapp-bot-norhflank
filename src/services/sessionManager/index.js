// Gestor de sesiones de WhatsApp
import path from 'path';
import { fileURLToPath } from 'url';
import { log, logSession } from '../../utils/logger/index.js';

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
    const { canCreateSession, createSessionData } = await import('./sessionLifecycle.js');
    
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
    const { createWhatsAppClient } = await import('./clientBuilder.js');
    const { setupEventListeners } = await import('./eventListeners.js');
    
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
      
      // Agregar timeout más largo para conexiones lentas (5 minutos)
      // El QR puede tardar en generarse si hay problemas de red
      // NO usar Promise.race porque puede cancelar initialize() prematuramente
      // En su lugar, dejar que initialize() corra y manejar errores después
      try {
        logSession(sessionId, '⏳ Iniciando initialize() (puede tardar varios minutos si hay problemas de red)...');
        
        // Verificar que el cliente esté activo antes de initialize
        if (!sessionData.client) {
          logSession(sessionId, '❌ Cliente no existe, no se puede inicializar');
          return;
        }
        
        // Ejecutar initialize() sin await para no bloquear, pero capturar errores
        const initPromise = sessionData.client.initialize();
        
        // Esperar un poco y verificar si hay progreso
        setTimeout(async () => {
          try {
            const state = await sessionData.client.getState().catch(() => null);
            logSession(sessionId, `📊 Estado después de 10 segundos: ${state || 'null'}`);
            if (sessionData.lastQRDataURL) {
              logSession(sessionId, `✅ QR generado después de 10 segundos`);
            }
          } catch (err) {
            // Ignorar errores de verificación
          }
        }, 10000);
        
        await initPromise;
        logSession(sessionId, '✅ client.initialize() completado');
      } catch (initError) {
        const errorMsg = initError?.message || initError?.toString() || String(initError);
        logSession(sessionId, `⚠️ Error en initialize(): ${errorMsg}`);
        logSession(sessionId, `   Tipo de error: ${initError?.name || 'Unknown'}`);
        
        // Verificar si el cliente sigue activo después del error
        try {
          const stateAfterError = await sessionData.client.getState().catch(() => null);
          logSession(sessionId, `📊 Estado del cliente después del error: ${stateAfterError || 'null'}`);
          logSession(sessionId, `📡 Cliente sigue activo: ${sessionData.client ? 'Sí' : 'No'}`);
        } catch (stateErr) {
          logSession(sessionId, `⚠️ No se pudo verificar estado después del error: ${stateErr?.message || stateErr}`);
        }
        
        // Si es un error de conexión, el cliente puede seguir activo y generar QR
        // NO destruir el cliente - puede seguir intentando en segundo plano
        if (errorMsg.includes('ERR_CONNECTION') || errorMsg.includes('TIMED_OUT') || errorMsg.includes('timeout') || errorMsg.includes('Navigation')) {
          logSession(sessionId, `💡 Error de conexión detectado, pero el cliente seguirá activo`);
          logSession(sessionId, `   El QR puede generarse cuando se establezca la conexión`);
          logSession(sessionId, `   Esperando evento 'qr'... (puede tardar unos minutos)`);
          // NO destruir el cliente - dejar que siga intentando
        } else {
          logSession(sessionId, `⚠️ Error no relacionado con conexión, pero continuando...`);
        }
      }
      
      // Verificar si el cliente ya está listo (puede pasar si se reutiliza un cliente existente)
      // Si ya está listo, ejecutar la lógica del 'ready' manualmente
      try {
        logSession(sessionId, '🔍 Verificando estado del cliente después de initialize()...');
        const state = await sessionData.client.getState();
        logSession(sessionId, `📊 Estado del cliente: ${state}`);
        if (state === 'CONNECTED' && !sessionData.isReady) {
          logSession(sessionId, '🔄 Cliente ya está conectado, ejecutando lógica de ready manualmente...');
          const { markSessionAsReady } = await import('./stateManager.js');
          await markSessionAsReady(sessionData.client, sessionData, sessionId, null, {
            clearQR: true,
            context: 'manual_verification'
          });
          logSession(sessionId, `✅ BOT IS READY (verificado manualmente) | state = ${state}`);
        } else if (state === 'CONNECTED' && sessionData.isReady) {
          logSession(sessionId, '✅ Cliente ya estaba listo y marcado como ready');
        } else {
          logSession(sessionId, `⏳ Cliente en estado: ${state || 'null'}, esperando eventos...`);
          if (state === null || state === 'UNPAIRED' || state === 'UNKNOWN') {
            logSession(sessionId, `💡 El cliente necesita escanear QR. Visita: http://localhost:3000/qr/${sessionId}`);
          }
        }
      } catch (stateError) {
        logSession(sessionId, `⚠️ Error verificando estado del cliente: ${stateError?.message || stateError}`);
        logSession(sessionId, `   Stack: ${stateError?.stack || 'N/A'}`);
      }
    } catch (e) {
      const errorMsg = e?.message || e?.toString() || String(e);
      logSession(sessionId, '❌ Error en ensureInit():', errorMsg);
      logSession(sessionId, `   Stack: ${e?.stack || 'N/A'}`);
      
      // NO destruir el cliente si es un error de conexión
      // El cliente puede seguir intentando y generar el QR
      if (errorMsg.includes('ERR_CONNECTION') || errorMsg.includes('TIMED_OUT') || errorMsg.includes('timeout')) {
        logSession(sessionId, `💡 Error de conexión detectado, pero el cliente seguirá activo`);
        logSession(sessionId, `   El QR puede generarse cuando la conexión se establezca`);
        // NO destruir el cliente, dejar que siga intentando
      } else {
        // Para otros errores, destruir el cliente
        logSession(sessionId, `🗑️ Destruyendo cliente debido a error no relacionado con conexión`);
        try { await sessionData.client?.destroy(); } catch {}
        sessionData.client = null;
      }
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
    const { cleanupSession } = await import('./sessionLifecycle.js');
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
      const { cleanupSessionResources } = await import('../../utils/resourceCleanup.js');
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
    const { cleanupSession } = await import('./sessionLifecycle.js');
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
