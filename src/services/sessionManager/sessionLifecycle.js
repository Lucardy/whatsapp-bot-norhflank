// Gestión del ciclo de vida de sesiones (crear, destruir, resetear)
import path from 'path';
import fs from 'fs';
import { log, logSession } from '../../utils/logger/index.js';

/**
 * Crea los datos de sesión iniciales
 * @param {string} sessionId - ID de la sesión
 * @param {string} sessionPath - Ruta de la sesión
 * @returns {Object} Datos de sesión
 */
export function createSessionData(sessionId, sessionPath) {
  logSession(sessionId, `🔧 Creando datos de sesión en ${sessionPath}`);
  
  // Asegurar que el directorio existe
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
    logSession(sessionId, `📁 Directorio de sesión creado: ${sessionPath}`);
  }
  
  return {
    client: null,
    isReady: false,
    lastQRDataURL: null,
    initInProgress: false,
    forceQR: false,
    readyTime: null,
    phoneNumber: null
  };
}

/**
 * Limpia los archivos de una sesión
 * @param {string} sessionPath - Ruta de la sesión
 * @param {boolean} deleteAll - Si true, elimina toda la carpeta
 * @returns {Promise<boolean>} true si se limpió correctamente
 */
export async function cleanupSession(sessionPath, deleteAll = false) {
  try {
    if (deleteAll) {
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        log(`✅ Carpeta completa de sesión eliminada: ${sessionPath}`);
        return true;
      }
    } else {
      const authPath = path.join(sessionPath, '.wwebjs_auth');
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
        log(`✅ Autenticación eliminada: ${authPath}`);
        return true;
      }
    }
  } catch (err) {
    log(`⚠️ Error limpiando sesión: ${err?.message || err}`);
    return false;
  }
  
  return false;
}

/**
 * Valida que una sesión pueda ser creada
 * @param {string} sessionId - ID de la sesión
 * @param {Map} existingSessions - Map de sesiones existentes
 * @returns {boolean} true si puede crearse
 */
export function canCreateSession(sessionId, existingSessions) {
  if (existingSessions.has(sessionId)) {
    log(`⚠️ Sesión ${sessionId} ya existe`);
    return false;
  }
  return true;
}

