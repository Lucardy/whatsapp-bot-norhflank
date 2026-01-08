// Servicio para manejar el menú de opciones del cliente en su propia sesión
import { logSession } from '../../utils/logger/index.js';
import { getClientConfigById, updateClientConfigById } from '../database/configService.js';

/**
 * Muestra el menú de opciones del cliente
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<string>} Mensaje del menú
 */
export async function showClientMenu(clientId, sessionId) {
  try {
    const config = await getClientConfigById(clientId, sessionId);
    const botStatus = config?.bot_enabled !== false ? '✅ Activado' : '❌ Desactivado';
    
    return `⚙️ *Menú de Configuración*

📊 *Estado del bot:* ${botStatus}

*Opciones disponibles:*

1️⃣ *Configurar respuestas*
   Personaliza los mensajes y opciones de tu bot

2️⃣ *${config?.bot_enabled !== false ? 'Desactivar' : 'Activar'} bot*
   ${config?.bot_enabled !== false ? 'Pausa las respuestas automáticas' : 'Reanuda las respuestas automáticas'}

3️⃣ *Ver configuración actual*
   Muestra tu mensaje de bienvenida y opciones configuradas

4️⃣ *Ayuda*
   Guía de uso y comandos disponibles

5️⃣ *Probar bot (Modo Test)*
   Prueba cómo funciona tu bot sin activarlo

0️⃣ *Salir del menú*

Escribe el número de la opción que deseas.`;
  } catch (err) {
    logSession(sessionId, `❌ Error mostrando menú de cliente: ${err?.message || err}`);
    return '❌ Hubo un error al mostrar el menú. Por favor, intenta nuevamente.';
  }
}

/**
 * Activa o desactiva el bot
 * @param {number} clientId - ID del cliente
 * @param {boolean} enabled - true para activar, false para desactivar
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<string>} Mensaje de confirmación
 */
export async function toggleBot(clientId, enabled, sessionId) {
  try {
    await updateClientConfigById(clientId, { bot_enabled: enabled }, sessionId);
    const status = enabled ? 'activado' : 'desactivado';
    logSession(sessionId, `✅ Bot ${status} para cliente ${clientId}`);
    
    return `✅ *Bot ${status}*

${enabled 
  ? '🤖 Tu bot ahora responderá automáticamente a los mensajes entrantes.' 
  : '⏸️ Tu bot está pausado y no responderá automáticamente.\n\nPuedes reactivarlo desde el menú cuando lo desees.'}`;
  } catch (err) {
    logSession(sessionId, `❌ Error ${enabled ? 'activando' : 'desactivando'} bot: ${err?.message || err}`);
    return `❌ Hubo un error al ${enabled ? 'activar' : 'desactivar'} el bot. Por favor, intenta nuevamente.`;
  }
}

/**
 * Verifica si el bot está activo para un cliente
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<boolean>} true si el bot está activo
 */
export async function isBotEnabled(clientId, sessionId) {
  try {
    const config = await getClientConfigById(clientId, sessionId);
    // Por defecto, el bot está DESACTIVADO si no hay configuración o si bot_enabled es false
    // El cliente debe activarlo manualmente después de configurarlo
    return config?.bot_enabled === true;
  } catch (err) {
    logSession(sessionId, `⚠️ Error verificando estado del bot: ${err?.message || err}`);
    // Por defecto, asumir que está DESACTIVADO si hay error (más seguro)
    return false;
  }
}

