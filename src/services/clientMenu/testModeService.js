// Servicio para el modo test/preview del bot
import { logSession } from '../../utils/logger/index.js';
import { getClientConfigById } from '../database/configService.js';
import { getResponses } from '../messageHandler/responseBuilder.js';
import { isValidOption } from '../messageHandler/conversationState.js';

// Mapa para rastrear qué clientes están en modo test
const testModeSessions = new Map(); // clientId -> { active: boolean, chatId: string }

/**
 * Activa el modo test para un cliente
 * @param {number} clientId - ID del cliente
 * @param {string} chatId - ID del chat (número de teléfono del cliente)
 * @param {string} sessionId - ID de la sesión para logging
 */
export function enterTestMode(clientId, chatId, sessionId) {
  testModeSessions.set(clientId, { active: true, chatId });
  logSession(sessionId, `🧪 Modo test activado para cliente ${clientId}`);
}

/**
 * Desactiva el modo test para un cliente
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión para logging
 */
export function exitTestMode(clientId, sessionId) {
  testModeSessions.delete(clientId);
  logSession(sessionId, `🧪 Modo test desactivado para cliente ${clientId}`);
}

/**
 * Verifica si un cliente está en modo test
 * @param {number} clientId - ID del cliente
 * @returns {boolean} true si está en modo test
 */
export function isInTestMode(clientId) {
  return testModeSessions.get(clientId)?.active === true;
}

/**
 * Obtiene el chatId del modo test para un cliente
 * @param {number} clientId - ID del cliente
 * @returns {string|null} chatId guardado o null si no está en modo test
 */
export function getTestModeChatId(clientId) {
  return testModeSessions.get(clientId)?.chatId || null;
}

/**
 * Verifica si un mensaje debe ser procesado en modo test
 * Solo procesa mensajes fromMe (cliente escribiéndose a sí mismo) y que coincidan con el chatId guardado
 * @param {number} clientId - ID del cliente
 * @param {Object} msg - Objeto de mensaje
 * @param {string} chatId - ID del chat del mensaje
 * @returns {boolean} true si debe procesarse en modo test
 */
export function shouldProcessTestMode(clientId, msg, chatId) {
  const testSession = testModeSessions.get(clientId);
  if (!testSession?.active) {
    return false;
  }
  
  // Solo procesar mensajes fromMe (cliente escribiéndose a sí mismo)
  if (!msg.fromMe) {
    return false;
  }
  
  // Verificar que el chatId coincida con el guardado cuando se activó el modo test
  const savedChatId = testSession.chatId;
  if (savedChatId && chatId !== savedChatId) {
    return false;
  }
  
  return true;
}

/**
 * Muestra el mensaje de inicio del modo test
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<string>} Mensaje de inicio
 */
export async function showTestModeWelcome(clientId, sessionId) {
  try {
    return `🧪 *Modo Test Activado*

Ahora puedes probar tu bot escribiendo mensajes como si fueras un usuario.

*Comandos disponibles:*
• Escribe *"1"*, *"2"*, *"3"*, *"4"* para probar las opciones
• Escribe cualquier mensaje para ver cómo responde
• Escribe *"salir"* o *"exit"* para salir del modo test

💡 *Nota:* Este modo funciona incluso si tu bot está desactivado. Los mensajes de prueba NO se enviarán a usuarios reales.

*¡Escribe algo para probar tu bot!*`;
  } catch (err) {
    logSession(sessionId, `❌ Error mostrando bienvenida de modo test: ${err?.message || err}`);
    return '❌ Hubo un error al activar el modo test. Por favor, intenta nuevamente.';
  }
}

/**
 * Procesa un mensaje en modo test
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @param {string} texto - Texto del mensaje
 * @returns {Promise<boolean>} true si el mensaje fue procesado
 */
export async function handleTestModeMessage(msg, clientId, sessionId, texto) {
  const textoLower = texto.toLowerCase().trim();
  
  // Obtener chatId correctamente (para mensajes fromMe usar msg.to, para otros usar msg.from)
  const chatId = msg.fromMe 
    ? ((msg.to || msg.from || '').split('@')[0] || '')
    : ((msg.from || '').split('@')[0] || '');
  
  logSession(sessionId, `🧪 Procesando mensaje de test - clientId: ${clientId}, chatId: ${chatId}, texto: "${texto}"`);
  
  // Comando para salir del modo test
  if (textoLower === 'salir' || textoLower === 'exit' || textoLower === '0') {
    exitTestMode(clientId, sessionId);
    try {
      const { sendBotMessage } = await import('../messageHandler/humanManager.js');
      await sendBotMessage(msg, sessionId, chatId, '✅ *Modo test desactivado*\n\nPuedes volver a activarlo desde el menú (opción 5).');
      logSession(sessionId, `✅ Cliente ${clientId} salió del modo test`);
    } catch (err) {
      logSession(sessionId, `❌ Error enviando mensaje de salida: ${err?.message || err}`);
    }
    return true;
  }
  
  // Procesar el mensaje como si fuera un usuario real
  try {
    const { getSessionByName } = await import('../database/sessionService.js');
    const session = await getSessionByName(sessionId);
    const clientName = session?.client?.name || null;
    
    // Obtener configuración del cliente para acceder a las opciones y sus labels
    const { getClientConfigById } = await import('../database/configService.js');
    const clientConfig = await getClientConfigById(clientId, sessionId);
    
    // Obtener respuestas personalizadas del cliente
    const responses = await getResponses(sessionId, clientName, clientId);
    
    // Verificar si es una opción válida
    const isOptionValid = isValidOption(texto);
    
    logSession(sessionId, `🧪 Opción válida: ${isOptionValid}, texto: "${texto}"`);
    
    // Si es una opción válida, responder con la respuesta correspondiente
    if (isOptionValid) {
      const responseText = responses[textoLower] || responses.default;
      
      // Obtener el label (pregunta) de la opción
      let questionLabel = '';
      if (clientConfig?.menu_options?.options) {
        const option = clientConfig.menu_options.options.find(opt => opt.key === textoLower);
        if (option && option.label) {
          questionLabel = option.label;
        }
      }
      
      const { sendBotMessage } = await import('../messageHandler/humanManager.js');
      
      // Construir respuesta con pregunta arriba
      let testResponse = `🧪 *[MODO TEST]*\n\n`;
      if (questionLabel) {
        testResponse += `*Pregunta:* ${questionLabel}\n\n`;
      }
      testResponse += responseText;
      
      await sendBotMessage(msg, sessionId, chatId, testResponse);
      logSession(sessionId, `🧪 Respuesta de test enviada para opción ${textoLower}`);
      return true;
    }
    
    // Si no es una opción válida, mostrar mensaje de opción inválida
    // NO enviar bienvenida aquí porque ya se envió cuando se activó el modo test
    let invalidMessage = responses.invalid_option || responses.default;
    
    // Agregar instrucciones para salir del modo test
    invalidMessage += `\n\n💡 *Para salir del modo test, escribe:* "salir" o "exit"`;
    
    const { sendBotMessage } = await import('../messageHandler/humanManager.js');
    
    const testResponse = `🧪 *[MODO TEST]*\n\n${invalidMessage}`;
    await sendBotMessage(msg, sessionId, chatId, testResponse);
    logSession(sessionId, `🧪 Mensaje de opción inválida de test enviado`);
    return true;
  } catch (err) {
    logSession(sessionId, `❌ Error procesando mensaje de test: ${err?.message || err}`);
    logSession(sessionId, `❌ Stack: ${err?.stack}`);
    return false;
  }
}

