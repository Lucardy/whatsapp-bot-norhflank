// Procesador del flujo principal de mensajes (después de validaciones)
import { logSession } from '../../../utils/logger/index.js';
import { isValidOption, hasWelcomeBeenSent, resetConversationState } from '../conversationState.js';
import { getResponses } from '../responseBuilder.js';
import { resolveClientInfo } from '../utils/clientResolver.js';
import { isBotTestMessage } from '../utils/botMessageDetector.js';
import { processFlows } from './flowProcessor.js';
import { processClientMenu } from './clientMenuProcessor.js';
import { processOptions } from './optionProcessor.js';
import { processWelcomeAndInvalid } from './welcomeProcessor.js';

/**
 * Procesa el flujo principal de un mensaje después de las validaciones
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {string} texto - Texto del mensaje
 * @param {string} sessionType - Tipo de sesión
 * @param {number} messageTimestamp - Timestamp del mensaje
 * @returns {Promise<void>}
 */
export async function processMainFlow(msg, sessionId, chatId, texto, sessionType, messageTimestamp) {
  logSession(sessionId, `✅ Procesando mensaje - texto: "${texto}" teléfono: ${chatId}`);

  // Resolver información del cliente
  const { clientId, clientName } = await resolveClientInfo(sessionId, chatId, sessionType);

  // PRIORIDAD: Si está en modo test, procesar ahí ANTES de otros flujos
  const testProcessed = await processTestModeIfActive(msg, sessionId, chatId, clientId, texto, sessionType);
  if (testProcessed) {
    return;
  }

  // Procesar flujos conversacionales (trial, configuración)
  const flowsProcessed = await processFlows(msg, sessionId, chatId, clientId, texto);
  if (flowsProcessed) {
    return;
  }

  // Procesar menú de clientes (solo para sesiones de tipo 'client')
  const menuProcessed = await processClientMenuIfApplicable(msg, sessionId, chatId, clientId, texto, sessionType);
  if (menuProcessed) {
    return;
  }

  // Obtener respuestas y verificar estado de conversación
  const responses = await getResponses(sessionId, clientName, clientId);
  const isOptionValid = isValidOption(texto);

  // Verificar si el mensaje es muy antiguo
  const { CONVERSATION_TIMEOUT, MS_PER_MINUTE } = await import('../../../config/constants.js');
  const messageAge = messageTimestamp ? (Date.now() - messageTimestamp) : 0;
  const messageAgeMinutes = messageAge / MS_PER_MINUTE;
  const isOldMessage = messageTimestamp && messageAge > CONVERSATION_TIMEOUT;
  const shouldResetState = isOldMessage;

  if (shouldResetState) {
    if (CONVERSATION_TIMEOUT === 0) {
      logSession(sessionId, `🔄 Modo testing: reseteando estado para enviar bienvenida`);
    } else {
      logSession(sessionId, `🕐 Mensaje antiguo detectado (${messageAgeMinutes.toFixed(0)} minutos de antigüedad) - Tratando como nuevo contacto`);
    }
    resetConversationState(sessionId, chatId);
  }

  const welcomeSent = hasWelcomeBeenSent(sessionId, chatId);

  // Procesar opciones válidas
  if (isOptionValid) {
    const optionsProcessed = await processOptions(msg, sessionId, chatId, texto.toLowerCase().trim(), responses);
    if (optionsProcessed) {
      return;
    }
  }

  // Procesar bienvenidas y opciones inválidas
  const welcomeProcessed = await processWelcomeAndInvalid(
    msg,
    sessionId,
    chatId,
    texto,
    sessionType,
    clientId,
    clientName,
    responses,
    isOptionValid,
    welcomeSent,
    shouldResetState
  );
  
  if (welcomeProcessed) {
    return;
  }

  logSession(sessionId, '📨 ========== FIN PROCESAMIENTO MENSAJE ==========');
}

/**
 * Procesa modo test si está activo
 * IMPORTANTE: El modo test SOLO funciona en el chat privado del cliente (fromMe)
 * @param {Object} msg - Objeto de mensaje
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {number} clientId - ID del cliente
 * @param {string} texto - Texto del mensaje
 * @param {string} sessionType - Tipo de sesión
 * @returns {Promise<boolean>} true si fue procesado
 */
async function processTestModeIfActive(msg, sessionId, chatId, clientId, texto, sessionType) {
  if (sessionType !== 'client' || !clientId) {
    return false;
  }

  const { shouldProcessTestMode, handleTestModeMessage } = await import('../../clientMenu/testModeService.js');
  
  // Verificar si debe procesarse en modo test (solo fromMe y chatId coincidente)
  if (!shouldProcessTestMode(clientId, msg, chatId)) {
    return false;
  }

  // Verificar si el mensaje es del bot (previene bucles infinitos)
  if (isBotTestMessage(texto) && msg.fromMe) {
    logSession(sessionId, `🤖 Ignorando mensaje en modo test - Es un mensaje del bot (contiene prefijo de modo test)`);
    return true; // Ignorar mensaje del bot
  }

  logSession(sessionId, `🧪 Cliente ${clientId} está en modo test - Procesando mensaje de prueba (solo en chat privado)`);
  const testHandled = await handleTestModeMessage(msg, clientId, sessionId, texto);
  
  return testHandled;
}

/**
 * Procesa menú de clientes si aplica
 * @param {Object} msg - Objeto de mensaje
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {number} clientId - ID del cliente
 * @param {string} texto - Texto del mensaje
 * @param {string} sessionType - Tipo de sesión
 * @returns {Promise<boolean>} true si fue procesado
 */
async function processClientMenuIfApplicable(msg, sessionId, chatId, clientId, texto, sessionType) {
  if (sessionType !== 'client') {
    if (sessionType === 'client' && !clientId) {
      logSession(sessionId, `⚠️ Sesión de tipo 'client' pero clientId es null/undefined - no se puede procesar menú`);
    }
    return false;
  }

  if (!clientId) {
    return false;
  }

  const clientMenuProcessed = await processClientMenu(msg, sessionId, chatId, clientId, texto, texto.toLowerCase().trim());
  return clientMenuProcessed;
}

