// Processor para ayuda genérica en el flujo de trial
// Responsabilidad única: Generar y enviar mensajes de ayuda contextual

import { logSession } from '../../../../utils/logger/index.js';
import { sendBotMessage } from '../../humanManager.js';

/**
 * Procesa y envía ayuda genérica cuando no hay respuesta del flujo
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @returns {Promise<void>}
 */
export async function processGenericHelp(msg, sessionId, chatId) {
  logSession(sessionId, `⚠️ Usuario en flujo trial pero no se devolvió respuesta - Enviando ayuda genérica`);
  
  try {
    const { getTrialStep } = await import('../../../trialFlow/index.js');
    const currentStep = getTrialStep(chatId);
    let helpMessage = '🎁 *Prueba Gratuita*\n\n';
    
    if (currentStep === 'collecting_name') {
      helpMessage += '📝 Necesito tu nombre para continuar.\n\n💡 Escribe "cancelar" si quieres salir.';
    } else if (currentStep === 'collecting_email') {
      helpMessage += '📧 Tu email (opcional):\nPuedes saltar este paso escribiendo "saltar".\n\n💡 Escribe "cancelar" si quieres salir.';
    } else if (currentStep === 'collecting_qr_phone') {
      helpMessage += '📱 ¿A qué número quieres que te enviemos el código QR?\n\nPuede ser el número de un amigo, familiar, o cualquier otro teléfono donde puedas escanear el QR.\n\n⚠️ *Importante:* El QR debe escanearse desde el WhatsApp donde quieres tener el bot (el número donde se activará tu bot).\n\n💡 Ejemplo: 5491169956253 (sin espacios ni guiones)\n💡 O escribe *"aquí"* para recibirlo en este mismo número\n\n💡 Escribe "cancelar" si quieres salir.';
    } else if (currentStep === 'qr_sent') {
      helpMessage += '📱 *QR Enviado*\n\nEl código QR ya fue enviado. Puedes:\n\n💡 *Opciones disponibles:*\n• "qr" - Reenviar el QR al mismo número\n• "cambiar" o "otro número" - Enviar el QR a un número diferente\n• Escribe un número de teléfono - Enviar el QR a ese número\n• "aquí" - Enviar el QR a este mismo número\n• "cancelar" - Salir del proceso';
    } else {
      helpMessage += 'Por favor, envía la información solicitada o escribe "cancelar" para salir del proceso.';
    }
    
    await sendBotMessage(msg, sessionId, chatId, helpMessage);
    logSession(sessionId, '✅ Mensaje de ayuda genérico enviado');
  } catch (err) {
    logSession(sessionId, `❌ Error enviando mensaje de ayuda: ${err?.message || err}`);
  }
}
