// Rutas HTTP del servidor
import express from 'express';
import { log } from '../utils/logger.js';

export function setupRoutes(app, sessionManager, sessionsConfig) {
  // Home
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
    if (sessionsConfig.length === 0) {
      return res.status(503).send('⚠️ No hay sesiones configuradas');
    }
    res.redirect(`/qr/${sessionsConfig[0]}`);
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
}

