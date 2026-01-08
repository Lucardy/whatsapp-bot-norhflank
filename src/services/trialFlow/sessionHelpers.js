// Funciones auxiliares para manejo de sesiones en el flujo de prueba gratuita
import { logSession } from '../../utils/logger/index.js';
import { createSession } from '../database/sessionService.js';

/**
 * Crea o busca una sesión para un cliente existente
 * @param {Object} client - Cliente existente
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<Object>} Sesión creada o encontrada
 */
export async function ensureSessionForClient(client, sessionId) {
  let session = client.sessions?.[0];
  
  if (!session) {
    const sessionName = client.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    session = await createSession({
      client_id: client.id,
      session_name: sessionName,
      session_type: 'client',
      status: 'qr_pending',
      phone_number: null // Se actualizará cuando se conecte el WhatsApp
    });
    
    logSession(sessionId, `✅ Sesión creada para cliente existente: ${session.session_name}`);
  }
  
  return session;
}

