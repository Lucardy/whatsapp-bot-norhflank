// Funciones de búsqueda en base de datos para el flujo de prueba gratuita
import { logSession } from '../../utils/logger/index.js';
import { getPrisma } from '../../config/database.js';

/**
 * Verifica si el usuario ya tiene una sesión pendiente de QR
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @returns {Promise<Object|null>} Sesión pendiente o null
 */
export async function findPendingSessionByPhone(phoneNumber) {
  try {
    const db = getPrisma();
    // Buscar cliente por contact_phone
    const client = await db.client.findFirst({
      where: {
        contact_phone: phoneNumber,
        status: 'trial' // Solo clientes en prueba
      },
      include: {
        sessions: {
          where: {
            session_type: 'client',
            status: { in: ['qr_pending', 'connecting'] } // Sesiones pendientes de QR
          }
        }
      }
    });
    
    if (client && client.sessions.length > 0) {
      return {
        client,
        session: client.sessions[0]
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Busca un cliente existente por número de teléfono
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @returns {Promise<Object|null>} Cliente con su sesión o null
 */
export async function findClientByPhone(phoneNumber) {
  try {
    const db = getPrisma();
    // Buscar cliente por contact_phone (normalizado)
    const { normalizePhoneNumber } = await import('../../utils/validation/phoneValidator.js');
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // Buscar con diferentes variantes del número
    const client = await db.client.findFirst({
      where: {
        OR: [
          { contact_phone: phoneNumber },
          { contact_phone: normalizedPhone },
          { contact_phone: { contains: normalizedPhone.replace(/^54/, '') } } // Sin código de país
        ]
      },
      include: {
        sessions: {
          where: {
            session_type: 'client'
          },
          orderBy: {
            created_at: 'desc'
          }
        }
      }
    });
    
    return client;
  } catch (error) {
    logSession('trialFlow', `⚠️ Error buscando cliente por número: ${error?.message || error}`);
    return null;
  }
}

