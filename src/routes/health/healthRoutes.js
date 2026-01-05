// Rutas relacionadas con health check y estado general
/**
 * Configura las rutas de health check
 * @param {Express} app - Instancia de Express
 * @param {SessionManager} sessionManager - Gestor de sesiones
 */
export function setupHealthRoutes(app, sessionManager) {
  // Home
  app.get('/', (_req, res) => {
    const sessions = sessionManager.getAllSessions();
    res.json({ 
      message: '🟢 Bot Multi-Sesión de WhatsApp activo',
      sessions: sessions.length,
      activeSessions: sessions.filter(s => s.isReady).length
    });
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
}

