// Procesador principal de mensajes de WhatsApp - Orquestador
import { logSession } from '../../utils/logger/index.js';
import { validateSession } from './validators/sessionValidator.js';
import { validateMessage } from './validators/messageValidator.js';
import { shouldIgnoreForLoopPrevention } from './utils/loopPrevention.js';
import { extractMessageData } from './utils/messageExtractor.js';
import { logIncomingMessage } from './utils/messageLogger.js';
import { isBotTestMessage } from './utils/botMessageDetector.js';
import { processOwnerMessage } from './processors/adminProcessor.js';
import { processClientSelfMessage } from './processors/clientSelfMessageProcessor.js';
import { processMainFlow } from './processors/mainFlowProcessor.js';

// Mapa de tiempos de inicio por sesión (cuando cada sesión se conectó)
const sessionReadyTimes = new Map();

/**
 * Establece el tiempo en que una sesión se marcó como "ready"
 * @param {string} sessionId - ID de la sesión
 * @param {number} timestamp - Tiempo en milisegundos
 */
export function setSessionReadyTime(sessionId, timestamp) {
  sessionReadyTimes.set(sessionId, timestamp);
  logSession(sessionId, `⏱️ Tiempo de ready establecido: ${new Date(timestamp).toISOString()}`);
}

/**
 * Obtiene el tiempo en que una sesión se marcó como "ready"
 * @param {string} sessionId - ID de la sesión
 * @returns {number|null} Timestamp o null si no existe
 */
export function getSessionReadyTime(sessionId) {
  return sessionReadyTimes.get(sessionId) || null;
}

// Re-exportar funciones necesarias para otros módulos
export { markChatAsHumanManaged, isChatHumanManaged } from './humanManager.js';
export { clearConfigCache } from './cache.js';
export { setBotStartTime } from './filters.js';

// Re-exportar sendQRImage para uso externo
export { sendQRImage } from './handlers/qrImageHandler.js';

/**
 * Procesa un mensaje entrante y envía la respuesta correspondiente
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión que recibió el mensaje
 */
export async function handleMessage(msg, sessionId) {
  // Extraer datos del mensaje
  const messageData = extractMessageData(msg);
  const { chatId, texto, timestamp } = messageData;
  
  // Log inicial del mensaje
  logIncomingMessage(sessionId, msg, messageData);
  
  try {
    // 1. Validar sesión y estado
    const sessionValidation = await validateSession(sessionId);
    if (!sessionValidation.valid) {
      return; // Sesión no válida, ignorar mensaje
    }
    
    // 2. Obtener tipo de sesión
    const { getSessionType } = await import('../database/sessionService.js');
    const sessionType = await getSessionType(sessionId);
    logSession(sessionId, `🔍 Tipo de sesión detectado: ${sessionType}`);
    
    // 2.1. Verificar si el bot está activado para sesiones de clientes (antes de procesar)
    if (sessionType === 'client') {
      const { resolveClientInfo } = await import('./utils/clientResolver.js');
      const { clientId } = await resolveClientInfo(sessionId, chatId, sessionType);
      
      if (clientId) {
        // Solo verificar bot_enabled si NO es un mensaje propio del cliente (fromMe)
        // Los mensajes propios del cliente deben procesarse para que pueda gestionar su bot
        if (!msg.fromMe) {
          const { isBotEnabled } = await import('../clientMenu/clientMenuService.js');
          const botEnabled = await isBotEnabled(clientId, sessionId);
          
          if (!botEnabled) {
            logSession(sessionId, `⏸️ Bot desactivado para cliente ${clientId} - Ignorando mensaje de ${chatId}`);
            logSession(sessionId, `💡 El cliente debe activar el bot desde configuraciones para recibir respuestas automáticas`);
            return; // Bot desactivado, no procesar mensaje
          }
        }
      }
    }
    
    // 2.2. Guardar número de teléfono del cliente desde el mensaje
    // IMPORTANTE: El número solo se puede obtener desde el mensaje usando message.getContact()
    // Esto funciona tanto para sesiones 'client' como 'master' cuando un cliente envía un mensaje
    if (!msg.fromMe) {
      try {
        const { savePhoneNumberFromMessage, savePhoneNumberFromMasterMessage } = await import('../../services/sessionManager/phoneCapture.js');
        
        logSession(sessionId, `📱 Intentando guardar número desde mensaje (sessionType: ${sessionType}, fromMe: ${msg.fromMe})`);
        
        if (sessionType === 'client') {
          // Si es sesión cliente, guardar el número en esa sesión
          // Esto ocurre cuando el cliente envía un mensaje a su propia sesión
          await savePhoneNumberFromMessage(msg, sessionId);
        } else if (sessionType === 'master') {
          // Si es sesión master, obtener el número y buscar/actualizar la sesión del cliente
          // Esto ocurre cuando el cliente envía un mensaje al master
          await savePhoneNumberFromMasterMessage(msg, sessionId);
        }
      } catch (phoneError) {
        // No bloquear el flujo si falla guardar el número
        logSession(sessionId, `⚠️ Error guardando número desde mensaje: ${phoneError?.message || phoneError}`);
        logSession(sessionId, `   Stack: ${phoneError?.stack || 'N/A'}`);
      }
    } else {
      logSession(sessionId, `ℹ️ Mensaje es fromMe=true, no se guardará número (es un mensaje del bot)`);
    }
    
    // 2.5. PREVENIR BUCLE: Ignorar mensajes del bot que contienen prefijo de modo test
    if (msg.fromMe && sessionType === 'client' && isBotTestMessage(texto)) {
      logSession(sessionId, `🤖 Ignorando mensaje del bot en modo test - Contiene prefijo de modo test (previene bucle infinito)`);
      return; // Ignorar completamente para prevenir bucles
    }
    
    // 3. Procesar mensajes propios del cliente (fromMe en sesión cliente)
    const selfMessageProcessed = await processClientSelfMessage(msg, sessionId, chatId, texto, sessionType);
    if (selfMessageProcessed) {
      return; // Mensaje procesado
    }
    
    // 4. Procesar mensajes del dueño (modo admin)
    const adminProcessed = await processOwnerMessage(msg, sessionId);
    if (adminProcessed) {
      return; // Procesado por el handler de admin
    }
    
    // 5. Validar y filtrar mensaje
    const messageValidation = await validateMessage(msg, sessionId, chatId, texto, sessionType);
    if (messageValidation.shouldIgnore) {
      return; // Mensaje filtrado
    }
    
    // 6. Prevenir bucles infinitos
    const loopPrevention = await shouldIgnoreForLoopPrevention(sessionId, chatId, sessionType);
    if (loopPrevention.shouldIgnore) {
      return; // Mensaje ignorado para prevenir bucle
    }
    
    // 7. Procesar flujo principal
    await processMainFlow(msg, sessionId, chatId, texto, sessionType, timestamp);
    
  } catch (error) {
    logSession(sessionId, '❌ Error procesando mensaje:', error?.message || error);
    logSession(sessionId, '❌ Stack:', error?.stack);
    logSession(sessionId, '📨 ========== ERROR EN MENSAJE ==========');
  }
}
