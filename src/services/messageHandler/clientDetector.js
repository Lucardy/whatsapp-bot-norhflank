// Detección de clientes conocidos por número de teléfono
import { logSession } from '../../utils/logger/index.js';
import { getPrisma } from '../../config/database.js';

/**
 * Busca si un número de teléfono pertenece a un cliente conocido
 * @param {string} phoneNumber - Número de teléfono a buscar
 * @returns {Promise<Object|null>} Información del cliente o null si no se encuentra
 */
/**
 * Busca una sesión por número de teléfono y tipo
 * @param {string} phoneNumber - Número de teléfono
 * @param {string} sessionType - Tipo de sesión ('client' o 'master')
 * @returns {Promise<Object|null>} Sesión o null
 */
async function findSessionByPhone(phoneNumber, sessionType) {
  try {
    const db = getPrisma();
    const session = await db.whatsAppSession.findFirst({
      where: {
        phone_number: phoneNumber,
        session_type: sessionType
      },
      include: {
        client: true
      }
    });
    return session;
  } catch (error) {
    return null;
  }
}

export async function findClientByPhone(phoneNumber) {
  try {
    const session = await findSessionByPhone(phoneNumber, 'client');
    
    if (session && session.client) {
      return {
        id: session.client.id,
        name: session.client.name,
        phone: phoneNumber
      };
    }
  } catch (error) {
    // Ignorar errores silenciosamente
  }
  
  return null;
}

/**
 * Detecta si el remitente es un cliente conocido (solo para sesiones maestro)
 * @param {string} phoneNumber - Número de teléfono del remitente
 * @param {string} sessionId - ID de la sesión que recibió el mensaje
 * @returns {Promise<Object|null>} Información del cliente o null
 */
export async function detectKnownClient(phoneNumber, sessionId) {
  try {
    const { getSessionType } = await import('../database/sessionService.js');
    const sessionType = await getSessionType(sessionId);
    
    // Solo buscar cliente si es una sesión maestro (número de la empresa)
    if (sessionType === 'master') {
      const clientInfo = await findClientByPhone(phoneNumber);
      if (clientInfo) {
        logSession(sessionId, `👤 Cliente conocido detectado: ${clientInfo.name} (${phoneNumber})`);
        return clientInfo;
      } else {
        logSession(sessionId, `👤 Usuario nuevo detectado: ${phoneNumber}`);
      }
    }
  } catch (err) {
    logSession(sessionId, `⚠️ Error buscando cliente: ${err?.message || err}`);
  }
  
  return null;
}

