// Entry point principal del bot
// Cargar variables de entorno desde .env y .env.local (si existe)
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');

// Cargar .env primero (valores por defecto)
dotenv.config({ path: join(PROJECT_ROOT, '.env') });

// Si existe .env.local, cargarlo después (sobrescribe .env)
// Esto permite usar la base de datos del VPS cuando se ejecuta localmente
const localEnvPath = join(PROJECT_ROOT, '.env.local');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath, override: true });
  console.log('📝 Usando configuración de .env.local (sobrescribe .env)');
}
import express from 'express';
import { log } from './utils/logger/index.js';
import { config, loadSessionsConfig } from './config/index.js';
import { SessionManager } from './services/sessionManager/index.js';
import { setupRoutes } from './routes/index.js';
import { setBotStartTime } from './services/messageHandler/index.js';
import { testConnection } from './config/database.js';
import { showInitialMenu } from './utils/menu/index.js';

// Inicializar SessionManager
const sessionManager = new SessionManager(config.sessionBaseDir);

// Establecer el sessionManager globalmente para que otros módulos puedan accederlo
import { setGlobalSessionManager } from './services/sessionManager/global.js';
setGlobalSessionManager(sessionManager);

// Cargar sesiones de forma asíncrona
let SESSIONS_CONFIG = [];

// Manejo de errores no atrapados
process.on('unhandledRejection', (err) => {
  // No loggear errores de puerto en uso como uncaughtException
  if (err?.code !== 'EADDRINUSE') {
    log('⚠️ unhandledRejection:', err);
  }
});
process.on('uncaughtException', (err) => {
  // No loggear errores de puerto en uso como uncaughtException crítico
  if (err?.code === 'EADDRINUSE') {
    // Este error ya se maneja en el try-catch, solo loggear como info
    return;
  }
  log('⚠️ uncaughtException:', err);
  process.exit(1);
});

