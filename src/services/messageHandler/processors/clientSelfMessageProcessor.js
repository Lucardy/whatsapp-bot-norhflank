// Procesador de mensajes propios del cliente (fromMe en sesión cliente)
// Permite que el cliente gestione su bot escribiéndose a sí mismo
import { logSession } from '../../../utils/logger/index.js';
import { resolveClientInfo } from '../utils/clientResolver.js';
import { isBotConfigMessage, isBotTestMessage } from '../utils/botMessageDetector.js';
import { processClientMenu } from './clientMenuProcessor.js';

/**
 * Procesa mensajes propios del cliente (fromMe) en sesión cliente
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {string} texto - Texto del mensaje
 * @param {string} sessionType - Tipo de sesión
 * @returns {Promise<boolean>} true si el mensaje fue procesado
 */
export async function processClientSelfMessage(msg, sessionId, chatId, texto, sessionType) {
  // Solo procesar si es mensaje propio en sesión cliente
  if (!msg.fromMe || sessionType !== 'client') {
    logSession(sessionId, `🔍 processClientSelfMessage: No procesando - fromMe: ${msg.fromMe}, sessionType: ${sessionType}`);
    return false;
  }

  const textoLower = texto.toLowerCase().trim();
  logSession(sessionId, `🔍 processClientSelfMessage: Procesando mensaje propio en sesión cliente - texto: "${textoLower}", chatId: ${chatId}`);
  
  // Resolver información del cliente primero
  const { clientId } = await resolveClientInfo(sessionId, chatId, sessionType);
  
  if (!clientId) {
    logSession(sessionId, `⚠️ processClientSelfMessage: No se pudo resolver clientId para chatId: ${chatId}`);
    return false;
  }
  
  logSession(sessionId, `✅ processClientSelfMessage: clientId resuelto: ${clientId}`);

  // PRIORIDAD 1: Si está en modo configuración, procesar ahí
  const configProcessed = await processConfigurationMode(msg, sessionId, chatId, clientId, texto);
  if (configProcessed) {
    return true;
  }

  // PRIORIDAD 1.5: Si está en modo test, procesar ahí
  const testProcessed = await processTestMode(msg, sessionId, chatId, clientId, texto);
  if (testProcessed) {
    return true;
  }

  // PRIORIDAD 2: Verificar si es comando del menú
  const menuProcessed = await processMenuCommand(msg, sessionId, chatId, clientId, texto, textoLower);
  if (menuProcessed) {
    return true;
  }

  return false;
}

/**
 * Procesa mensajes en modo configuración
 * @param {Object} msg - Objeto de mensaje
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {number} clientId - ID del cliente
 * @param {string} texto - Texto del mensaje
 * @returns {Promise<boolean>} true si fue procesado
 */
async function processConfigurationMode(msg, sessionId, chatId, clientId, texto) {
  const { isInConfigurationMode } = await import('../../configurationFlow/index.js');
  
  if (!isInConfigurationMode(clientId)) {
    return false;
  }

  // Verificar si el mensaje parece ser del bot
  if (isBotConfigMessage(texto)) {
    logSession(sessionId, `🤖 Ignorando mensaje en modo configuración - Contiene patrón del bot`);
    return true; // Ignorar mensaje del bot
  }

  logSession(sessionId, `⚙️ Cliente ${clientId} está en modo configuración - Procesando en flujo de configuración`);
  const { handleConfigurationStep } = await import('../../configurationFlow/index.js');
  const configResult = await handleConfigurationStep(clientId, texto, sessionId);

  if (configResult && configResult.response) {
    const { sendBotMessage } = await import('../humanManager.js');
    await sendBotMessage(msg, sessionId, chatId, configResult.response);
    logSession(sessionId, '✅ Respuesta de configuración enviada');

    // Si se canceló, mostrar el menú automáticamente
    if (configResult.cancelled) {
      const { showMenu } = await import('../../clientMenu/clientMenuHandler.js');
      await showMenu(msg, clientId, sessionId);
    }

    return true;
  }

  return false;
}

/**
 * Procesa mensajes en modo test
 * @param {Object} msg - Objeto de mensaje
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {number} clientId - ID del cliente
 * @param {string} texto - Texto del mensaje
 * @returns {Promise<boolean>} true si fue procesado
 */
async function processTestMode(msg, sessionId, chatId, clientId, texto) {
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
 * Procesa comandos del menú
 * @param {Object} msg - Objeto de mensaje
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {number} clientId - ID del cliente
 * @param {string} texto - Texto del mensaje
 * @param {string} textoLower - Texto en minúsculas
 * @returns {Promise<boolean>} true si fue procesado
 */
async function processMenuCommand(msg, sessionId, chatId, clientId, texto, textoLower) {
  const isMenuCommand = ['menú', 'menu', 'configurar', 'config', 'ayuda', 'help', 'probar', 'test', 'activar'].includes(textoLower);

  // Si está en el menú, también procesar opciones numéricas (0-5)
  let isMenuOption = false;
  const { isInClientMenu } = await import('../../clientMenu/clientMenuHandler.js');
  if (isInClientMenu(clientId)) {
    isMenuOption = ['0', '1', '2', '3', '4', '5'].includes(textoLower);
  }

  if (!isMenuCommand && !isMenuOption) {
    return false;
  }

  logSession(sessionId, `🔓 Mensaje propio detectado con comando/opción del menú - Procesando antes de filtrar`);
  logSession(sessionId, `📋 Procesando comando/opción del menú para cliente ${clientId}`);
  
  const clientMenuProcessed = await processClientMenu(msg, sessionId, chatId, clientId, texto, textoLower);
  logSession(sessionId, `📋 Resultado procesamiento menú: ${clientMenuProcessed}`);

  return clientMenuProcessed;
}

