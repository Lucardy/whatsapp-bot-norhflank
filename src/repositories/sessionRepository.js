// Repositorio para operaciones de sesiones de WhatsApp
import { getPrisma } from '../config/database.js';
import { logSession } from '../utils/logger/index.js';

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
    logSession(sessionName, `⚠️ Error obteniendo sesión: ${error?.message || error}`);
    return null;
  }
}

/**
 * Obtiene una sesión por su ID
 * @param {number} sessionId - ID de la sesión
 * @returns {Promise<Object|null>} Sesión o null si no existe
 */
export async function getSessionById(sessionId) {
  try {
    const db = getPrisma();
    return await db.whatsAppSession.findUnique({
      where: { id: sessionId },
      include: {
        client: true
      }
    });
  } catch (error) {
    logSession(`session_${sessionId}`, `⚠️ Error obteniendo sesión: ${error?.message || error}`);
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
    logSession(sessionName, `⚠️ Error obteniendo tipo de sesión: ${error?.message || error}`);
    return null;
  }
}

/**
 * Obtiene todas las sesiones de un tipo específico
 * @param {string} sessionType - Tipo de sesión ('master' o 'client')
 * @returns {Promise<Array>} Lista de sesiones
 */
export async function getSessionsByType(sessionType) {
  try {
    const db = getPrisma();
    return await db.whatsAppSession.findMany({
      where: { session_type: sessionType },
      include: {
        client: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
  } catch (error) {
    logSession('repository', `⚠️ Error obteniendo sesiones por tipo: ${error?.message || error}`);
    return [];
  }
}

/**
 * Obtiene una sesión por ID de cliente
 * @param {number} clientId - ID del cliente
 * @returns {Promise<Object|null>} Sesión o null si no existe
 */
export async function getSessionByClientId(clientId) {
  try {
    const db = getPrisma();
    return await db.whatsAppSession.findFirst({
      where: {
        client_id: clientId,
        session_type: 'client'
      },
      include: {
        client: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
  } catch (error) {
    logSession(`client_${clientId}`, `⚠️ Error obteniendo sesión por cliente: ${error?.message || error}`);
    return null;
  }
}

/**
 * Crea una nueva sesión
 * @param {Object} sessionData - Datos de la sesión
 * @returns {Promise<Object|null>} Sesión creada o null si hubo error
 */
export async function createSession(sessionData) {
  try {
    const db = getPrisma();
    return await db.whatsAppSession.create({
      data: {
        client_id: sessionData.client_id,
        session_name: sessionData.session_name,
        phone_number: sessionData.phone_number || null,
        status: sessionData.status || 'qr_pending',
        session_type: sessionData.session_type || 'client',
        session_path: sessionData.session_path || null
      },
      include: {
        client: true
      }
    });
  } catch (error) {
    logSession('repository', `⚠️ Error creando sesión: ${error?.message || error}`);
    return null;
  }
}

/**
 * Actualiza una sesión
 * @param {string} sessionName - Nombre de la sesión
 * @param {Object} updateData - Datos a actualizar
 * @returns {Promise<Object|null>} Sesión actualizada o null si hubo error
 */
export async function updateSession(sessionName, updateData) {
  try {
    const db = getPrisma();
    return await db.whatsAppSession.update({
      where: { session_name: sessionName },
      data: updateData,
      include: {
        client: true
      }
    });
  } catch (error) {
    logSession(sessionName, `⚠️ Error actualizando sesión: ${error?.message || error}`);
    return null;
  }
}

/**
 * Elimina una sesión
 * @param {string} sessionName - Nombre de la sesión
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
export async function deleteSession(sessionName) {
  try {
    const db = getPrisma();
    await db.whatsAppSession.delete({
      where: { session_name: sessionName }
    });
    return true;
  } catch (error) {
    logSession(sessionName, `⚠️ Error eliminando sesión: ${error?.message || error}`);
    return false;
  }
}

