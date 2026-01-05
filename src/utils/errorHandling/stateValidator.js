// Validación de estado antes de operaciones críticas
import { logSession } from '../logger/index.js';

/**
 * Valida que una sesión esté en un estado válido antes de operaciones
 * @param {Object} sessionData - Datos de la sesión
 * @param {string} sessionId - ID de la sesión
 * @param {Array<string>} allowedStates - Estados permitidos
 * @returns {boolean} true si el estado es válido
 */
export function validateSessionState(sessionData, sessionId, allowedStates = ['connected']) {
  if (!sessionData) {
    logSession(sessionId, '⚠️ Sesión no existe en SessionManager');
    return false;
  }
  
  if (!sessionData.client) {
    logSession(sessionId, '⚠️ Cliente de WhatsApp no existe');
    return false;
  }
  
  // Verificar estado de conexión
  if (!sessionData.isReady && allowedStates.includes('connected')) {
    logSession(sessionId, '⚠️ Sesión no está conectada');
    return false;
  }
  
  return true;
}

/**
 * Valida que el cliente de WhatsApp esté disponible
 * @param {Object} client - Cliente de WhatsApp
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<boolean>} true si el cliente está disponible
 */
export async function validateClientAvailable(client, sessionId) {
  if (!client) {
    logSession(sessionId, '⚠️ Cliente de WhatsApp no existe');
    return false;
  }
  
  try {
    const state = await client.getState();
    
    if (state !== 'CONNECTED') {
      logSession(sessionId, `⚠️ Cliente no está conectado (estado: ${state})`);
      return false;
    }
    
    return true;
  } catch (error) {
    logSession(sessionId, `⚠️ Error verificando estado del cliente: ${error?.message || error}`);
    return false;
  }
}

/**
 * Valida que la base de datos esté disponible
 * @param {Function} getPrisma - Función para obtener Prisma client
 * @returns {Promise<boolean>} true si la DB está disponible
 */
export async function validateDatabaseAvailable(getPrisma) {
  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    log('⚠️ Base de datos no disponible:', error?.message || error);
    return false;
  }
}

