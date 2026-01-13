// Orquestador principal del flujo de prueba gratuita
// Responsabilidad única: Coordinar los diferentes handlers de pasos

import { logSession } from '../../utils/logger/index.js';
import { TrialStep, trialSessions } from './constants.js';
import { isHelpKeyword } from './stepHandlers/keywords.js';
import { getContextualHelp } from './stepHandlers/helpMessages.js';
import { handleNameStep } from './stepHandlers/nameHandler.js';
import { handleEmailStep } from './stepHandlers/emailHandler.js';
import { handleQrPhoneStep } from './stepHandlers/qrPhoneHandler.js';
import { handleQrSentStep } from './stepHandlers/qrSentHandler.js';
import { handleInvalidMessage } from './stepHandlers/errorHandler.js';

/**
 * Procesa un paso del flujo de prueba gratuita
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @param {string} message - Mensaje del usuario
 * @param {string} sessionId - ID de la sesión (master)
 * @param {Object} sessionManager - Instancia del SessionManager (opcional)
 * @returns {Promise<Object>} { response: string, completed: boolean, cancelled: boolean, clientId: number|null, qrUrl: string|null, qrDataURL: string|null }
 */
export async function handleTrialStep(phoneNumber, message, sessionId, sessionManager = null) {
  const trialSession = trialSessions.get(phoneNumber);
  
  if (!trialSession) {
    return { response: null, completed: false, cancelled: false, clientId: null, qrUrl: null };
  }
  
  const messageLower = message.toLowerCase().trim();
  
  // Palabras clave globales (funcionan en cualquier paso)
  if (isHelpKeyword(message)) {
    logSession(sessionId, `❓ Usuario solicitó ayuda en paso ${trialSession.step}`);
    return {
      response: getContextualHelp(trialSession.step, trialSession),
      completed: false,
      cancelled: false,
      clientId: trialSession.data.clientId || null,
      qrUrl: null
    };
  }
  
  // Comando cancelar
  if (messageLower === 'cancelar' || messageLower === 'cancel') {
    trialSessions.delete(phoneNumber);
    logSession(sessionId, `❌ Prueba gratuita cancelada por ${phoneNumber}`);
    return {
      response: '❌ Proceso cancelado.\n\n💡 Puedes volver a solicitar una prueba gratuita escribiendo "5".',
      completed: false,
      cancelled: true,
      clientId: null,
      qrUrl: null
    };
  }
  
  // Delegar a handlers específicos según el paso actual
  switch (trialSession.step) {
    case TrialStep.NAME:
      return await handleNameStep(message, trialSession, phoneNumber, sessionId);
    
    case TrialStep.EMAIL:
      return await handleEmailStep(message, trialSession, phoneNumber, sessionId);
    
    case TrialStep.QR_PHONE:
      return await handleQrPhoneStep(message, trialSession, phoneNumber, sessionId);
    
    case TrialStep.QR_SENT:
      return await handleQrSentStep(message, trialSession, phoneNumber, sessionId, sessionManager);
    
    default:
      // Si llegamos aquí, el mensaje no es válido para el paso actual
      return await handleInvalidMessage(trialSession, phoneNumber, sessionId);
  }
}
