// Handler para reenviar QR cuando el cliente escribe "qr"
import { logSession } from '../../../utils/logger/index.js';
import { sendQRImage } from './qrImageHandler.js';
import { getGlobalSessionManager } from '../../sessionManager/global.js';
import { getSessionByName } from '../../database/sessionService.js';

/**
 * Maneja la solicitud de reenvío de QR cuando el cliente escribe "qr"
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión (master)
 * @param {string} chatId - ID del chat
 * @param {string} texto - Texto del mensaje
 * @returns {Promise<boolean>} true si el mensaje fue procesado
 */
export async function handleQRResend(msg, sessionId, chatId, texto) {
  const textoLower = texto.toLowerCase().trim();
  
  // Solo procesar si el texto es "qr"
  if (textoLower !== 'qr') {
    return false;
  }
  
  logSession(sessionId, `📱 Cliente ${chatId} solicitó reenvío de QR`);
  
  try {
    // Extraer el número real del mensaje (igual que en phoneCapture.js)
    let realPhoneNumber = null;
    if (msg.getChat && typeof msg.getChat === 'function') {
      try {
        const chat = await msg.getChat();
        if (chat && chat.name) {
          const phoneFromChat = chat.name.replace(/\D/g, '');
          const { PHONE_VALIDATION_PATTERN } = await import('../../../config/constants.js');
          if (PHONE_VALIDATION_PATTERN.test(phoneFromChat)) {
            realPhoneNumber = phoneFromChat;
            logSession(sessionId, `✅ Número real extraído desde chat.name: ${realPhoneNumber}`);
          }
        }
      } catch (error) {
        logSession(sessionId, `⚠️ Error extrayendo número real: ${error?.message || error}`);
      }
    }
    
    if (!realPhoneNumber) {
      logSession(sessionId, `⚠️ No se pudo extraer número real del mensaje para ${chatId}`);
      return false;
    }
    
    // Buscar el cliente por número de teléfono real
    const { findClientByPhone } = await import('../../trialFlow/dbQueries.js');
    const client = await findClientByPhone(realPhoneNumber);
    
    if (!client) {
      logSession(sessionId, `⚠️ No se encontró cliente para número real ${realPhoneNumber}`);
      return false;
    }
    
    // Obtener la sesión del cliente
    const clientSession = client.sessions?.[0];
    if (!clientSession) {
      logSession(sessionId, `⚠️ Cliente ${client.name} no tiene sesión`);
      return false;
    }
    
    const clientSessionName = clientSession.session_name;
    logSession(sessionId, `📱 Sesión del cliente encontrada: ${clientSessionName}`);
    
    // Obtener el sessionManager
    const sessionManager = getGlobalSessionManager();
    if (!sessionManager) {
      logSession(sessionId, `⚠️ SessionManager no disponible`);
      return false;
    }
    
    // Obtener los datos de la sesión
    const sessionData = sessionManager.getSession(clientSessionName);
    if (!sessionData) {
      logSession(sessionId, `⚠️ SessionData no disponible para ${clientSessionName}`);
      // Intentar iniciar la sesión si no está disponible
      try {
        await sessionManager.createSession(clientSessionName, true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        const newSessionData = sessionManager.getSession(clientSessionName);
        if (newSessionData?.lastQRDataURL) {
          const qrDataURL = newSessionData.lastQRDataURL;
          const targetPhoneNumber = newSessionData.qrTargetPhone || null;
          
          // Enviar mensaje de confirmación
          const { sendBotMessage } = await import('../humanManager.js');
          await sendBotMessage(msg, sessionId, chatId, '📱 *Reenviando código QR...*');
          
          // Reenviar el QR
          await sendQRImage(msg, sessionId, chatId, qrDataURL, targetPhoneNumber);
          logSession(sessionId, `✅ QR reenviado a ${targetPhoneNumber || chatId}`);
          return true;
        }
      } catch (err) {
        logSession(sessionId, `❌ Error iniciando sesión para reenvío: ${err?.message || err}`);
      }
      return false;
    }
    
    // Obtener el QR de la sesión
    let qrDataURL = sessionData.lastQRDataURL;
    
    // Si no hay QR guardado, esperar a que se genere (máximo 30 segundos)
    if (!qrDataURL && !sessionData.isReady) {
      logSession(sessionId, `⏳ Esperando generación de QR para reenvío...`);
      const maxWaitTime = 30000;
      const startTime = Date.now();
      while (!qrDataURL && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const updatedSessionData = sessionManager.getSession(clientSessionName);
        if (updatedSessionData?.lastQRDataURL) {
          qrDataURL = updatedSessionData.lastQRDataURL;
          break;
        }
        if (updatedSessionData?.isReady) {
          logSession(sessionId, `⚠️ Sesión se conectó antes de generar QR`);
          break;
        }
      }
    }
    
    if (!qrDataURL) {
      logSession(sessionId, `⚠️ No hay QR disponible para reenviar`);
      const { sendBotMessage } = await import('../humanManager.js');
      await sendBotMessage(msg, sessionId, chatId, '⚠️ *No hay código QR disponible en este momento.*\n\nPor favor, espera unos segundos e intenta nuevamente, o contacta con soporte si el problema persiste.');
      return true;
    }
    
    // Obtener el número destino del QR (guardado cuando se creó el cliente)
    const targetPhoneNumber = sessionData.qrTargetPhone || null;
    
    logSession(sessionId, `📱 Reenviando QR a ${targetPhoneNumber || chatId}`);
    
    // Enviar mensaje de confirmación
    const { sendBotMessage } = await import('../humanManager.js');
    await sendBotMessage(msg, sessionId, chatId, '📱 *Reenviando código QR...*');
    
    // Reenviar el QR
    await sendQRImage(msg, sessionId, chatId, qrDataURL, targetPhoneNumber);
    
    logSession(sessionId, `✅ QR reenviado exitosamente`);
    return true;
  } catch (error) {
    logSession(sessionId, `❌ Error reenviando QR: ${error?.message || error}`);
    return false;
  }
}


