// Captura y guardado del número de teléfono del WhatsApp conectado
import { logSession } from '../../utils/logger/index.js';

/**
 * Captura el número de teléfono del cliente WhatsApp y lo guarda en la base de datos
 * @param {Object} client - Cliente de WhatsApp
 * @param {string} sessionId - ID de la sesión
 * @param {Object} sessionData - Datos de la sesión
 */
export async function captureAndSavePhoneNumber(client, sessionId, sessionData) {
  try {
    const clientInfo = client.info;
    if (clientInfo && clientInfo.wid) {
      const phoneNumber = clientInfo.wid.user || clientInfo.wid._serialized?.split('@')[0] || null;
      if (phoneNumber) {
        sessionData.phoneNumber = phoneNumber;
        logSession(sessionId, `📱 Número de teléfono detectado: ${phoneNumber}`);
        
        // Actualizar en la base de datos usando servicios
        try {
          const { updateSessionPhone, getSessionByName } = await import('../database/sessionService.js');
          const { updateClientPhone } = await import('../database/clientService.js');
          
          await updateSessionPhone(sessionId, phoneNumber);
          
          // Si es una sesión de cliente (no maestro), también actualizar contact_phone del cliente
          const session = await getSessionByName(sessionId);
          
          if (session && session.session_type === 'client' && session.client) {
            await updateClientPhone(session.client.id, phoneNumber);
            logSession(sessionId, `✅ Número de teléfono guardado en cliente: ${session.client.name}`);
          }
          
          logSession(sessionId, `✅ Número de teléfono guardado en la base de datos`);
        } catch (dbError) {
          logSession(sessionId, `⚠️ Error guardando número en DB: ${dbError?.message || dbError}`);
        }
      }
    }
  } catch (infoError) {
    logSession(sessionId, `⚠️ Error obteniendo información del cliente: ${infoError?.message || infoError}`);
  }
}

