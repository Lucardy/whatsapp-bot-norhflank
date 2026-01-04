// Configuración del sistema
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// Cargar configuración de sesiones
// Prioridad: 1) Variable de entorno SESSIONS, 2) Archivo sessions-config.json, 3) Default
export function loadSessionsConfig() {
  // Opción 1: Variable de entorno
  if (process.env.SESSIONS) {
    return process.env.SESSIONS.split(',').map(s => s.trim()).filter(s => s);
  }
  
  // Opción 2: Archivo de configuración
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
  
  // Opción 3: Default
  return ['unikuo'];
}

// Configuración general
export const config = {
  sessions: loadSessionsConfig(),
  sessionBaseDir: process.env.SESSION_BASE_DIR || path.join(PROJECT_ROOT, 'sessions'),
  port: process.env.PORT || 3000,
  projectRoot: PROJECT_ROOT
};

