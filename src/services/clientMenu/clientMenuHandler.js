// Handler para el menú de opciones del cliente
import { logSession } from '../../utils/logger/index.js';
import { showClientMenu, toggleBot } from './clientMenuService.js';
import { startConfiguration } from '../configurationFlow/index.js';
import { sendBotMessage } from '../messageHandler/humanManager.js';

// Mapa para rastrear si un cliente está en el menú
const clientMenuSessions = new Map(); // clientId -> boolean

/**
 * Verifica si un cliente está en el menú
 * @param {number} clientId - ID del cliente
 * @returns {boolean} true si está en el menú
 */
export function isInClientMenu(clientId) {
  return clientMenuSessions.get(clientId) === true;
}

/**
 * Activa el menú para un cliente
 * @param {number} clientId - ID del cliente
 */
export function enterClientMenu(clientId) {
  clientMenuSessions.set(clientId, true);
}

/**
 * Sale del menú para un cliente
 * @param {number} clientId - ID del cliente
 */
export function exitClientMenu(clientId) {
  clientMenuSessions.delete(clientId);
}

/**
 * Maneja las opciones del menú del cliente
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @param {string} texto - Texto del mensaje
 * @returns {Promise<boolean>} true si el mensaje fue procesado
 */
export async function handleClientMenuOption(msg, clientId, sessionId, texto) {
  const textoLower = texto.toLowerCase().trim();
  // Para mensajes propios (fromMe), usar msg.to para obtener el chatId correcto
  // Para mensajes recibidos, usar msg.from
  const chatId = msg.fromMe 
    ? ((msg.to || msg.from || '').split('@')[0] || '')
    : ((msg.from || '').split('@')[0] || '');
  
  // Opción 0: Salir del menú (siempre permitida)
  if (textoLower === '0' || textoLower === 'salir' || textoLower === 'exit') {
    exitClientMenu(clientId);
    try {
      await sendBotMessage(msg, sessionId, chatId, '✅ *Saliste del menú*\n\nPuedes volver escribiendo "menú" o "configurar".');
      logSession(sessionId, `✅ Cliente ${clientId} salió del menú`);
    } catch (err) {
      logSession(sessionId, `❌ Error enviando mensaje de salida: ${err?.message || err}`);
    }
    return true;
  }
  
  // Verificar si el cliente está bloqueado (suspendido o trial expirado)
  // Si está bloqueado, solo permitir salir (opción 0), bloquear todas las demás opciones
  const { getClientById } = await import('../database/clientService.js');
  const client = await getClientById(clientId);
  const { isClientBlocked } = await import('./clientMenuService.js');
  const blocked = await isClientBlocked(client);
  
  if (blocked) {
    // Cliente bloqueado: solo mostrar mensaje de pago y permitir salir
    try {
      const { showClientMenu } = await import('./clientMenuService.js');
      const menuMessage = await showClientMenu(clientId, sessionId);
      await sendBotMessage(msg, sessionId, chatId, `🚫 *Acceso restringido*\n\n${menuMessage}`);
      logSession(sessionId, `⚠️ Cliente ${clientId} intentó acceder a opción del menú pero está bloqueado`);
    } catch (err) {
      logSession(sessionId, `❌ Error mostrando mensaje de bloqueo: ${err?.message || err}`);
    }
    return true;
  }
  
  // Opción 1: Configurar respuestas
  if (textoLower === '1' || textoLower === 'configurar' || textoLower === 'config') {
    exitClientMenu(clientId); // Salir del menú para entrar en modo configuración
    try {
      const startMessage = await startConfiguration(clientId, chatId, sessionId);
      await sendBotMessage(msg, sessionId, chatId, startMessage);
      logSession(sessionId, `✅ Iniciando configuración para cliente ${clientId}`);
    } catch (err) {
      logSession(sessionId, `❌ Error iniciando configuración: ${err?.message || err}`);
    }
    return true;
  }
  
  // Opción 2: Activar/Desactivar bot
  if (textoLower === '2' || textoLower === 'activar' || textoLower === 'desactivar' || textoLower === 'toggle') {
    try {
      // Verificar estado de la cuenta antes de permitir activar
      const { getClientById } = await import('../database/clientService.js');
      const client = await getClientById(clientId);
      
      if (!client) {
        await sendBotMessage(msg, sessionId, chatId, '❌ *Error*\n\nNo se pudo encontrar tu cuenta. Por favor, contacta con soporte.');
        return true;
      }
      
      // Si está suspendido o el trial expiró, no permitir activar
      if (client.status === 'suspended') {
        await sendBotMessage(msg, sessionId, chatId, `🚫 *No se puede activar el bot*

Tu período de prueba ha finalizado y tu cuenta está suspendida.

💳 *Para continuar usando el bot, necesitas activar una suscripción.*

📞 *Contacta con nosotros* para elegir un plan y mantener tu bot activo.`);
        logSession(sessionId, `⚠️ Cliente ${clientId} intentó activar bot pero está suspendido`);
        return true;
      }
      
      // Si está en trial pero ya expiró (días restantes <= 0)
      if (client.status === 'trial') {
        const { getTrialDaysRemaining } = await import('../subscription/subscriptionService.js');
        const daysRemaining = getTrialDaysRemaining(client.created_at);
        
        if (daysRemaining <= 0) {
          await sendBotMessage(msg, sessionId, chatId, `🚫 *No se puede activar el bot*

Tu período de prueba ha finalizado.

💳 *Para continuar usando el bot, necesitas activar una suscripción.*

📞 *Contacta con nosotros* para elegir un plan y mantener tu bot activo.`);
          logSession(sessionId, `⚠️ Cliente ${clientId} intentó activar bot pero el trial expiró (${daysRemaining} días restantes)`);
          return true;
        }
      }
      
      // Obtener estado actual
      const { isBotEnabled } = await import('./clientMenuService.js');
      const currentStatus = await isBotEnabled(clientId, sessionId);
      const newStatus = !currentStatus;
      
      // toggleBot ya tiene validaciones internas, pero las verificamos aquí también para dar feedback inmediato
      const message = await toggleBot(clientId, newStatus, sessionId);
      await sendBotMessage(msg, sessionId, chatId, message);
      logSession(sessionId, `✅ Bot ${newStatus ? 'activado' : 'desactivado'} para cliente ${clientId}`);
      // No mostrar el menú automáticamente, el usuario puede escribir "menú" si lo necesita
    } catch (err) {
      logSession(sessionId, `❌ Error cambiando estado del bot: ${err?.message || err}`);
    }
    return true;
  }
  
  // Opción 3: Ver configuración actual
  if (textoLower === '3' || textoLower === 'ver config' || textoLower === 'configuracion' || textoLower === 'configuración') {
    try {
      const { showCurrentConfig } = await import('./helpService.js');
      const configMessage = await showCurrentConfig(clientId, sessionId);
      await sendBotMessage(msg, sessionId, chatId, configMessage);
      logSession(sessionId, `✅ Configuración mostrada para cliente ${clientId}`);
      // No mostrar el menú automáticamente, el usuario puede escribir "menú" si lo necesita
    } catch (err) {
      logSession(sessionId, `❌ Error mostrando configuración: ${err?.message || err}`);
    }
    return true;
  }
  
  // Opción 4: Ayuda
  if (textoLower === '4' || textoLower === 'ayuda' || textoLower === 'help') {
    try {
      const { showHelp } = await import('./helpService.js');
      const helpMessage = await showHelp(clientId, sessionId);
      await sendBotMessage(msg, sessionId, chatId, helpMessage);
      logSession(sessionId, `✅ Ayuda mostrada para cliente ${clientId}`);
      // No mostrar el menú automáticamente, el usuario puede escribir "menú" si lo necesita
    } catch (err) {
      logSession(sessionId, `❌ Error mostrando ayuda: ${err?.message || err}`);
    }
    return true;
  }
  
  // Opción 5: Modo Test/Preview
  if (textoLower === '5' || textoLower === 'probar' || textoLower === 'test' || textoLower === 'preview') {
    try {
      const { enterTestMode, showTestModeWelcome } = await import('./testModeService.js');
      enterTestMode(clientId, chatId, sessionId);
      const welcomeMessage = await showTestModeWelcome(clientId, sessionId);
      await sendBotMessage(msg, sessionId, chatId, welcomeMessage);
      // Marcar que ya se envió el mensaje de bienvenida para evitar bucle infinito
      const { markWelcomeSent } = await import('../messageHandler/conversationState.js');
      markWelcomeSent(sessionId, chatId);
      logSession(sessionId, `✅ Modo test activado para cliente ${clientId}`);
      exitClientMenu(clientId); // Salir del menú para entrar en modo test
    } catch (err) {
      logSession(sessionId, `❌ Error activando modo test: ${err?.message || err}`);
    }
    return true;
  }
  
  // Opción 6: Estadísticas
  if (textoLower === '6' || textoLower === 'estadísticas' || textoLower === 'estadisticas' || textoLower === 'stats' || textoLower === 'métricas' || textoLower === 'metricas') {
    try {
      const { handleStatisticsRequest } = await import('./statisticsHandler.js');
      await handleStatisticsRequest(msg, clientId, sessionId);
      logSession(sessionId, `✅ Estadísticas mostradas para cliente ${clientId}`);
      // No mostrar el menú automáticamente, el usuario puede escribir "menú" si lo necesita
    } catch (err) {
      logSession(sessionId, `❌ Error mostrando estadísticas: ${err?.message || err}`);
    }
    return true;
  }
  
  // Edición rápida de opciones: formato "editar 1 label" o "editar 1 respuesta"
  // También acepta "editar opción 1" o "cambiar 1"
  const quickEditMatch = textoLower.match(/^(editar|editar opción|cambiar|modificar)\s+(\d+)\s+(label|etiqueta|respuesta|response)$/);
  if (quickEditMatch) {
    const optionKey = quickEditMatch[2];
    const editType = quickEditMatch[3] === 'label' || quickEditMatch[3] === 'etiqueta' ? 'label' : 'response';
    try {
      const { startQuickEdit } = await import('../configurationFlow/handlers/quickEditHandler.js');
      const editMessage = await startQuickEdit(clientId, optionKey, editType, sessionId);
      await sendBotMessage(msg, sessionId, chatId, editMessage);
      exitClientMenu(clientId); // Salir del menú para entrar en modo edición rápida
      logSession(sessionId, `⚡ Edición rápida iniciada para opción ${optionKey} del cliente ${clientId}`);
    } catch (err) {
      logSession(sessionId, `❌ Error iniciando edición rápida: ${err?.message || err}`);
    }
    return true;
  }
  
  // Si está en el menú pero la opción no es válida, mostrar el menú nuevamente
  if (isInClientMenu(clientId)) {
    try {
      const menuMessage = await showClientMenu(clientId, sessionId);
      await sendBotMessage(msg, sessionId, chatId, `⚠️ *Opción no válida*\n\n${menuMessage}`);
      logSession(sessionId, `⚠️ Opción inválida en menú de cliente ${clientId}: ${texto}`);
    } catch (err) {
      logSession(sessionId, `❌ Error mostrando menú: ${err?.message || err}`);
    }
    return true;
  }
  
  return false;
}

/**
 * Muestra el menú del cliente
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 */
export async function showMenu(msg, clientId, sessionId) {
  try {
    enterClientMenu(clientId);
    const menuMessage = await showClientMenu(clientId, sessionId);
    // Para mensajes propios (fromMe), usar msg.to para obtener el chatId correcto
    // Para mensajes recibidos, usar msg.from
    const chatId = msg.fromMe 
      ? ((msg.to || msg.from || '').split('@')[0] || '')
      : ((msg.from || '').split('@')[0] || '');
    await sendBotMessage(msg, sessionId, chatId, menuMessage);
    logSession(sessionId, `✅ Menú mostrado para cliente ${clientId}`);
  } catch (err) {
    logSession(sessionId, `❌ Error mostrando menú: ${err?.message || err}`);
  }
}

