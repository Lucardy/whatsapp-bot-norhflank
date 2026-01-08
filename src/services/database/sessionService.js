// Servicio para operaciones de sesiones de WhatsApp
import { getPrisma } from '../../config/database.js';
import { logSession } from '../../utils/logger/index.js';

/**
 * Obtiene una sesión por su nombre
 * @param {string} sessionName - Nombre de la sesión
 * @returns {Promise<Object|null>} Sesión o null si no existe
 */
export async function getSessionByName(sessionName) {
  try {
    const db = getPrisma();
    return await db.whatsAppSession.findUnique({
      where: { session_name: sessionName },
      include: {
        client: true
      }
    });
  } catch (error) {
    logSession(sessionName, '⚠️ Error obteniendo sesión:', error?.message || error);
    return null;
  }
}

/**
 * Obtiene el tipo de sesión (master o client)
 * @param {string} sessionName - Nombre de la sesión
 * @returns {Promise<string|null>} Tipo de sesión o null
 */
export async function getSessionType(sessionName) {
  try {
    const db = getPrisma();
    const session = await db.whatsAppSession.findUnique({
      where: { session_name: sessionName },
      select: { session_type: true }
    });
    return session?.session_type || null;
  } catch (error) {
    return null;
  }
}

/**
 * Obtiene todas las sesiones de un tipo específico
 * @param {string} sessionType - Tipo de sesión ('master' o 'client')
 * @returns {Promise<Array>} Array de sesiones
 */
export async function getSessionsByType(sessionType) {
  try {
    const db = getPrisma();
    return await db.whatsAppSession.findMany({
      where: { session_type: sessionType },
      include: {
        client: true
      }
    });
  } catch (error) {
    logSession('system', `⚠️ Error obteniendo sesiones por tipo: ${error?.message || error}`);
    return [];
  }
}

/**
 * Actualiza el número de teléfono de una sesión
 * @param {string} sessionName - Nombre de la sesión
 * @param {string} phoneNumber - Número de teléfono
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
export async function updateSessionPhone(sessionName, phoneNumber) {
  try {
    const db = getPrisma();
    await db.whatsAppSession.update({
      where: { session_name: sessionName },
      data: { 
        phone_number: phoneNumber,
        status: 'connected'
      }
    });
    return true;
  } catch (error) {
    logSession(sessionName, '⚠️ Error actualizando número de teléfono:', error?.message || error);
    return false;
  }
}

/**
 * Actualiza el estado de una sesión
 * @param {string} sessionName - Nombre de la sesión
 * @param {string} status - Nuevo estado
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
export async function updateSessionStatus(sessionName, status) {
  try {
    const db = getPrisma();
    await db.whatsAppSession.update({
      where: { session_name: sessionName },
      data: { status }
    });
    return true;
  } catch (error) {
    logSession(sessionName, '⚠️ Error actualizando estado:', error?.message || error);
    return false;
  }
}

/**
 * Crea una nueva sesión de WhatsApp
 * @param {Object} sessionData - Datos de la sesión
 * @returns {Promise<Object|null>} Sesión creada o null si hubo error
 */
export async function createSession(sessionData) {
  try {
    const db = getPrisma();
    return await db.whatsAppSession.create({
      data: sessionData
    });
  } catch (error) {
    logSession(sessionData.session_name || 'unknown', '⚠️ Error creando sesión:', error?.message || error);
    return null;
  }
}

/**
 * Obtiene una sesión por ID de cliente
 * @param {number} clientId - ID del cliente
 * @param {string} [sessionType] - Tipo de sesión (opcional)
 * @returns {Promise<Object|null>} Sesión o null si no existe
 */
export async function getSessionByClientId(clientId, sessionType = null) {
  try {
    const db = getPrisma();
    const where = { client_id: clientId };
    if (sessionType) {
      where.session_type = sessionType;
    }
    return await db.whatsAppSession.findFirst({
      where,
      include: {
        client: true
      }
    });
  } catch (error) {
    logSession(`client_${clientId}`, '⚠️ Error obteniendo sesión:', error?.message || error);
    return null;
  }
}

/**
 * Obtiene todas las sesiones de un cliente
 * @param {number} clientId - ID del cliente
 * @returns {Promise<Array>} Array de sesiones
 */
export async function getSessionsByClientId(clientId) {
  try {
    const db = getPrisma();
    return await db.whatsAppSession.findMany({
      where: { client_id: clientId },
      select: { session_name: true }
    });
  } catch (error) {
    logSession(`client_${clientId}`, '⚠️ Error obteniendo sesiones:', error?.message || error);
    return [];
  }
}

/**
 * Busca una sesión por número de teléfono
 * @param {string} phoneNumber - Número de teléfono
 * @param {string} sessionType - Tipo de sesión ('client' o 'master')
 * @returns {Promise<Object|null>} Sesión o null si no existe
 */
export async function findSessionByPhone(phoneNumber, sessionType = 'client') {
  try {
    const db = getPrisma();
    return await db.whatsAppSession.findFirst({
      where: {
        phone_number: phoneNumber,
        session_type: sessionType
      },
      include: {
        client: true
      }
    });
  } catch (error) {
    return null;
  }
}

