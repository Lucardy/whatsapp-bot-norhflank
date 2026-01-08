// Lógica de completar el flujo de prueba gratuita
import { logSession } from '../../utils/logger/index.js';
import { TrialStep, trialSessions } from './constants.js';
import { ValidationError } from '../../utils/errors.js';
import { createClientForTrial } from './clientCreation.js';
import { getQRForSession } from './qrGeneration.js';

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
    const realPhoneNumber = trialSession.phoneNumber || phoneNumber;
    logSession(sessionId, `📱 Usando número real para crear cliente: ${realPhoneNumber} (chatId clave: ${phoneNumber})`);
    
    // Crear cliente y sesión usando el número real
    const result = await createClientForTrial(trialSession, realPhoneNumber, sessionId);
    
    // IMPORTANTE: Guardar qrPhoneNumber ANTES de eliminar la sesión
    const qrPhoneNumber = trialSession.data.qrPhoneNumber || null;
    logSession(sessionId, `📱 Número para QR guardado antes de eliminar sesión: ${qrPhoneNumber || 'null (enviar al mismo número)'}`);
    
    // Marcar como completado
    trialSession.step = TrialStep.COMPLETED;
    trialSessions.delete(phoneNumber);
    
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
    
    // Construir mensaje según el estado de la sesión
    let linkMessage = '';
    if (isSessionReady) {
      linkMessage = '✅ *Tu bot ya está activo y funcionando!*';
    } else if (qrDataURL) {
      linkMessage = '\n\n📱 *Escanea el código QR que te enviaré para vincular tu WhatsApp.*\n\n💡 *Si el QR no te llega en los próximos 2 minutos, escribe "qr" para solicitarlo nuevamente.*';
    } else {
      linkMessage = '⏳ *Generando código QR...*\n\nTe lo enviaré en un momento.\n\n💡 *Si el QR no te llega en los próximos 2 minutos, escribe "qr" para solicitarlo nuevamente.*';
    }
    
    // Obtener el número de teléfono del cliente (usar el número real, no el chatId)
    // Prioridad: 1) updatedClient.contact_phone (número guardado en DB), 2) realPhoneNumber (número extraído del mensaje)
    // NUNCA usar phoneNumber que es el chatId (identificador largo de WhatsApp)
    const clientPhone = updatedClient.contact_phone || realPhoneNumber;
    
    // Validar que clientPhone no sea el chatId (identificador largo)
    // Si clientPhone es muy largo (>15 dígitos) o contiene caracteres no numéricos, usar realPhoneNumber
    const cleanPhone = clientPhone ? clientPhone.replace(/[^0-9]/g, '') : '';
    const isPhoneValid = cleanPhone && /^[0-9]{8,15}$/.test(cleanPhone);
    const finalClientPhone = isPhoneValid ? cleanPhone : realPhoneNumber;
    
    logSession(sessionId, `📱 Número mostrado en mensaje: ${finalClientPhone}`);
    logSession(sessionId, `📱 Debug - updatedClient.contact_phone: ${updatedClient.contact_phone}, realPhoneNumber: ${realPhoneNumber}, phoneNumber (chatId): ${phoneNumber}`);
    
    logSession(sessionId, `📤 Retornando resultado con qrPhoneNumber: ${qrPhoneNumber || 'null'}`);
    
    return {
      response: `🎉 *¡Listo! Tu bot está casi listo*

✅ Nombre: *${updatedClient.name}*
${updatedClient.contact_email ? `📧 Email: ${updatedClient.contact_email}\n` : ''}📱 Teléfono: ${finalClientPhone}

${linkMessage}

⏰ *Recuerda:* Tu prueba es válida por 7 días.`,
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
    trialSessions.delete(phoneNumber);
    
    return {
      response: `❌ *Error al crear tu cuenta*

Hubo un problema. Por favor, intenta nuevamente más tarde o contacta con soporte.

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

