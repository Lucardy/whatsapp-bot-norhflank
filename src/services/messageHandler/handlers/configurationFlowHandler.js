// Handler para el flujo de configuración
import { logSession } from '../../../utils/logger/index.js';

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
  
  // IMPORTANTE: La configuración solo funciona desde el propio bot del cliente, NO desde el master
  // Esto mantiene la separación de responsabilidades: master = comunicación, bot del cliente = gestión
  const { getSessionType } = await import('../../database/sessionService.js');
  const sessionType = await getSessionType(sessionId);
  
  if (sessionType === 'master') {
    // Si es el master, no permitir configuración - redirigir al cliente a su propio bot
    const textoLower = texto.toLowerCase();
    if (textoLower === 'configurar' || textoLower === 'config' || textoLower === '⚙️' || texto.includes('⚙️')) {
      try {
        const { getClientById } = await import('../../database/clientService.js');
        const client = await getClientById(clientId);
        const { getSessionByClientId } = await import('../../database/sessionService.js');
        const clientSession = await getSessionByClientId(clientId, 'client');
        
        let message = `⚙️ *Gestión de tu Bot*\n\n`;
        if (clientSession) {
          message += `Para gestionar tu bot (configurar respuestas, activar/desactivar, etc.), escribe a *tu propio bot*.\n\n`;
          message += `📱 *Tu bot:* ${clientSession.session_name}\n\n`;
          message += `💡 *Comandos disponibles en tu bot:*\n`;
          message += `• Escribe "menú" para ver opciones\n`;
          message += `• Escribe "configurar" para personalizar respuestas\n`;
          message += `• Escribe "ayuda" para ver la guía\n\n`;
          message += `✅ Tu bot está listo para recibir tus comandos.`;
        } else {
          message += `Para gestionar tu bot, necesitas tener una sesión activa.\n\n`;
          message += `💡 Si acabas de registrarte, escanea el QR que recibiste para activar tu bot.`;
        }
        
        const { sendBotMessage } = await import('../humanManager.js');
        await sendBotMessage(msg, sessionId, chatId, message);
        logSession(sessionId, `ℹ️ Cliente ${clientId} intentó configurar desde master - redirigido a su propio bot`);
      } catch (err) {
        logSession(sessionId, `❌ Error redirigiendo cliente: ${err?.message || err}`);
      }
      return true; // Mensaje procesado
    }
    return false; // No es un comando de configuración desde master
  }
  
  // Si es una sesión de cliente, permitir configuración normalmente
  const { isInConfigurationMode, handleConfigurationStep, startConfiguration } = await import('../../configurationFlow/index.js');
  
  // Si está en modo configuración, procesar paso
  if (isInConfigurationMode(clientId)) {
    logSession(sessionId, `⚙️ Cliente ${clientId} en modo configuración`);
    const configResult = await handleConfigurationStep(clientId, texto, sessionId);
    
    // Si el usuario está en un flujo activo, siempre debería haber una respuesta
    // Si no hay respuesta pero el usuario está en el flujo, es un error
    if (configResult.response) {
      try {
        // Marcar ANTES de enviar para evitar que se detecte como acción humana
        const { sendBotMessage } = await import('../humanManager.js');
        await sendBotMessage(msg, sessionId, chatId, configResult.response);
        logSession(sessionId, '✅ Respuesta de configuración enviada');
      } catch (err) {
        logSession(sessionId, `❌ Error enviando respuesta de configuración: ${err?.message || err}`);
      }
    } else {
      // Si no hay respuesta pero el usuario está en el flujo, enviar mensaje de ayuda genérico
      logSession(sessionId, `⚠️ Usuario en flujo configuración pero no se devolvió respuesta - Enviando ayuda genérica`);
      try {
        const { sendBotMessage } = await import('../humanManager.js');
        await sendBotMessage(msg, sessionId, chatId, `❓ No entendí tu mensaje.\n\n💡 *Comandos disponibles:*\n• Escribe el número de la opción que quieres editar\n• 'ver' - Ver vista previa\n• 'cancelar' - Salir del modo configuración`);
        logSession(sessionId, '✅ Mensaje de ayuda genérico enviado');
      } catch (err) {
        logSession(sessionId, `❌ Error enviando mensaje de ayuda: ${err?.message || err}`);
      }
    }
    
    // Si se canceló, mostrar el menú automáticamente
    if (configResult.cancelled) {
      try {
        const { showMenu } = await import('../../clientMenu/clientMenuHandler.js');
        await showMenu(msg, clientId, sessionId);
        logSession(sessionId, `📋 Menú mostrado después de cancelar configuración para cliente ${clientId}`);
      } catch (err) {
        logSession(sessionId, `❌ Error mostrando menú después de cancelar: ${err?.message || err}`);
      }
    }
    
    // Si se completó o canceló, el flujo terminó
    return configResult.completed || configResult.cancelled;
  }
  
  // Si escribe "configurar" o "⚙️", iniciar modo configuración (solo desde su propio bot)
  const textoLower = texto.toLowerCase();
  if ((textoLower === 'configurar' || textoLower === 'config' || textoLower === '⚙️' || texto.includes('⚙️')) && clientId) {
    logSession(sessionId, `⚙️ Cliente ${clientId} quiere configurar respuestas desde su propio bot`);
    const startMessage = await startConfiguration(clientId, chatId, sessionId);
    try {
      // Marcar ANTES de enviar para evitar que se detecte como acción humana
      const { sendBotMessage } = await import('../humanManager.js');
      await sendBotMessage(msg, sessionId, chatId, startMessage);
      logSession(sessionId, '✅ Mensaje de inicio de configuración enviado');
    } catch (err) {
      logSession(sessionId, `❌ Error enviando mensaje de configuración: ${err?.message || err}`);
    }
    return true; // Mensaje procesado
  }
  
  return false; // No es un mensaje de flujo
}

