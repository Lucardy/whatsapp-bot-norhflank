// Lógica de completar el flujo para clientes existentes (solo obtener QR y enviarlo)
import { logSession } from '../../utils/logger/index.js';
import { TrialStep, trialSessions } from './constants.js';
import { getQRForSession } from './qrGeneration.js';
import { buildCompletionMessage } from './messageBuilder.js';

/**
 * Completa el flujo de prueba gratuita para un cliente existente
 * Solo obtiene el QR y lo envía, sin crear un nuevo cliente
 * @param {string} phoneNumber - Número de teléfono del usuario (chatId)
 * @param {string} sessionId - ID de la sesión (master)
 * @param {Object} sessionManager - Instancia del SessionManager (opcional)
 * @returns {Promise<Object>} { response: string, completed: boolean, clientId: number, qrUrl: string, qrDataURL: string|null, sessionName: string, qrPhoneNumber: string|null }
 */
export async function completeExistingClientFlow(phoneNumber, sessionId, sessionManager = null) {
  const trialSession = trialSessions.get(phoneNumber);
  
  if (!trialSession || !trialSession.data.isExistingClient) {
    logSession(sessionId, `⚠️ No se encontró sesión de trial para cliente existente: ${phoneNumber}`);
    return { 
      response: null, 
      completed: false, 
      clientId: null, 
      qrUrl: null, 
      qrDataURL: null, 
      sessionName: null,
      qrPhoneNumber: null
    };
  }
  
  try {
    const existingClientId = trialSession.data.existingClientId;
    const sessionName = trialSession.data.sessionName;
    const qrPhoneNumber = trialSession.data.qrPhoneNumber || null;
    
    logSession(sessionId, `📱 Completando flujo para cliente existente ID: ${existingClientId}, sesión: ${sessionName}`);
    
    // Obtener el cliente desde la base de datos
    const { getClientById } = await import('../database/clientService.js');
    const client = await getClientById(existingClientId);
    
    if (!client) {
      logSession(sessionId, `❌ Cliente no encontrado: ${existingClientId}`);
      return {
        response: '❌ *Error*\n\nNo se pudo encontrar tu cuenta. Por favor, contacta con soporte.',
        completed: false,
        clientId: null,
        qrUrl: null,
        qrDataURL: null,
        sessionName: null,
        qrPhoneNumber: null
      };
    }
    
    // Guardar el número donde se debe enviar el QR en la sesión para poder reenviarlo después
    if (qrPhoneNumber && sessionManager && sessionName) {
      const sessionData = sessionManager.getSession(sessionName);
      if (sessionData) {
        sessionData.qrTargetPhone = qrPhoneNumber;
        logSession(sessionId, `💾 Número destino del QR guardado en sessionData: ${qrPhoneNumber}`);
      }
    }
    
    // Obtener QR si tenemos acceso al sessionManager
    let qrDataURL = null;
    let isSessionReady = false;
    
    if (sessionManager && sessionName) {
      // Crear un objeto result simulado para getQRForSession
      const mockResult = {
        client: {
          id: client.id,
          contact_phone: client.contact_phone
        },
        session: {
          session_name: sessionName
        }
      };
      
      const qrResult = await getQRForSession(
        sessionManager,
        sessionName,
        mockResult,
        sessionId
      );
      
      qrDataURL = qrResult.qrDataURL;
      isSessionReady = qrResult.isSessionReady;
    }
    
    // Construir mensaje usando el builder
    const realPhoneNumber = trialSession.phoneNumber || phoneNumber;
    const completionMessage = buildCompletionMessage(
      client,
      realPhoneNumber,
      isSessionReady,
      !!qrDataURL,
      sessionId
    );
    
    // NO eliminar la sesión de trial - mantenerla activa para permitir cambiar el número o reenviar QR
    // Cambiar el paso a QR_SENT para indicar que el QR ya fue enviado pero se puede cambiar
    trialSession.step = TrialStep.QR_SENT;
    trialSession.data.qrSent = true;
    trialSession.data.lastQrPhoneNumber = qrPhoneNumber; // Guardar el último número usado
    trialSession.data.sessionName = sessionName; // Guardar el nombre de la sesión para reenvío
    
    logSession(sessionId, `✅ Flujo completado para cliente existente: ${client.name} (ID: ${client.id})`);
    logSession(sessionId, `📝 Sesión de trial mantenida activa para permitir cambiar número o reenviar QR`);
    
    return {
      response: completionMessage,
      completed: true,
      cancelled: false,
      clientId: client.id,
      qrUrl: null,
      qrDataURL: qrDataURL,
      pairingCode: null,
      sessionName: sessionName,
      isSessionReady: isSessionReady,
      qrPhoneNumber: qrPhoneNumber // null = enviar al mismo número, número = enviar a ese número
    };
  } catch (error) {
    logSession(sessionId, `❌ Error completando flujo para cliente existente: ${error?.message || error}`);
    
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

Error: ${error?.message || 'Error interno del servidor'}`,
      completed: false,
      cancelled: false,
      clientId: null,
      qrUrl: null,
      qrDataURL: null,
      sessionName: null,
      qrPhoneNumber: null
    };
  }
}

