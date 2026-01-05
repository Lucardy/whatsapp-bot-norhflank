// Rutas relacionadas con sesiones
import { log } from '../../utils/logger/index.js';

/**
 * Configura las rutas de sesiones
 * @param {Express} app - Instancia de Express
 * @param {SessionManager} sessionManager - Gestor de sesiones
 * @param {string[]} sessionsConfig - Lista de sesiones configuradas
 */
export function setupSessionRoutes(app, sessionManager, sessionsConfig) {
  // Listar todas las sesiones (configuradas y activas)
  app.get('/sessions', (_req, res) => {
    const activeSessions = sessionManager.getAllSessions();
    // Incluir también las sesiones configuradas que aún no están activas
    const allSessions = sessionsConfig.map(sessionId => {
      const active = activeSessions.find(s => s.id === sessionId);
      return active || { id: sessionId, isReady: false, hasQR: false, status: 'not_started' };
    });
    res.json({ 
      sessions: allSessions,
      configured: sessionsConfig,
      active: activeSessions.map(s => s.id)
    });
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
      for (const sessionId of sessionsConfig) {
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
      for (const sessionId of sessionsConfig) {
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

  // ============================================
  // GESTIÓN DINÁMICA DE SESIONES (mientras el bot está corriendo)
  // ============================================

  // Agregar nueva sesión dinámicamente
  app.post('/sessions/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    
    try {
      // Verificar si ya existe
      const existing = sessionManager.getSession(sessionId);
      if (existing) {
        return res.status(400).json({ 
          ok: false, 
          error: `Sesión "${sessionId}" ya existe y está activa` 
        });
      }

      log(`➕ Creando nueva sesión dinámicamente: ${sessionId}`);
      
      // Crear sesión (auto-inicializar cuando se crea vía API)
      await sessionManager.createSession(sessionId, true);
      
      // Actualizar configuración (DB o archivo)
      const { loadSessionsConfig, saveSessionsConfig } = await import('../../config/index.js');
      const currentSessions = await loadSessionsConfig();
      if (!currentSessions.includes(sessionId)) {
        const updatedSessions = [...currentSessions, sessionId];
        await saveSessionsConfig(updatedSessions);
        log(`✅ Sesión "${sessionId}" agregada a la configuración`);
      }

      res.json({ 
        ok: true, 
        sessionId,
        message: `Sesión "${sessionId}" creada. El QR estará disponible en /qr/${sessionId}`,
        qrUrl: `http://localhost:${process.env.PORT || 3000}/qr/${sessionId}`
      });
    } catch (e) {
      log(`❌ Error creando sesión ${sessionId}:`, e);
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  // Eliminar sesión dinámicamente
  app.delete('/sessions/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const { deleteAuth = false } = req.query; // ?deleteAuth=true para eliminar también la autenticación
    
    try {
      log(`🗑️ Eliminando sesión dinámicamente: ${sessionId}`);
      
      // Destruir sesión
      await sessionManager.destroySession(sessionId, deleteAuth === 'true');
      
      // Actualizar configuración (DB o archivo)
      const { loadSessionsConfig, saveSessionsConfig } = await import('../../config/index.js');
      const currentSessions = await loadSessionsConfig();
      const updatedSessions = currentSessions.filter(s => s !== sessionId);
      await saveSessionsConfig(updatedSessions);
      log(`✅ Sesión "${sessionId}" eliminada de la configuración`);

      res.json({ 
        ok: true, 
        sessionId,
        message: `Sesión "${sessionId}" eliminada exitosamente`
      });
    } catch (e) {
      log(`❌ Error eliminando sesión ${sessionId}:`, e);
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  // Resetear sesión (eliminar autenticación y forzar nuevo QR)
  app.post('/sessions/:sessionId/reset', async (req, res) => {
    const { sessionId } = req.params;
    
    try {
      log(`🔄 Reseteando sesión dinámicamente: ${sessionId}`);
      
      await sessionManager.resetSession(sessionId);
      
      res.json({ 
        ok: true, 
        sessionId,
        message: `Sesión "${sessionId}" reseteada. Se generará un nuevo QR.`,
        qrUrl: `http://localhost:${process.env.PORT || 3000}/qr/${sessionId}`
      });
    } catch (e) {
      log(`❌ Error reseteando sesión ${sessionId}:`, e);
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  // Reconectar sesión (reiniciar sin eliminar autenticación)
  app.post('/sessions/:sessionId/reconnect', async (req, res) => {
    const { sessionId } = req.params;
    
    try {
      log(`🔄 Reconectando sesión: ${sessionId}`);
      
      const sessionData = sessionManager.getSession(sessionId);
      if (!sessionData) {
        return res.status(404).json({ 
          ok: false, 
          error: `Sesión "${sessionId}" no encontrada` 
        });
      }

      // Destruir y recrear sin eliminar autenticación (auto-inicializar al reconectar)
      await sessionManager.destroySession(sessionId, false);
      await sessionManager.createSession(sessionId, true);
      
      res.json({ 
        ok: true, 
        sessionId,
        message: `Sesión "${sessionId}" reconectada`
      });
    } catch (e) {
      log(`❌ Error reconectando sesión ${sessionId}:`, e);
      res.status(500).json({ ok: false, error: String(e) });
    }
  });
}

