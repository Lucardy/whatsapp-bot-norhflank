// Funciones auxiliares para gestión de sesiones
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPrisma } from '../../config/database.js';
import { config, saveSessionsConfig } from '../../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../../');
const CONFIG_FILE = path.join(PROJECT_ROOT, 'sessions-config.json');
const SESSION_BASE_DIR = config.sessionBaseDir;

/**
 * Verifica si una sesión existe físicamente
 */
export function sessionExists(sessionId) {
  const sessionPath = path.join(SESSION_BASE_DIR, sessionId);
  return fs.existsSync(sessionPath);
}

/**
 * Carga sesiones desde DB o archivo
 */
export async function loadSessions() {
  // Intentar desde DB primero
  try {
    const db = getPrisma();
    const sessions = await db.whatsAppSession.findMany({
      where: {
        client: {
          status: {
            in: ['active', 'trial']
          }
        }
      },
      select: {
        session_name: true
      }
    });
    
    if (sessions.length > 0) {
      return sessions.map(s => s.session_name);
    }
  } catch (err) {
    // Si no hay DB, usar archivo
  }
  
  // Fallback a archivo
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(data);
      return config.sessions || [];
    }
  } catch (err) {
    // Ignorar errores
  }
  
  return [];
}

/**
 * Guarda sesiones en archivo (backup)
 */
export function saveSessionsToFile(sessions) {
  try {
    const config = { sessions };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    console.error('❌ Error guardando configuración:', err.message);
    return false;
  }
}

/**
 * Guarda sesiones en configuración (DB o archivo)
 */
export async function saveSessions(sessions) {
  await saveSessionsConfig(sessions);
  saveSessionsToFile(sessions);
}

/**
 * Obtiene la ruta de una sesión
 */
export function getSessionPath(sessionId) {
  return path.join(SESSION_BASE_DIR, sessionId);
}

/**
 * Obtiene la ruta de autenticación de una sesión
 */
export function getAuthPath(sessionId) {
  return path.join(getSessionPath(sessionId), '.wwebjs_auth');
}

/**
 * Obtiene el puerto configurado
 */
export function getPort() {
  return config.port;
}

