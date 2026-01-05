// Handler para enviar QR como imagen
import { logSession } from '../../../utils/logger/index.js';
import { markBotSentMessage } from '../humanManager.js';
import { MESSAGE_SEND_TIMEOUT, BOT_MESSAGE_REGISTER_DELAY } from '../../../config/constants.js';
import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Envía el QR como imagen al chat
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión (master)
 * @param {string} chatId - ID del chat
 * @param {string} qrDataURL - Data URL del QR
 */
export async function sendQRImage(msg, sessionId, chatId, qrDataURL) {
  let tempFilePath = null;
  
  try {
    logSession(sessionId, `📷 Enviando QR como imagen para chat ${chatId}`);
    
    // MessageMedia ya está importado al inicio del archivo
    logSession(sessionId, `🔍 Verificando MessageMedia: ${MessageMedia ? 'existe' : 'no existe'}, tipo: ${typeof MessageMedia}`);
    if (!MessageMedia || typeof MessageMedia.fromFilePath !== 'function') {
      logSession(sessionId, `⚠️ MessageMedia no disponible. Tipo: ${typeof MessageMedia}, fromFilePath: ${typeof MessageMedia?.fromFilePath}`);
      throw new Error('MessageMedia no disponible');
    }
    
    // Verificar que el qrDataURL tenga el formato correcto
    if (!qrDataURL || !qrDataURL.startsWith('data:image/')) {
      logSession(sessionId, `⚠️ QR DataURL inválido: ${qrDataURL?.substring(0, 50) || 'null'}...`);
      throw new Error('QR DataURL inválido');
    }
    
    logSession(sessionId, `🔄 Convirtiendo DataURL a archivo temporal...`);
    
    // Extraer el base64 del Data URL
    const base64Data = qrDataURL.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Crear un archivo temporal
    const tempDir = path.join(__dirname, '../../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    tempFilePath = path.join(tempDir, `qr_${sessionId}_${Date.now()}.png`);
    fs.writeFileSync(tempFilePath, buffer);
    
    logSession(sessionId, `📁 Archivo temporal creado: ${tempFilePath} (${buffer.length} bytes)`);
    
    // Verificar que el archivo se escribió correctamente
    if (!fs.existsSync(tempFilePath)) {
      logSession(sessionId, `⚠️ El archivo temporal no existe después de escribirlo`);
      throw new Error('Archivo temporal no se creó correctamente');
    }
    
    const fileStats = fs.statSync(tempFilePath);
    logSession(sessionId, `📊 Tamaño del archivo: ${fileStats.size} bytes`);
    
    // Crear MessageMedia desde el archivo
    logSession(sessionId, `🔄 Creando MessageMedia desde archivo...`);
    const media = MessageMedia.fromFilePath(tempFilePath);
    
    if (!media) {
      logSession(sessionId, `⚠️ Error creando MessageMedia desde archivo`);
      throw new Error('Error creando MessageMedia');
    }
    
    logSession(sessionId, `✅ MessageMedia creado exitosamente. Tipo: ${media.mimetype}, nombre: ${media.filename}, dataLength: ${media.data?.length || 'N/A'}`);
    
    // Obtener el cliente desde el SessionManager
    const { getGlobalSessionManager } = await import('../../sessionManager/global.js');
    const sessionManager = getGlobalSessionManager();
    
    if (!sessionManager) {
      logSession(sessionId, `⚠️ SessionManager no disponible`);
      throw new Error('SessionManager no disponible');
    }
    
    const sessionData = sessionManager.getSession(sessionId);
    if (!sessionData || !sessionData.client) {
      logSession(sessionId, `⚠️ Cliente no disponible para sesión ${sessionId}`);
      throw new Error('Cliente no disponible');
    }
    
    const client = sessionData.client;
    
    // Obtener el ID del chat desde el mensaje
    const chatIdFull = msg.from || `${chatId}@c.us`;
    
    // Verificar que el cliente esté listo
    if (!client.info || !client.info.wid) {
      logSession(sessionId, `⚠️ Cliente no está listo para enviar mensajes`);
      throw new Error('Cliente no está listo');
    }
    
    logSession(sessionId, `📋 Cliente estado: conectado`);
    logSession(sessionId, `📤 Enviando QR como imagen a ${chatIdFull}...`);
    
    // Marcar ANTES de enviar
    markBotSentMessage(sessionId, chatId);
    await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
    
    // Intentar enviar usando msg.reply con timeout
    logSession(sessionId, `📤 Intentando enviar QR usando msg.reply() con timeout de ${MESSAGE_SEND_TIMEOUT / 1000}s...`);
    const startTime = Date.now();
    
    try {
      const sendPromise = msg.reply(media, null, {
        caption: '📱 Escanea este QR con WhatsApp para activar tu bot'
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout: msg.reply tardó más de ${MESSAGE_SEND_TIMEOUT / 1000} segundos`)), MESSAGE_SEND_TIMEOUT);
      });
      
      const sentMessage = await Promise.race([sendPromise, timeoutPromise]);
      const elapsedTime = Date.now() - startTime;
      
      logSession(sessionId, `✅ QR enviado como imagen usando msg.reply() en ${elapsedTime}ms. ID: ${sentMessage?.id?._serialized || sentMessage?.id || 'N/A'}`);
    } catch (replyError) {
      logSession(sessionId, `⚠️ Error usando msg.reply(): ${replyError?.message || replyError}`);
      logSession(sessionId, `🔄 Intentando con client.sendMessage() como fallback...`);
      
      // Fallback: intentar con client.sendMessage
      try {
        const sendPromise = client.sendMessage(chatIdFull, media, {
          caption: '📱 Escanea este QR con WhatsApp para activar tu bot'
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout: sendMessage tardó más de ${MESSAGE_SEND_TIMEOUT / 1000} segundos`)), MESSAGE_SEND_TIMEOUT);
        });
        
        const sentMessage = await Promise.race([sendPromise, timeoutPromise]);
        const elapsedTime = Date.now() - startTime;
        
        logSession(sessionId, `✅ QR enviado como imagen usando client.sendMessage() en ${elapsedTime}ms. ID: ${sentMessage?.id?._serialized || sentMessage?.id || 'N/A'}`);
      } catch (sendError) {
        logSession(sessionId, `❌ Error también con client.sendMessage(): ${sendError?.message || sendError}`);
        throw sendError;
      }
    }
    
    // Limpiar archivo temporal después de enviar
    try {
      fs.unlinkSync(tempFilePath);
      logSession(sessionId, `🗑️ Archivo temporal eliminado: ${tempFilePath}`);
    } catch (cleanupError) {
      logSession(sessionId, `⚠️ Error eliminando archivo temporal: ${cleanupError?.message || cleanupError}`);
    }
  } catch (qrError) {
    logSession(sessionId, `⚠️ Error enviando QR como imagen: ${qrError?.message || qrError}`);
    logSession(sessionId, `⚠️ Stack: ${qrError?.stack || 'N/A'}`);
    
    // Limpiar archivo temporal si existe
    if (typeof tempFilePath !== 'undefined') {
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          logSession(sessionId, `🗑️ Archivo temporal eliminado después del error`);
        }
      } catch (cleanupError) {
        logSession(sessionId, `⚠️ Error eliminando archivo temporal: ${cleanupError?.message || cleanupError}`);
      }
    }
    
    // Si falla, intentar enviar un mensaje informativo
    try {
      markBotSentMessage(sessionId, chatId);
      await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
      await msg.reply('⚠️ Hubo un problema al enviar el QR. Por favor, contacta con soporte.');
    } catch (err) {
      logSession(sessionId, `❌ Error enviando mensaje de error: ${err?.message || err}`);
    }
  }
}

