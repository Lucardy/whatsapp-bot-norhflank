// Handler para mensajes inválidos en el flujo de prueba gratuita
// Responsabilidad única: Generar mensajes de error contextuales con cooldown

import { logSession } from '../../../utils/logger/index.js';
import { TrialStep } from '../constants.js';

/**
 * Genera un mensaje de error contextual según el paso actual
 * @param {string} step - Paso actual del flujo
 * @returns {string} Mensaje de error contextual
 */
function getErrorMessageForStep(step) {
  switch (step) {
    case TrialStep.NAME:
      return `📝 Necesito tu nombre para continuar.\n\n💡 *Comandos disponibles:*\n• "cancelar" - Salir del proceso\n• "ayuda" - Ver ayuda contextual`;
    
    case TrialStep.EMAIL:
      return `📧 Tu email (opcional):\nPuedes saltar este paso escribiendo "saltar".\n\n💡 *Comandos disponibles:*\n• "saltar" - Omitir este paso\n• "cancelar" - Salir del proceso\n• "ayuda" - Ver ayuda contextual`;
    
    case TrialStep.QR_PHONE:
      return `📱 *¿A qué número quieres que te enviemos el código QR?*

Puede ser el número de un amigo, familiar, o cualquier otro teléfono donde puedas escanear el QR.

⚠️ *Importante:* El QR debe escanearse desde el WhatsApp donde quieres tener el bot (el número donde se activará tu bot).

💡 O escribe *"aquí"* para recibirlo en este mismo número

💡 *Comandos disponibles:*
• "aquí" - Recibir QR en este mismo número
• "cancelar" - Salir del proceso
• "ayuda" - Ver ayuda contextual`;
    
    case TrialStep.QR_SENT:
      return `📱 *QR Enviado*

El código QR ya fue enviado. Puedes:

💡 *Opciones disponibles:*
• "qr" - Reenviar el QR al mismo número
• "cambiar" o "otro número" - Enviar el QR a un número diferente
• Escribe un número de teléfono - Enviar el QR a ese número
• "aquí" - Enviar el QR a este mismo número
• "cancelar" - Salir del proceso
• "ayuda" - Ver ayuda contextual`;
    
    default:
      return null;
  }
}

/**
 * Maneja mensajes inválidos con cooldown para evitar spam
 * @param {Object} trialSession - Sesión de trial
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<Object|null>} Respuesta o null si el cooldown está activo
 */
export async function handleInvalidMessage(trialSession, phoneNumber, sessionId) {
  const { canSendErrorMessage, recordErrorMessageSent } = await import('../../messageHandler/utils/errorMessageCooldown.js');
  const stepName = trialSession.step; // 'NAME', 'EMAIL', 'QR_PHONE', etc.
  const canSend = canSendErrorMessage(sessionId, phoneNumber, 'trial', stepName);
  
  if (!canSend) {
    logSession(sessionId, `⏳ Mensaje inválido en paso ${stepName} - Cooldown activo, no se envía mensaje de error`);
    return {
      response: null, // No enviar respuesta
      completed: false,
      cancelled: false,
      clientId: null,
      qrUrl: null
    };
  }
  
  const errorMessage = getErrorMessageForStep(trialSession.step);
  if (!errorMessage) {
    return { response: null, completed: false, cancelled: false, clientId: null, qrUrl: null };
  }
  
  recordErrorMessageSent(sessionId, phoneNumber, 'trial', stepName);
  
  return {
    response: errorMessage,
    completed: false,
    cancelled: false,
    clientId: null,
    qrUrl: null
  };
}
