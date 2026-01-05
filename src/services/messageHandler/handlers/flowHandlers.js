// Handlers para flujos conversacionales (trial, configuración)
import { logSession } from '../../../utils/logger/index.js';
import { markBotSentMessage } from '../humanManager.js';
import { sendQRImage } from './qrImageHandler.js';
import { BOT_MESSAGE_REGISTER_DELAY } from '../../../config/constants.js';

/**
 * Maneja el flujo de prueba gratuita
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @returns {Promise<boolean>} true si el mensaje fue procesado por el flujo
 */
export async function handleTrialFlow(msg, sessionId, chatId, texto) {
  const { isInTrialFlow, handleTrialStep } = await import('../../trialFlow.js');
  
  if (!isInTrialFlow(chatId)) {
    return false;
  }
  
  logSession(sessionId, `🎁 Usuario ${chatId} en modo prueba gratuita`);
  
  // Obtener el sessionManager global
  const { getGlobalSessionManager } = await import('../../sessionManager/global.js');
  const sessionManager = getGlobalSessionManager();
  
  const trialResult = await handleTrialStep(chatId, texto, sessionId, sessionManager);
  
  // Si el usuario está en un flujo activo, siempre debería haber una respuesta
  // Si no hay respuesta pero el usuario está en el flujo, es un error
  if (trialResult.response) {
        try {
          // Marcar ANTES de enviar para evitar que se detecte como acción humana
          markBotSentMessage(sessionId, chatId);
          // Pequeño delay para asegurar que el registro se procese antes del listener
          await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
          await msg.reply(trialResult.response);
      logSession(sessionId, '✅ Respuesta de prueba gratuita enviada');
      
      // Si se completó y tenemos el QR, enviarlo como imagen
      // Solo enviar QR si la sesión no está ya conectada
      if (trialResult.completed && trialResult.qrDataURL && !trialResult.isSessionReady) {
        await sendQRImage(msg, sessionId, chatId, trialResult.qrDataURL);
      }
    } catch (err) {
      logSession(sessionId, `❌ Error enviando respuesta de prueba gratuita: ${err?.message || err}`);
    }
  } else {
    // Si no hay respuesta pero el usuario está en el flujo, enviar mensaje de ayuda genérico
    logSession(sessionId, `⚠️ Usuario en flujo trial pero no se devolvió respuesta - Enviando ayuda genérica`);
    try {
      const { getTrialStep } = await import('../../trialFlow.js');
      const currentStep = getTrialStep(chatId);
      let helpMessage = '🎁 *Prueba Gratuita*\n\n';
      
      if (currentStep === 'collecting_name') {
        helpMessage += '📝 Necesito tu nombre para continuar.\n\n💡 Escribe "cancelar" si quieres salir.';
      } else if (currentStep === 'collecting_email') {
        helpMessage += '📧 Tu email (opcional):\nEscribe "saltar" si prefieres no compartirlo.\n\n💡 Escribe "cancelar" si quieres salir.';
      } else {
        helpMessage += 'Por favor, envía la información solicitada o escribe "cancelar" para salir del proceso.';
      }
      
      markBotSentMessage(sessionId, chatId);
      await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
      await msg.reply(helpMessage);
      logSession(sessionId, '✅ Mensaje de ayuda genérico enviado');
    } catch (err) {
      logSession(sessionId, `❌ Error enviando mensaje de ayuda: ${err?.message || err}`);
    }
  }
  
  // IMPORTANTE: Si el usuario está en el flujo de trial, SIEMPRE retornar true
  // para evitar que el mensaje se procese como un mensaje normal
  // Solo retornar false si el flujo está completado o cancelado Y queremos que continúe
  // En este caso, si está completado o cancelado, el flujo terminó, así que retornamos true
  // Si NO está completado ni cancelado, el usuario sigue en el flujo, así que también retornamos true
  return true; // El usuario está en el flujo de trial, el mensaje ya fue procesado
}

/**
 * Maneja el flujo de configuración
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {number} clientId - ID del cliente
 * @param {string} texto - Texto del mensaje
 * @returns {Promise<boolean>} true si el mensaje fue procesado por el flujo
 */
export async function handleConfigurationFlow(msg, sessionId, chatId, clientId, texto) {
  if (!clientId) {
    return false;
  }
  
  const { isInConfigurationMode, handleConfigurationStep, startConfiguration } = await import('../../configurationFlow.js');
  
  // Si está en modo configuración, procesar paso
  if (isInConfigurationMode(clientId)) {
    logSession(sessionId, `⚙️ Cliente ${clientId} en modo configuración`);
    const configResult = await handleConfigurationStep(clientId, texto, sessionId);
    
    // Si el usuario está en un flujo activo, siempre debería haber una respuesta
    // Si no hay respuesta pero el usuario está en el flujo, es un error
    if (configResult.response) {
          try {
            // Marcar ANTES de enviar para evitar que se detecte como acción humana
            markBotSentMessage(sessionId, chatId);
            // Pequeño delay para asegurar que el registro se procese antes del listener
            await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
            await msg.reply(configResult.response);
        logSession(sessionId, '✅ Respuesta de configuración enviada');
      } catch (err) {
        logSession(sessionId, `❌ Error enviando respuesta de configuración: ${err?.message || err}`);
      }
    } else {
      // Si no hay respuesta pero el usuario está en el flujo, enviar mensaje de ayuda genérico
      logSession(sessionId, `⚠️ Usuario en flujo configuración pero no se devolvió respuesta - Enviando ayuda genérica`);
      try {
        const { getCurrentStepHelpMessage } = await import('../../configurationFlow.js');
        const helpResult = await getCurrentStepHelpMessage(clientId, sessionId);
        if (helpResult && helpResult.response) {
          markBotSentMessage(sessionId, chatId);
          await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
          await msg.reply(helpResult.response);
          logSession(sessionId, '✅ Mensaje de ayuda genérico enviado');
        }
      } catch (err) {
        logSession(sessionId, `❌ Error enviando mensaje de ayuda: ${err?.message || err}`);
      }
    }
    
    // Si se completó o canceló, el flujo terminó
    return configResult.completed || configResult.cancelled;
  }
  
  // Si escribe "configurar" o "⚙️", iniciar modo configuración
  const textoLower = texto.toLowerCase();
  if ((textoLower === 'configurar' || textoLower === 'config' || textoLower === '⚙️' || texto.includes('⚙️')) && clientId) {
    logSession(sessionId, `⚙️ Cliente ${clientId} quiere configurar respuestas`);
        const startMessage = await startConfiguration(clientId, chatId, sessionId);
        try {
          // Marcar ANTES de enviar para evitar que se detecte como acción humana
          markBotSentMessage(sessionId, chatId);
          // Pequeño delay para asegurar que el registro se procese antes del listener
          await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
          await msg.reply(startMessage);
      logSession(sessionId, '✅ Mensaje de inicio de configuración enviado');
    } catch (err) {
      logSession(sessionId, `❌ Error enviando mensaje de configuración: ${err?.message || err}`);
    }
    return true; // Mensaje procesado
  }
  
  return false; // No es un mensaje de flujo
}

