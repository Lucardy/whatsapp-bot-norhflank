// Entry point principal del bot
import fs from 'fs';
import express from 'express';
import { log } from './utils/logger.js';
import { config } from './config/index.js';
import { SessionManager } from './services/sessionManager.js';
import { setupRoutes } from './routes/index.js';

// Inicializar SessionManager
const sessionManager = new SessionManager(config.sessionBaseDir);

// Manejo de errores no atrapados
process.on('unhandledRejection', (err) => log('⚠️ unhandledRejection:', err));
process.on('uncaughtException', (err) => log('⚠️ uncaughtException:', err));

// Inicialización de todas las sesiones
async function initializeAllSessions() {
  log('🚀 Iniciando todas las sesiones...');
  fs.mkdirSync(config.sessionBaseDir, { recursive: true });
  
  for (const sessionId of config.sessions) {
    log(`📦 Creando sesión: ${sessionId}`);
    await sessionManager.createSession(sessionId);
    // Pequeño delay entre inicializaciones para no saturar
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  log(`✅ ${config.sessions.length} sesión(es) en proceso de inicialización`);
}

// Heartbeat para todas las sesiones
setInterval(async () => {
  for (const sessionId of config.sessions) {
    const sessionData = sessionManager.getSession(sessionId);
    if (sessionData?.client) {
      const s = await sessionData.client.getState?.().catch(() => 'NO_STATE');
      log(`🩺 [${sessionId}] heartbeat state:`, s ?? 'null');
    }
  }
}, 10000);

// Servidor HTTP
const app = express();
setupRoutes(app, sessionManager, config.sessions);

const server = app.listen(config.port, () => {
  log(`🌐 Servidor web escuchando en http://localhost:${config.port}`);
});

// Apagado limpio del HTTP server
process.on('SIGTERM', () => {
  try { server.close(() => log('🛑 HTTP server cerrado')); } catch {}
});

// Arranque
log('🚀 Bot Multi-Sesión iniciando...');
log('📦 Versión Multi-Cuenta - Build 2026-01-02');
log('📋 Sesiones configuradas:', config.sessions);
log('📁 Directorio base de sesiones:', config.sessionBaseDir);

initializeAllSessions().catch(err => {
  log('❌ Error inicializando sesiones:', err?.message || err);
});

