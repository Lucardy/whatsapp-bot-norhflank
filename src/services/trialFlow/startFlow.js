// Lógica de inicio del flujo de prueba gratuita
import { logSession } from '../../utils/logger/index.js';
import { TrialStep, trialSessions } from './constants.js';
import { buildWelcomeMessage } from './messageBuilder.js';
import { findExistingClient, findPendingSession } from './clientDetection.js';

/**
 * Inicia el flujo de prueba gratuita
 * @param {string} phoneNumber - Número de teléfono del usuario (puede ser chatId)
 * @param {string} sessionId - ID de la sesión (master)
 * @param {Object} sessionManager - Instancia del SessionManager (opcional)
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js (opcional, para extraer número real)
 * @returns {Promise<Object>} { message: string, hasPendingSession: boolean, sessionName: string|null, qrDataURL: string|null, pairingCode: string|null }
 */
export async function startTrialFlow(phoneNumber, sessionId, sessionManager = null, msg = null) {
  logSession(sessionId, `🎁 Iniciando flujo de prueba gratuita para ${phoneNumber}`);
  
  // Intentar extraer el número real del contacto desde el mensaje
  let realPhoneNumber = phoneNumber;
  if (msg) {
    try {
      const { extractRealPhoneNumber } = await import('../../messageHandler/utils/messageExtractor.js');
      const extractedNumber = await extractRealPhoneNumber(msg, sessionId);
      if (extractedNumber) {
        realPhoneNumber = extractedNumber;
        logSession(sessionId, `✅ Número real extraído: ${realPhoneNumber} (original chatId: ${phoneNumber})`);
      } else {
        logSession(sessionId, `⚠️ No se pudo extraer número real, usando chatId: ${phoneNumber}`);
      }
    } catch (error) {
      logSession(sessionId, `⚠️ Error extrayendo número real: ${error?.message || error}, usando chatId: ${phoneNumber}`);
    }
  }
  
  // PRIMERO: Verificar si el cliente ya existe por número de teléfono
  const existingClientResult = await findExistingClient(realPhoneNumber, sessionId, sessionManager);
  if (existingClientResult) {
    return existingClientResult;
  }
  
  // Verificar si el usuario ya tiene una sesión pendiente
  const pendingSessionResult = await findPendingSession(realPhoneNumber, sessionId, sessionManager);
  if (pendingSessionResult) {
    return pendingSessionResult;
  }
  
  // Si no hay sesión pendiente, iniciar el flujo normal
  // Usar phoneNumber como clave (chatId) pero guardar realPhoneNumber en los datos
  trialSessions.set(phoneNumber, {
    step: TrialStep.NAME,
    phoneNumber: realPhoneNumber, // Guardar el número real, no el chatId
    sessionId,
    data: {
      name: null,
      email: null,
      qrPhoneNumber: null,
      originalMessage: null // Guardar el mensaje original para responder la confirmación
    },
    startedAt: Date.now()
  });
  
  logSession(sessionId, `📝 Trial session creada con número real: ${realPhoneNumber} (clave: ${phoneNumber})`);
  
  return {
    message: buildWelcomeMessage(),
    hasPendingSession: false,
    sessionName: null,
    qrDataURL: null
  };
}

