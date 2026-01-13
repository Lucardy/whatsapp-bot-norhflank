// Handler para el paso EMAIL del flujo de prueba gratuita
// Responsabilidad única: Procesar y validar el email del cliente

import { logSession } from '../../../utils/logger/index.js';
import { TrialStep } from '../constants.js';

/**
 * Procesa el paso EMAIL del flujo de prueba gratuita
 * @param {string} message - Mensaje del usuario (email o "saltar")
 * @param {Object} trialSession - Sesión de trial
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<Object>} Respuesta del paso
 */
export async function handleEmailStep(message, trialSession, phoneNumber, sessionId) {
  const messageLower = message.toLowerCase().trim();
  
  if (messageLower === 'saltar' || messageLower === 'skip') {
    trialSession.data.email = null;
    logSession(sessionId, `⏭️ Email omitido por ${phoneNumber}`);
  } else {
    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(message.trim())) {
      return {
        response: '❌ Email inválido. Por favor, envía un email válido o escribe "saltar".',
        completed: false,
        cancelled: false,
        clientId: null,
        qrUrl: null
      };
    }
    
    trialSession.data.email = message.trim();
    logSession(sessionId, `✅ Email recopilado: ${trialSession.data.email}`);
    
    // Si el cliente ya existe (tiene clientId), actualizar el email en la base de datos
    if (trialSession.data.clientId) {
      try {
        const { updateClient } = await import('../../../repositories/clientRepository.js');
        await updateClient(trialSession.data.clientId, {
          contact_email: trialSession.data.email
        });
        logSession(sessionId, `✅ Email actualizado en cliente existente: ${trialSession.data.email}`);
      } catch (error) {
        logSession(sessionId, `⚠️ Error actualizando email del cliente: ${error?.message || error}`);
        // Continuar con el flujo aunque haya error
      }
    }
  }
  
  // Pasar al siguiente paso: pedir número donde enviar el QR
  trialSession.step = TrialStep.QR_PHONE;
  
  // Resetear cooldown al avanzar de paso
  const { resetErrorCooldown } = await import('../../messageHandler/utils/errorMessageCooldown.js');
  resetErrorCooldown(sessionId, phoneNumber, 'trial', TrialStep.EMAIL);
  
  return {
    response: `✅ ¡Perfecto!
      
📱 *¿A qué número quieres que te enviemos el código QR?*

Puede ser el número de un amigo, familiar, o cualquier otro teléfono donde puedas escanear el QR.

⚠️ *Importante:* El QR debe escanearse desde el WhatsApp donde quieres tener el bot (el número donde se activará tu bot).

💡 O escribe *"aquí"* para recibirlo en este mismo número

💡 *Comandos disponibles:*
• "aquí" - Recibir QR en este mismo número
• "cancelar" - Salir del proceso
• "ayuda" - Ver ayuda contextual`,
    completed: false,
    cancelled: false,
    clientId: trialSession.data.clientId || null,
    qrUrl: null
  };
}
