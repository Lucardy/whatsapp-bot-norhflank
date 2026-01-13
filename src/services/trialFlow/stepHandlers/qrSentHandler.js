// Handler para el paso QR_SENT del flujo de prueba gratuita
// Responsabilidad única: Manejar cuando el QR ya fue enviado (permitir cambiar número o reenviar)

import { logSession } from '../../../utils/logger/index.js';
import { TrialStep } from '../constants.js';
import { wantsSameNumber, handleSameNumber } from './qrPhoneHandler.js';
import { normalizeAndValidatePhone } from './qrPhoneHandler.js';
import { getQRForSession } from '../qrGeneration.js';
import { sendQRImage } from '../../messageHandler/handlers/qrImageHandler.js';

/**
 * Detecta si el usuario quiere cambiar el número de destino del QR
 * @param {string} message - Mensaje del usuario
 * @returns {boolean} true si quiere cambiar el número
 */
export function wantsToChangeNumber(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }
  
  const messageLower = message.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  const changeKeywords = [
    'cambiar', 'otro', 'nuevo', 'diferente', 'otro numero', 'otro número',
    'nuevo numero', 'nuevo número', 'cambiar numero', 'cambiar número',
    'diferente numero', 'diferente número', 'enviar a otro', 'enviar otro'
  ];
  
  // Verificar coincidencia exacta
  if (changeKeywords.includes(messageLower)) {
    return true;
  }
  
  // Verificar si contiene palabras clave
  const keywords = ['cambiar', 'otro', 'nuevo', 'diferente'];
  const words = messageLower.split(/\s+/);
  const hasKeyword = words.some(word => keywords.includes(word));
  
  return hasKeyword;
}

/**
 * Maneja el paso QR_SENT (QR ya enviado, pero se puede cambiar el número o reenviar)
 * @param {string} message - Mensaje del usuario
 * @param {Object} trialSession - Sesión de trial
 * @param {string} phoneNumber - Número de teléfono del usuario (chatId)
 * @param {string} sessionId - ID de la sesión para logging
 * @param {Object} sessionManager - Instancia del SessionManager
 * @returns {Promise<Object>} Respuesta del paso
 */
export async function handleQrSentStep(message, trialSession, phoneNumber, sessionId, sessionManager = null) {
  const messageLower = message.toLowerCase().trim();
  
  logSession(sessionId, `📱 Procesando mensaje en paso QR_SENT: "${message}"`);
  
  // Si es "qr", reenviar el QR al mismo número que antes
  if (messageLower === 'qr') {
    logSession(sessionId, `🔄 Usuario solicitó reenvío de QR`);
    
    const sessionName = trialSession.data.sessionName;
    const lastQrPhoneNumber = trialSession.data.lastQrPhoneNumber;
    
    if (!sessionName || !sessionManager) {
      return {
        response: '⚠️ *Error*\n\nNo se pudo obtener la información necesaria para reenviar el QR. Por favor, contacta con soporte.',
        completed: false,
        cancelled: false,
        clientId: trialSession.data.clientId || trialSession.data.existingClientId || null,
        qrUrl: null
      };
    }
    
    // Obtener el QR actualizado
    const { getClientById } = await import('../../../database/clientService.js');
    const clientId = trialSession.data.clientId || trialSession.data.existingClientId;
    const client = await getClientById(clientId);
    
    if (!client) {
      return {
        response: '⚠️ *Error*\n\nNo se pudo encontrar tu cuenta. Por favor, contacta con soporte.',
        completed: false,
        cancelled: false,
        clientId: null,
        qrUrl: null
      };
    }
    
    const mockResult = {
      client: {
        id: client.id,
        contact_phone: client.contact_phone
      },
      session: {
        session_name: sessionName
      }
    };
    
    const { qrDataURL, isSessionReady } = await getQRForSession(
      sessionManager,
      sessionName,
      mockResult,
      sessionId
    );
    
    if (isSessionReady) {
      return {
        response: '✅ *Tu bot ya está activo y funcionando!*\n\nNo necesitas escanear el QR nuevamente.',
        completed: false,
        cancelled: false,
        clientId: client.id,
        qrUrl: null
      };
    }
    
    if (!qrDataURL) {
      return {
        response: '⚠️ *No hay código QR disponible en este momento.*\n\nPor favor, espera unos segundos e intenta nuevamente.',
        completed: false,
        cancelled: false,
        clientId: client.id,
        qrUrl: null
      };
    }
    
    // Reenviar el QR
    // El mensaje original debe estar disponible en el contexto del handler
    // Por ahora, retornamos la información necesaria para que trialFlowHandler lo procese
    return {
      response: '📱 *Reenviando código QR...*',
      completed: false,
      cancelled: false,
      clientId: client.id,
      qrUrl: null,
      qrDataURL: qrDataURL,
      qrPhoneNumber: lastQrPhoneNumber,
      sessionName: sessionName,
      needsQRResend: true // Flag para indicar que se debe reenviar el QR
    };
  }
  
  // Si quiere cambiar el número, volver al paso QR_PHONE
  if (wantsToChangeNumber(message)) {
    logSession(sessionId, `🔄 Usuario quiere cambiar el número de destino del QR`);
    trialSession.step = TrialStep.QR_PHONE;
    trialSession.data.qrPhoneNumber = null; // Limpiar el número anterior
    trialSession.data.qrSent = false;
    
    return {
      response: `📱 *¿A qué número quieres que te enviemos el código QR?*

Puede ser el número de un amigo, familiar, o cualquier otro teléfono donde puedas escanear el QR.

⚠️ *Importante:* El QR debe escanearse desde el WhatsApp donde quieres tener el bot (el número donde se activará tu bot).

💡 O escribe *"aquí"* para recibirlo en este mismo número

💡 *Comandos disponibles:*
• "aquí" - Recibir QR en este mismo número
• "cancelar" - Salir del proceso
• "ayuda" - Ver ayuda contextual`,
      completed: false,
      cancelled: false,
      clientId: trialSession.data.clientId || trialSession.data.existingClientId || null,
      qrUrl: null
    };
  }
  
  // Si escribe "aquí" o un número, procesarlo como si estuviera en QR_PHONE
  if (wantsSameNumber(message)) {
    logSession(sessionId, `✅ Usuario quiere recibir QR en el mismo número (cambiando destino)`);
    trialSession.step = TrialStep.QR_PHONE;
    trialSession.data.qrSent = false; // Resetear flag
    return handleSameNumber(trialSession, phoneNumber, sessionId);
  }
  
  // Intentar normalizar como número de teléfono
  // Si parece un número, volver al paso QR_PHONE para procesarlo
  const phoneResult = await normalizeAndValidatePhone(message, trialSession, sessionId);
  if (phoneResult.isValid !== false && !phoneResult.isValid === false) {
    // Si es un número válido o está en proceso de validación, volver al paso QR_PHONE
    trialSession.step = TrialStep.QR_PHONE;
    trialSession.data.qrSent = false; // Resetear flag
  }
  
  return phoneResult;
}
