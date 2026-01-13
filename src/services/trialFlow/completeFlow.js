// Lógica de completar el flujo de prueba gratuita
import { logSession } from '../../utils/logger/index.js';
import { TrialStep, trialSessions } from './constants.js';
import { ValidationError } from '../../utils/errors.js';
import { createClientForTrial } from './clientCreation.js';
import { getQRForSession } from './qrGeneration.js';
import { buildCompletionMessage } from './messageBuilder.js';

/**
 * Completa el flujo de prueba gratuita creando el cliente y la sesión
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @param {string} sessionId - ID de la sesión (master)
 * @param {Object} sessionManager - Instancia del SessionManager (opcional)
 * @returns {Promise<Object>} { response: string, completed: boolean, clientId: number, qrUrl: string, qrDataURL: string|null, sessionName: string }
 */
export async function completeTrialFlow(phoneNumber, sessionId, sessionManager = null) {
  const trialSession = trialSessions.get(phoneNumber);
  
  if (!trialSession) {
    return { response: null, completed: false, clientId: null, qrUrl: null, qrDataURL: null, sessionName: null };
  }
  
  try {
    // Usar el número real guardado en trialSession.phoneNumber (no el phoneNumber que es el chatId)
    // IMPORTANTE: Si no hay número real válido, usar null (no usar el chatId que puede ser ID largo)
    let realPhoneNumber = trialSession.phoneNumber;
    
    // Validar que sea un número válido
    if (realPhoneNumber) {
      const { PHONE_VALIDATION_PATTERN } = await import('../../config/constants.js');
      const cleanPhone = realPhoneNumber.replace(/[^0-9]/g, '');
      if (!PHONE_VALIDATION_PATTERN.test(cleanPhone)) {
        logSession(sessionId, `⚠️ trialSession.phoneNumber no es válido (${realPhoneNumber}), será null`);
        realPhoneNumber = null;
      } else {
        realPhoneNumber = cleanPhone;
      }
    }
    
    if (!realPhoneNumber) {
      logSession(sessionId, `⚠️ No hay número real disponible (chatId: ${phoneNumber})`);
      logSession(sessionId, `   El número se guardará cuando el cliente envíe un mensaje a su sesión`);
    } else {
      logSession(sessionId, `📱 Usando número real para crear cliente: ${realPhoneNumber} (chatId clave: ${phoneNumber})`);
    }
    
    // Crear cliente y sesión usando el número real (puede ser null)
    const result = await createClientForTrial(trialSession, realPhoneNumber, sessionId);
    
    // IMPORTANTE: Guardar qrPhoneNumber ANTES de eliminar la sesión
    const qrPhoneNumber = trialSession.data.qrPhoneNumber || null;
    logSession(sessionId, `📱 Número para QR guardado antes de eliminar sesión: ${qrPhoneNumber || 'null (enviar al mismo número)'}`);
    
    // IMPORTANTE: Guardar el mensaje original para la confirmación ANTES de eliminar la sesión
    // El mensaje original puede estar en trialSession.originalMessage o trialSession.data.originalMessage
    const originalMsg = trialSession.originalMessage || trialSession.data?.originalMessage;
    if (originalMsg && result.session.session_name) {
      const { storePendingConfirmationMessage } = await import('../sessionManager/connectionConfirmation.js');
      storePendingConfirmationMessage(result.session.session_name, originalMsg);
      logSession(sessionId, `💾 Mensaje original guardado para confirmación cuando se conecte: ${result.session.session_name}`);
    } else {
      logSession(sessionId, `⚠️ No se pudo guardar mensaje original para confirmación (originalMsg: ${!!originalMsg}, sessionName: ${result.session.session_name})`);
    }
    
    // NO eliminar la sesión de trial - mantenerla activa para permitir cambiar el número o reenviar QR
    // Cambiar el paso a QR_SENT para indicar que el QR ya fue enviado pero se puede cambiar
    trialSession.step = TrialStep.QR_SENT;
    trialSession.data.qrSent = true;
    trialSession.data.lastQrPhoneNumber = qrPhoneNumber; // Guardar el último número usado
    trialSession.data.sessionName = result.session.session_name; // Guardar el nombre de la sesión para reenvío
    
    // Recargar el cliente desde la base de datos para asegurarnos de tener el contact_phone actualizado
    const { getClientById } = await import('../database/clientService.js');
    const dbClient = await getClientById(result.client.id);
    const updatedClient = dbClient || result.client;
    
    logSession(sessionId, `📱 Cliente recargado desde DB - contact_phone: ${updatedClient.contact_phone}`);
    
    // Guardar el número donde se debe enviar el QR en la sesión para poder reenviarlo después
    // Usaremos un campo temporal en sessionData o lo guardaremos en la base de datos
    if (qrPhoneNumber && sessionManager) {
      const sessionData = sessionManager.getSession(result.session.session_name);
      if (sessionData) {
        sessionData.qrTargetPhone = qrPhoneNumber; // Guardar número destino del QR
        logSession(sessionId, `💾 Número destino del QR guardado en sessionData: ${qrPhoneNumber}`);
      }
    }
    
    // Obtener QR si tenemos acceso al sessionManager
    const { qrDataURL, isSessionReady } = await getQRForSession(
      sessionManager,
      result.session.session_name,
      result,
      sessionId
    );
    
    // Construir mensaje usando el builder
    const completionMessage = buildCompletionMessage(
      updatedClient,
      realPhoneNumber,
      isSessionReady,
      !!qrDataURL,
      sessionId
    );
    
    logSession(sessionId, `📤 Retornando resultado con qrPhoneNumber: ${qrPhoneNumber || 'null'}`);
    
    return {
      response: completionMessage,
      completed: true,
      cancelled: false,
      clientId: result.client.id,
      qrUrl: null,
      qrDataURL: qrDataURL,
      pairingCode: null, // No usar pairing code, usar QR
      sessionName: result.session.session_name,
      isSessionReady: isSessionReady,
      qrPhoneNumber: qrPhoneNumber // null = enviar al mismo número, número = enviar a ese número
    };
  } catch (error) {
    logSession(sessionId, `❌ Error completando prueba gratuita: ${error?.message || error}`);
    
    // NO eliminar la sesión de trial para permitir reintentar
    // Solo limpiar el número pendiente y el flag de procesamiento
    if (trialSession) {
      delete trialSession.data.qrPhoneNumberPending;
      delete trialSession.data.isProcessing;
      // Mantener la sesión en el paso QR_PHONE para permitir reintentar
      trialSession.step = TrialStep.QR_PHONE;
    }
    
    return {
      response: `❌ *Error al procesar tu solicitud*

Hubo un problema al generar o enviar el código QR.

💡 *Puedes intentar nuevamente:*
• Escribe otro número de teléfono
• O escribe "aquí" para recibirlo en este mismo número

💡 O escribe "cancelar" si quieres salir del proceso.

Error: ${error instanceof ValidationError ? error.message : 'Error interno del servidor'}`,
      completed: false,
      cancelled: false,
      clientId: null,
      qrUrl: null,
      qrDataURL: null,
      sessionName: null
    };
  }
}

