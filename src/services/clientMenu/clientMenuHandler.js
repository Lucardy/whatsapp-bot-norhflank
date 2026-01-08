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
  
  // Opción 0: Salir del menú
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
      // Obtener estado actual
      const { isBotEnabled } = await import('./clientMenuService.js');
      const currentStatus = await isBotEnabled(clientId, sessionId);
      const newStatus = !currentStatus;
      
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