// Inicialización de todas las sesiones
async function initializeAllSessions() {
  log('🚀 Iniciando todas las sesiones...');
  fs.mkdirSync(config.sessionBaseDir, { recursive: true });
  
  // Cargar sesiones desde DB o archivo
  SESSIONS_CONFIG = await loadSessionsConfig();
  log('📋 Sesiones a inicializar:', SESSIONS_CONFIG);
  
        for (const sessionId of SESSIONS_CONFIG) {
          log(`📦 Creando e iniciando sesión: ${sessionId}`);
          await sessionManager.createSession(sessionId, true); // true = auto-inicializar al arrancar el bot
          // Pequeño delay entre inicializaciones para no saturar
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
  
  log(`✅ ${SESSIONS_CONFIG.length} sesión(es) en proceso de inicialización`);
}

// Heartbeat para todas las sesiones
const heartbeatInterval = setInterval(async () => {
  for (const sessionId of SESSIONS_CONFIG) {
    const sessionData = sessionManager.getSession(sessionId);
    if (sessionData?.client) {
      try {
        const s = await sessionData.client.getState?.().catch(() => 'NO_STATE');
        log(`🩺 [${sessionId}] heartbeat state:`, s ?? 'null');
      } catch (err) {
        // Ignorar errores de heartbeat (sesión puede estar desconectada)
      }
    }
  }
}, 10000);

// Registrar interval para limpieza
try {
  const { registerInterval } = await import('./utils/resourceCleanup.js');
  registerInterval('global', heartbeatInterval);
} catch (err) {
  // Continuar si no está disponible
}

// Limpiar recursos al cerrar
process.on('SIGTERM', async () => {
  clearInterval(heartbeatInterval);
  try {
    const { stopSubscriptionScheduler } = await import('./services/subscription/subscriptionScheduler.js');
    stopSubscriptionScheduler();
  } catch (err) {
    // Continuar si no está disponible
  }
  try {
    const { cleanupAllResources } = await import('./utils/resourceCleanup.js');
    cleanupAllResources();
  } catch (err) {
    // Continuar si no está disponible
  }
});

process.on('SIGINT', async () => {
  clearInterval(heartbeatInterval);
  try {
    const { stopSubscriptionScheduler } = await import('./services/subscription/subscriptionScheduler.js');
    stopSubscriptionScheduler();
  } catch (err) {
    // Continuar si no está disponible
  }
  try {
    const { cleanupAllResources } = await import('./utils/resourceCleanup.js');
    cleanupAllResources();
  } catch (err) {
    // Continuar si no está disponible
  }
});

// Servidor HTTP
const app = express();
app.use(express.json()); // Middleware para parsear JSON en requests
let server = null;

// Arranque
async function start() {
  // Iniciar servidor HTTP PRIMERO (para que esté disponible incluso durante la gestión)
  // Esto permite ver los QRs sin necesidad de iniciar el bot completo
  const initialSessions = await loadSessionsConfig();
  setupRoutes(app, sessionManager, initialSessions);
  
  try {
    server = app.listen(config.port, '0.0.0.0', () => {
      log(`🌐 Servidor web escuchando en http://0.0.0.0:${config.port}`);
      log(`💡 Puedes ver los QRs en: http://localhost:${config.port}/qr/[nombre-sesion]`);
      log(`💡 Acceso externo: http://[TU_IP]:${config.port}/qr/[nombre-sesion]`);
    });
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      log(`⚠️ Puerto ${config.port} ya está en uso.`);
      log(`💡 Hay otra instancia del bot corriendo.`);
      log(`💡 Para cerrarla, ejecuta: Get-Process -Name node | Where-Object {$_.Path -like "*whatsapp*"} | Stop-Process`);
      log(`💡 O cambia el puerto en .env: PORT=3001`);
      // No lanzar error, continuar sin servidor HTTP
    } else {
      throw err;
    }
  }

  // Mostrar menú inicial si no hay argumento --skip-menu
  if (!process.argv.includes('--skip-menu')) {
    let menuResult;
    do {
      menuResult = await showInitialMenu(sessionManager, false);
      
      if (menuResult.shouldStop) {
        log('🛑 Deteniendo bot...');
        process.exit(0);
      }
      
      if (!menuResult.shouldStart) {
        // Si solo gestionó sesiones, mantener el servidor corriendo y volver al menú
        log('💡 El servidor HTTP sigue corriendo. Puedes ver los QRs cuando inicies el bot.');
        // Volver al menú (el loop continuará)
        continue;
      }
      
      // Si quiere iniciar, salir del loop
      break;
    } while (true);
  }

  log('🚀 Bot Multi-Sesión iniciando...');
  log('📦 Versión Multi-Cuenta - Build 2026-01-02');
  log('📁 Directorio base de sesiones:', config.sessionBaseDir);

  // Intentar conectar a base de datos (opcional)
  if (config.useDatabase) {
    const dbConnected = await testConnection();
    if (dbConnected) {
      log('✅ Base de datos conectada - usando configuración desde DB');
    } else {
      log('⚠️ Base de datos no disponible - usando configuración de archivo');
    }
  } else {
    log('ℹ️ Base de datos no configurada - usando configuración de archivo');
  }

  // Cargar sesiones y actualizar rutas con las sesiones reales
  SESSIONS_CONFIG = await loadSessionsConfig();
  log('📋 Sesiones configuradas:', SESSIONS_CONFIG);
  
  // Actualizar rutas HTTP con las sesiones cargadas (por si cambió algo en el menú)
  setupRoutes(app, sessionManager, SESSIONS_CONFIG);

  // Apagado limpio del HTTP server
  process.on('SIGTERM', () => {
    try { 
      if (server) {
        server.close(() => log('🛑 HTTP server cerrado')); 
      }
    } catch {}
  });

  // Marcar tiempo de inicio para ignorar mensajes antiguos
  setBotStartTime();

  // Inicializar todas las sesiones
  await initializeAllSessions();
  
  // Iniciar scheduler de verificación de suscripciones (después de que las sesiones estén listas)
  try {
    const { startSubscriptionScheduler } = await import('./services/subscription/subscriptionScheduler.js');
    startSubscriptionScheduler(true); // true = ejecutar verificación inmediatamente al iniciar
    log('✅ Scheduler de suscripciones iniciado');
  } catch (err) {
    log(`⚠️ Error iniciando scheduler de suscripciones: ${err?.message || err}`);
  }
  
  // Una vez que el bot está corriendo, mostrar información
  log('\n✅ Bot iniciado y funcionando');
  log('💡 Presiona Ctrl+C para detener el bot');
  log('💡 Para gestionar sesiones, detén el bot (Ctrl+C) y ejecuta "npm start" nuevamente\n');
}

start().catch(err => {
  log('❌ Error en arranque:', err?.message || err);
  process.exit(1);
});

