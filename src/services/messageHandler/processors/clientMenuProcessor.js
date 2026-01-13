// Procesador de menú de clientes
import { logSession } from '../../../utils/logger/index.js';

/**
 * Procesa mensajes relacionados con el menú de clientes
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {number} clientId - ID del cliente
 * @param {string} texto - Texto del mensaje
 * @param {string} textoLower - Texto en minúsculas
 * @returns {Promise<boolean>} true si el mensaje fue procesado
 */
export async function processClientMenu(msg, sessionId, chatId, clientId, texto, textoLower) {
  if (!clientId) {
    return false;
  }
  
  logSession(sessionId, `🔍 Procesando mensaje en sesión de cliente - Cliente ID: ${clientId}, Texto: "${textoLower}"`);
  
  // Si el cliente escribe "menú" o "menu", mostrar el menú (SIEMPRE, incluso si el bot está desactivado)
  if (textoLower === 'menú' || textoLower === 'menu' || textoLower === '⚙️') {
    logSession(sessionId, `📋 Cliente ${clientId} solicitó menú`);
    const { showMenu } = await import('../../clientMenu/clientMenuHandler.js');
    await showMenu(msg, clientId, sessionId);
    return true;
  }
  
  // Si el cliente escribe "ayuda" o "help", mostrar ayuda (SIEMPRE, incluso si el bot está desactivado)
  if (textoLower === 'ayuda' || textoLower === 'help') {
    logSession(sessionId, `❓ Cliente ${clientId} solicitó ayuda`);
    const { showHelp } = await import('../../clientMenu/helpService.js');
    const helpMessage = await showHelp(clientId, sessionId);
    try {
      const { sendBotMessage } = await import('../humanManager.js');
      await sendBotMessage(msg, sessionId, chatId, helpMessage);
      logSession(sessionId, `✅ Ayuda mostrada para cliente ${clientId}`);
    } catch (err) {
      logSession(sessionId, `❌ Error mostrando ayuda: ${err?.message || err}`);
    }
    return true;
  }
  
  // Si el cliente escribe "configurar" o "config", iniciar configuración (SIEMPRE, incluso si el bot está desactivado)
  if (textoLower === 'configurar' || textoLower === 'config') {
    logSession(sessionId, `⚙️ Cliente ${clientId} solicitó configuración`);
    const { startConfiguration } = await import('../../configurationFlow/index.js');
    try {
      const startMessage = await startConfiguration(clientId, chatId, sessionId);
      const { sendBotMessage } = await import('../humanManager.js');
      await sendBotMessage(msg, sessionId, chatId, startMessage);
      logSession(sessionId, `✅ Configuración iniciada para cliente ${clientId}`);
    } catch (err) {
      logSession(sessionId, `❌ Error iniciando configuración: ${err?.message || err}`);
    }
    return true;
  }
  
  // Verificar si está en modo edición rápida (antes del menú)
  const { isInQuickEditMode, handleQuickEdit } = await import('../../configurationFlow/handlers/quickEditHandler.js');
  if (isInQuickEditMode(clientId)) {
    logSession(sessionId, `⚡ Cliente ${clientId} está en modo edición rápida`);
    const quickEditResult = await handleQuickEdit(clientId, texto, sessionId);
    if (quickEditResult) {
      const { sendBotMessage } = await import('../humanManager.js');
      await sendBotMessage(msg, sessionId, chatId, quickEditResult.response);
      return true;
    }
  }
  
  // Si el cliente está en el menú, manejar las opciones (SIEMPRE, incluso si el bot está desactivado)
  const { isInClientMenu, handleClientMenuOption } = await import('../../clientMenu/clientMenuHandler.js');
  if (isInClientMenu(clientId)) {
    logSession(sessionId, `📋 Cliente ${clientId} está en el menú, procesando opción`);
    const menuHandled = await handleClientMenuOption(msg, clientId, sessionId, texto);
    if (menuHandled) {
      return true;
    }
  }
  
  // Si el cliente está en modo test, procesar el mensaje SOLO si es fromMe (chat privado)
  // El modo test NO debe procesar mensajes de otros usuarios
  const { shouldProcessTestMode, handleTestModeMessage } = await import('../../clientMenu/testModeService.js');
  if (shouldProcessTestMode(clientId, msg, chatId)) {
    logSession(sessionId, `🧪 Cliente ${clientId} está en modo test - Procesando mensaje en chat privado`);
    const testHandled = await handleTestModeMessage(msg, clientId, sessionId, texto);
    if (testHandled) {
      return true;
    }
  }
  
  // Verificar si el bot está activo antes de responder (solo para sesiones de clientes)
  // PERO permitir modo test incluso si está desactivado
  const { isBotEnabled } = await import('../../clientMenu/clientMenuService.js');
  const { isInTestMode } = await import('../../clientMenu/testModeService.js');
  const botEnabled = await isBotEnabled(clientId, sessionId);
  
  if (!botEnabled && !isInTestMode(clientId)) {
    logSession(sessionId, `⏸️ Bot desactivado para cliente ${clientId}, ignorando mensaje automático`);
    // Si el usuario escribe "activar" o "probar", mostrar el menú
    if (textoLower === 'activar' || textoLower === 'probar' || textoLower === 'test') {
      logSession(sessionId, `📋 Cliente ${clientId} solicitó activar/probar, mostrando menú`);
      const { showMenu } = await import('../../clientMenu/clientMenuHandler.js');
      await showMenu(msg, clientId, sessionId);
    }
    return true; // Mensaje procesado (ignorado porque bot está desactivado)
  }
  
  return false; // No procesado por el menú de clientes, continuar con flujo normal
}

