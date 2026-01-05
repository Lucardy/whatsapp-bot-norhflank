// Handlers para las opciones del menú (1-6)
import { logSession } from '../../../utils/logger/index.js';
import { markBotSentMessage } from '../humanManager.js';
import { sendQRImage } from './qrImageHandler.js';
import { MESSAGE_SEND_TIMEOUT, BOT_MESSAGE_REGISTER_DELAY } from '../../../config/constants.js';
import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Maneja la opción 6 (test de imagen)
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 */
export async function handleOption6(msg, sessionId, chatId) {
  logSession(sessionId, `🧪 Opción 6 - Test de imagen detectado`);
  try {
    // Usar la imagen existente qr_pablo_criscione.png como prueba
    const testImagePath = path.join(__dirname, '../../../../qr_pablo_criscione.png');
    
    if (!fs.existsSync(testImagePath)) {
      markBotSentMessage(sessionId, chatId);
      await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
      await msg.reply('❌ Imagen de prueba no encontrada');
      return;
    }
    
    logSession(sessionId, `📁 Cargando imagen de prueba: ${testImagePath}`);
    const testMedia = MessageMedia.fromFilePath(testImagePath);
    logSession(sessionId, `✅ MessageMedia creado: mimetype=${testMedia.mimetype}, filename=${testMedia.filename}, dataLength=${testMedia.data?.length || 'N/A'}`);
    
    // Obtener el cliente desde el SessionManager para tener más control
    const { getGlobalSessionManager } = await import('../../sessionManager/global.js');
    const sessionManager = getGlobalSessionManager();
    
    if (!sessionManager) {
      throw new Error('SessionManager no disponible');
    }
    
    const sessionData = sessionManager.getSession(sessionId);
    if (!sessionData || !sessionData.client) {
      throw new Error('Cliente no disponible');
    }
    
    const client = sessionData.client;
    
    // Verificar que el cliente esté listo
    if (!client.info || !client.info.wid) {
      throw new Error('Cliente no está listo');
    }
    
    logSession(sessionId, `📋 Cliente estado: ${client.info ? 'conectado' : 'desconectado'}`);
    
          markBotSentMessage(sessionId, chatId);
          await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
          
          // Intentar enviar usando msg.reply con timeout
          logSession(sessionId, `📤 Intentando enviar imagen usando msg.reply() con timeout de ${MESSAGE_SEND_TIMEOUT / 1000}s...`);
          const startTime = Date.now();
          
          try {
            const sendPromise = msg.reply(testMedia, null, {
              caption: '🧪 Esta es una imagen de prueba'
            });
            
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error(`Timeout: msg.reply tardó más de ${MESSAGE_SEND_TIMEOUT / 1000} segundos`)), MESSAGE_SEND_TIMEOUT);
            });
      
      const sentMessage = await Promise.race([sendPromise, timeoutPromise]);
      const elapsedTime = Date.now() - startTime;
      
      logSession(sessionId, `✅ Imagen de prueba enviada usando msg.reply() en ${elapsedTime}ms. ID: ${sentMessage?.id?._serialized || sentMessage?.id || 'N/A'}`);
    } catch (replyError) {
      logSession(sessionId, `⚠️ Error usando msg.reply(): ${replyError?.message || replyError}`);
      logSession(sessionId, `🔄 Intentando con client.sendMessage() como fallback...`);
      
      // Fallback: intentar con client.sendMessage
      try {
        const chatIdFull = msg.from || `${chatId}@c.us`;
              const sendPromise = client.sendMessage(chatIdFull, testMedia, {
                caption: '🧪 Esta es una imagen de prueba'
              });
              
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Timeout: sendMessage tardó más de ${MESSAGE_SEND_TIMEOUT / 1000} segundos`)), MESSAGE_SEND_TIMEOUT);
              });
        
        const sentMessage = await Promise.race([sendPromise, timeoutPromise]);
        const elapsedTime = Date.now() - startTime;
        
        logSession(sessionId, `✅ Imagen de prueba enviada usando client.sendMessage() en ${elapsedTime}ms. ID: ${sentMessage?.id?._serialized || sentMessage?.id || 'N/A'}`);
      } catch (sendError) {
        logSession(sessionId, `❌ Error también con client.sendMessage(): ${sendError?.message || sendError}`);
        throw sendError;
      }
    }
  } catch (testError) {
    logSession(sessionId, `❌ Error en prueba de imagen: ${testError?.message || testError}`);
    logSession(sessionId, `❌ Stack: ${testError?.stack || 'N/A'}`);
        try {
          markBotSentMessage(sessionId, chatId);
          await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
          await msg.reply(`❌ Error en prueba: ${testError?.message || 'Error desconocido'}`);
    } catch (err) {
      logSession(sessionId, `❌ Error enviando mensaje de error: ${err?.message || err}`);
    }
  }
}

/**
 * Maneja la opción 5 (prueba gratuita)
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 */
export async function handleOption5(msg, sessionId, chatId) {
  logSession(sessionId, `🎁 Usuario ${chatId} quiere iniciar prueba gratuita`);
  const { startTrialFlow } = await import('../../trialFlow.js');
  const { getGlobalSessionManager } = await import('../../sessionManager/global.js');
  const sessionManager = getGlobalSessionManager();
  
  const startResult = await startTrialFlow(chatId, sessionId, sessionManager);
  
  try {
    // Marcar ANTES de enviar para evitar que se detecte como acción humana
    markBotSentMessage(sessionId, chatId);
    // Pequeño delay para asegurar que el registro se procese antes del listener
    await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
    await msg.reply(startResult.message);
    logSession(sessionId, '✅ Mensaje de inicio de prueba gratuita enviado');
    
    // Si hay una sesión pendiente y se generó el QR, enviarlo inmediatamente
    if (startResult.hasPendingSession && startResult.qrDataURL) {
      await sendQRImage(msg, sessionId, chatId, startResult.qrDataURL);
    }
  } catch (err) {
    logSession(sessionId, `❌ Error enviando mensaje de prueba gratuita: ${err?.message || err}`);
    logSession(sessionId, `❌ Stack: ${err?.stack || 'N/A'}`);
  }
}

/**
 * Maneja opciones estándar (1-4)
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {string} textoLower - Texto del mensaje en minúsculas
 * @param {Object} responses - Objeto con las respuestas disponibles
 */
export async function handleStandardOption(msg, sessionId, chatId, textoLower, responses) {
  const responseText = responses[textoLower] || responses.default;
  const optionName = textoLower === '1' ? 'precios' : 
                    textoLower === '2' ? 'trabajos' : 
                    textoLower === '3' ? 'página web' : 
                    textoLower === '4' ? 'agente' : 
                    textoLower === '5' ? 'prueba gratuita' :
                    textoLower === 'configurar' || textoLower === 'config' || textoLower === '⚙️' ? 'configurar' :
                    'menú inicial';

  logSession(sessionId, `💬 Respondiendo: opción ${textoLower} (${optionName})`);
  
  try {
    // Marcar ANTES de enviar para evitar que se detecte como acción humana
    markBotSentMessage(sessionId, chatId);
    // Pequeño delay para asegurar que el registro se procese antes del listener
    await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
    const result = await msg.reply(responseText);
    logSession(sessionId, '✅ Respuesta enviada exitosamente. ID:', result?.id?._serialized || result?.id);
  } catch (replyError) {
    logSession(sessionId, `❌ Error al enviar respuesta (opción ${textoLower}):`, replyError?.message || replyError, replyError?.stack);
  }
}

