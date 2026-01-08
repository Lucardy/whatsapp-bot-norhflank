// Utilidad para resolver información del cliente según el tipo de sesión
import { logSession } from '../../../utils/logger/index.js';
import { detectKnownClient } from '../clientDetector.js';

/**
 * Resuelve el clientId y clientName según el tipo de sesión
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat (número de teléfono)
 * @param {string} sessionType - Tipo de sesión ('master' o 'client')
 * @returns {Promise<{clientId: number|null, clientName: string|null}>}
 */
export async function resolveClientInfo(sessionId, chatId, sessionType) {
  let clientName = null;
  let clientId = null;
  
  if (sessionType === 'master') {
    // Para sesiones maestro: buscar si el remitente es un cliente conocido
    const clientInfo = await detectKnownClient(chatId, sessionId);
    clientName = clientInfo?.name || null;
    clientId = clientInfo?.id || null;
  } else if (sessionType === 'client') {
    // Para sesiones cliente: obtener el cliente dueño de esta sesión
    const { getSessionByName } = await import('../../database/sessionService.js');
    const session = await getSessionByName(sessionId);
    if (session?.client) {
      clientId = session.client.id;
      clientName = session.client.name;
      logSession(sessionId, `👤 Sesión de cliente detectada - Cliente: ${clientName} (ID: ${clientId}), ChatId: ${chatId}`);
    } else {
      logSession(sessionId, `⚠️ Sesión de tipo 'client' pero no tiene cliente asociado - sessionId: ${sessionId}, session: ${JSON.stringify(session)}`);
    }
  }
  
  return { clientId, clientName };
}

