// Handler para mostrar estadísticas del cliente
import { logSession } from '../../utils/logger/index.js';
import { getClientStatistics, formatStatisticsMessage } from './statisticsService.js';

/**
 * Maneja la solicitud de estadísticas del cliente
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<boolean>} true si el mensaje fue procesado
 */
export async function handleStatisticsRequest(msg, clientId, sessionId) {
  try {
    logSession(sessionId, `📊 Cliente ${clientId} solicitó estadísticas`);
    
    // Obtener estadísticas
    const stats = await getClientStatistics(clientId, sessionId);
    
    // Formatear mensaje
    const message = formatStatisticsMessage(stats);
    
    // Enviar mensaje
    const { sendBotMessage } = await import('../messageHandler/humanManager.js');
    const chatId = msg.from?.split('@')[0] || msg.to?.split('@')[0];
    await sendBotMessage(msg, sessionId, chatId, message);
    
    logSession(sessionId, `✅ Estadísticas enviadas para cliente ${clientId}`);
    return true;
  } catch (error) {
    logSession(sessionId, `❌ Error manejando solicitud de estadísticas: ${error?.message || error}`);
    return false;
  }
}

