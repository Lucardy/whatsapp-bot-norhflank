// Procesador de mensajes del dueño (modo admin)
import { logSession } from '../../../utils/logger/index.js';

/**
 * Procesa mensajes del dueño en sesión master (modo admin)
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<boolean>} true si el mensaje fue procesado, false si debe continuar con el flujo normal
 */
export async function processOwnerMessage(msg, sessionId) {
  // Solo procesar si es un mensaje del dueño (fromMe)
  if (!msg.fromMe) {
    return false;
  }
  
  const targetPhone = (msg.to || msg.from || '').split('@')[0] || '';
  const texto = (msg.body || '').trim();
  
  try {
    const { processOwnerMessage } = await import('../handlers/adminHandler.js');
    const processed = await processOwnerMessage(msg, sessionId, targetPhone, texto);
    
    if (processed) {
      return true; // Procesado por el handler de admin
    }
  } catch (error) {
    logSession(sessionId, `⚠️ Error procesando mensaje del dueño: ${error?.message || error}`);
  }
  
  return false; // No procesado, continuar con flujo normal
}

