// Configuración del sistema
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPrisma } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Cargar configuración de sesiones
// Prioridad: 1) Variable de entorno SESSIONS, 2) Base de datos, 3) Archivo sessions-config.json, 4) Default
export async function loadSessionsConfig() {
  // Opción 1: Variable de entorno
  if (process.env.SESSIONS) {
    return process.env.SESSIONS.split(',').map(s => s.trim()).filter(s => s);
  }
  
  // Opción 2: Base de datos (si está configurada)
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
    // Si no hay DB configurada, continuar con otras opciones
    console.log('⚠️ Base de datos no disponible, usando configuración alternativa');
  }
  
  // Opción 3: Archivo de configuración (fallback)
  try {
    const configPath = path.join(PROJECT_ROOT, 'sessions-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.sessions && Array.isArray(config.sessions) && config.sessions.length > 0) {
        return config.sessions;
      }
    }
  } catch (err) {
    console.error('⚠️ Error cargando sessions-config.json:', err?.message || err);
  }
  
  // Opción 4: Default
  return ['unikuo'];
}

// Guardar configuración de sesiones
// Prioridad: 1) Base de datos (si está configurada), 2) Archivo sessions-config.json
export async function saveSessionsConfig(sessions) {
  // Opción 1: Base de datos (si está configurada)
  try {
    const db = getPrisma();
    // Si hay DB, necesitamos sincronizar: eliminar sesiones que ya no están en la lista
    const existingSessions = await db.whatsAppSession.findMany({
      select: { session_name: true }
    });
    const existingNames = existingSessions.map(s => s.session_name);
    
    // Eliminar sesiones que ya no están en la lista
    const toDelete = existingNames.filter(name => !sessions.includes(name));
    if (toDelete.length > 0) {
      await db.whatsAppSession.deleteMany({
        where: {
          session_name: { in: toDelete }
        }
      });
      console.log(`🗑️ Eliminadas ${toDelete.length} sesión(es) de la base de datos: ${toDelete.join(', ')}`);
    }
    
    // Guardar también en archivo como backup
    const configPath = path.join(PROJECT_ROOT, 'sessions-config.json');
    fs.writeFileSync(configPath, JSON.stringify({ sessions }, null, 2), 'utf8');
    return true;
  } catch (err) {
    // Si no hay DB o hay error, guardar solo en archivo
    try {
      const configPath = path.join(PROJECT_ROOT, 'sessions-config.json');
      fs.writeFileSync(configPath, JSON.stringify({ sessions }, null, 2), 'utf8');
      return true;
    } catch (fileErr) {
      console.error('❌ Error guardando sessions-config.json:', fileErr?.message || fileErr);
      return false;
    }
  }
}

// Configuración general
export const config = {
  // sessions se carga de forma asíncrona, se inicializa en src/index.js
  sessionBaseDir: process.env.SESSION_BASE_DIR || path.join(PROJECT_ROOT, 'sessions'),
  port: process.env.PORT || 3000,
  projectRoot: PROJECT_ROOT,
  useDatabase: !!process.env.DATABASE_URL // Flag para saber si usar DB
};

