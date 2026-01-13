// Servicio para operaciones de sesiones de WhatsApp
// NOTA: Este servicio ahora usa los repositorios para abstraer las queries
import * as sessionRepository from '../../repositories/sessionRepository.js';
import { logSession } from '../../utils/logger/index.js';
import { getPrisma } from '../../config/database.js';

/**
 * Obtiene una sesión por su nombre
 * @param {string} sessionName - Nombre de la sesión
 * @returns {Promise<Object|null>} Sesión o null si no existe
 */
export async function getSessionByName(sessionName) {
  return await sessionRepository.getSessionByName(sessionName);
}

/**
 * Obtiene el tipo de sesión (master o client)
 * @param {string} sessionName - Nombre de la sesión
 * @returns {Promise<string|null>} Tipo de sesión o null
 */
export async function getSessionType(sessionName) {
  return await sessionRepository.getSessionType(sessionName);
}

/**
 * Obtiene todas las sesiones de un tipo específico
 * @param {string} sessionType - Tipo de sesión ('master' o 'client')
 * @returns {Promise<Array>} Array de sesiones
 */
export async function getSessionsByType(sessionType) {
  return await sessionRepository.getSessionsByType(sessionType);
}

/**
 * Actualiza el número de teléfono de una sesión
 * @param {string} sessionName - Nombre de la sesión
 * @param {string} phoneNumber - Número de teléfono
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
export async function updateSessionPhone(sessionName, phoneNumber) {
  try {
    // Validar que el número sea un número real, no un ID largo de WhatsApp
    const { PHONE_VALIDATION_PATTERN } = await import('../../config/constants.js');
    const cleanPhone = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : '';
    
    if (!cleanPhone || !PHONE_VALIDATION_PATTERN.test(cleanPhone)) {
      logSession(sessionName, `⚠️ Número inválido o ID largo detectado (${phoneNumber}), no se actualizará`);
      return false;
    }

    const db = getPrisma();
    await db.whatsAppSession.update({
      where: { session_name: sessionName },
      data: { 
        phone_number: cleanPhone,
        status: 'connected'
      }
    });
    logSession(sessionName, `✅ Número de teléfono actualizado: ${cleanPhone}`);
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
  return await sessionRepository.createSession(sessionData);
}

/**
 * Obtiene una sesión por ID de cliente
 * @param {number} clientId - ID del cliente
 * @param {string} [sessionType] - Tipo de sesión (opcional)
 * @returns {Promise<Object|null>} Sesión o null si no existe
 */
export async function getSessionByClientId(clientId, sessionType = null) {
  if (sessionType) {
    // Si se especifica tipo, buscar manualmente
    const sessions = await sessionRepository.getSessionsByType(sessionType);
    return sessions.find(s => s.client_id === clientId) || null;
  }
  return await sessionRepository.getSessionByClientId(clientId);
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

