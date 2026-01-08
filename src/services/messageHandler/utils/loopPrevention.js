// Utilidad para prevenir bucles infinitos entre sesiones
import { logSession } from '../../../utils/logger/index.js';

/**
 * Verifica si el mensaje viene de otra sesión del bot y debe ser ignorado para evitar bucles infinitos
 * @param {string} sessionId - ID de la sesión que recibió el mensaje
 * @param {string} chatId - ID del chat (número de teléfono)
 * @param {string} sessionType - Tipo de sesión ('master' o 'client')
 * @returns {Promise<{shouldIgnore: boolean, reason: string|null}>}
 */
export async function shouldIgnoreForLoopPrevention(sessionId, chatId, sessionType) {
  try {
    const { getSessionsByType } = await import('../../database/sessionService.js');
    
    if (sessionType === 'client') {
      // Si es una sesión de cliente, verificar si el mensaje viene del master
      const masterSessions = await getSessionsByType('master');
      for (const masterSession of masterSessions) {
        if (masterSession.phone_number && chatId === masterSession.phone_number) {
          logSession(sessionId, `🔄 Ignorando mensaje del master (${chatId}) en bot del cliente para evitar bucle infinito`);
          return { shouldIgnore: true, reason: 'Mensaje del master en bot del cliente' };
        }
      }
    } else if (sessionType === 'master') {
      // Si es una sesión master, verificar si el mensaje viene del bot de un cliente
      const clientSessions = await getSessionsByType('client');
      for (const clientSession of clientSessions) {
        if (clientSession.phone_number && chatId === clientSession.phone_number) {
          logSession(sessionId, `🔄 Ignorando mensaje del bot del cliente (${chatId}) en master para evitar bucle infinito`);
          return { shouldIgnore: true, reason: 'Mensaje del bot del cliente en master' };
        }
      }
    }
    
    return { shouldIgnore: false, reason: null };
  } catch (error) {
    logSession(sessionId, `⚠️ Error verificando prevención de bucle (continuando): ${error?.message || error}`);
    return { shouldIgnore: false, reason: null }; // En caso de error, continuar procesando
  }
}

