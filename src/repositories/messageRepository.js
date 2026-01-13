// Repositorio para operaciones de mensajes
import { getPrisma } from '../config/database.js';
import { logSession } from '../utils/logger/index.js';

/**
 * Crea un registro de mensaje
 * @param {Object} messageData - Datos del mensaje
 * @returns {Promise<Object|null>} Mensaje creado o null si hubo error
 */
export async function createMessage(messageData) {
  try {
    const db = getPrisma();
    return await db.message.create({
      data: {
        session_id: messageData.session_id,
        from_number: messageData.from_number,
        to_number: messageData.to_number || null,
        message_body: messageData.message_body || null,
        direction: messageData.direction,
        response_sent: messageData.response_sent || false
      }
    });
  } catch (error) {
    logSession(`session_${messageData.session_id}`, `⚠️ Error creando mensaje: ${error?.message || error}`);
    return null;
  }
}

/**
 * Obtiene mensajes de una sesión en un rango de fechas
 * @param {number} sessionId - ID de la sesión
 * @param {Date} startDate - Fecha de inicio
 * @param {Date} endDate - Fecha de fin
 * @returns {Promise<Array>} Lista de mensajes
 */
export async function getMessagesByDateRange(sessionId, startDate, endDate) {
  try {
    const db = getPrisma();
    return await db.message.findMany({
      where: {
        session_id: sessionId,
        created_at: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });
  } catch (error) {
    logSession(`session_${sessionId}`, `⚠️ Error obteniendo mensajes: ${error?.message || error}`);
    return [];
  }
}

/**
 * Cuenta mensajes de una sesión por dirección
 * @param {number} sessionId - ID de la sesión
 * @param {string} direction - Dirección ('inbound' o 'outbound')
 * @param {Date} startDate - Fecha de inicio (opcional)
 * @returns {Promise<number>} Cantidad de mensajes
 */
export async function countMessages(sessionId, direction, startDate = null) {
  try {
    const db = getPrisma();
    const where = {
      session_id: sessionId,
      direction: direction
    };
    
    if (startDate) {
      where.created_at = { gte: startDate };
    }
    
    return await db.message.count({ where });
  } catch (error) {
    logSession(`session_${sessionId}`, `⚠️ Error contando mensajes: ${error?.message || error}`);
    return 0;
  }
}

/**
 * Obtiene el último mensaje de una sesión
 * @param {number} sessionId - ID de la sesión
 * @returns {Promise<Object|null>} Último mensaje o null
 */
export async function getLastMessage(sessionId) {
  try {
    const db = getPrisma();
    return await db.message.findFirst({
      where: { session_id: sessionId },
      orderBy: { created_at: 'desc' }
    });
  } catch (error) {
    logSession(`session_${sessionId}`, `⚠️ Error obteniendo último mensaje: ${error?.message || error}`);
    return null;
  }
}

/**
 * Obtiene mensajes que contienen opciones específicas
 * @param {number} sessionId - ID de la sesión
 * @param {Array<string>} options - Lista de opciones a buscar (ej: ['1', '2', '3'])
 * @param {Date} startDate - Fecha de inicio (opcional)
 * @returns {Promise<Array>} Lista de mensajes
 */
export async function getMessagesWithOptions(sessionId, options, startDate = null) {
  try {
    const db = getPrisma();
    const where = {
      session_id: sessionId,
      direction: 'inbound',
      message_body: { in: options }
    };
    
    if (startDate) {
      where.created_at = { gte: startDate };
    }
    
    return await db.message.findMany({
      where,
      select: {
        message_body: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
  } catch (error) {
    logSession(`session_${sessionId}`, `⚠️ Error obteniendo mensajes con opciones: ${error?.message || error}`);
    return [];
  }
}

