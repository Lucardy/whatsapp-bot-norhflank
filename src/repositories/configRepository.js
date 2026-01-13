// Repositorio para operaciones de configuración de clientes
import { getPrisma } from '../config/database.js';
import { logSession } from '../utils/logger/index.js';

/**
 * Obtiene la configuración de un cliente por sessionId
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object|null>} Configuración o null si no existe
 */
export async function getConfigBySessionId(sessionId) {
  try {
    const db = getPrisma();
    const session = await db.whatsAppSession.findUnique({
      where: { session_name: sessionId },
      include: {
        client: {
          include: {
            config: true
          }
        }
      }
    });

    if (session?.client?.config) {
      return {
        welcome_message: session.client.config.welcome_message,
        menu_options: session.client.config.menu_options,
        bot_enabled: session.client.config.bot_enabled,
        excluded_numbers: session.client.config.excluded_numbers || []
      };
    }
    return null;
  } catch (error) {
    logSession(sessionId, `⚠️ Error obteniendo configuración: ${error?.message || error}`);
    return null;
  }
}

/**
 * Obtiene la configuración de un cliente por clientId
 * @param {number} clientId - ID del cliente
 * @returns {Promise<Object|null>} Configuración o null si no existe
 */
export async function getConfigByClientId(clientId) {
  try {
    const db = getPrisma();
    const config = await db.clientConfig.findUnique({
      where: { client_id: clientId }
    });

    if (config) {
      return {
        welcome_message: config.welcome_message,
        menu_options: config.menu_options,
        bot_enabled: config.bot_enabled,
        excluded_numbers: config.excluded_numbers || []
      };
    }
    return null;
  } catch (error) {
    logSession(`client_${clientId}`, `⚠️ Error obteniendo configuración: ${error?.message || error}`);
    return null;
  }
}

/**
 * Crea o actualiza la configuración de un cliente
 * @param {number} clientId - ID del cliente
 * @param {Object} configData - Datos de configuración
 * @returns {Promise<Object|null>} Configuración creada/actualizada o null si hubo error
 */
export async function upsertConfig(clientId, configData) {
  try {
    const db = getPrisma();
    return await db.clientConfig.upsert({
      where: { client_id: clientId },
      update: {
        welcome_message: configData.welcome_message,
        menu_options: configData.menu_options,
        bot_enabled: configData.bot_enabled !== undefined ? configData.bot_enabled : undefined,
        excluded_numbers: configData.excluded_numbers || [],
        updated_at: new Date()
      },
      create: {
        client_id: clientId,
        welcome_message: configData.welcome_message,
        menu_options: configData.menu_options,
        bot_enabled: configData.bot_enabled !== undefined ? configData.bot_enabled : false,
        excluded_numbers: configData.excluded_numbers || []
      }
    });
  } catch (error) {
    logSession(`client_${clientId}`, `⚠️ Error guardando configuración: ${error?.message || error}`);
    return null;
  }
}

/**
 * Actualiza solo el estado del bot (activado/desactivado)
 * @param {number} clientId - ID del cliente
 * @param {boolean} botEnabled - Estado del bot
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
export async function updateBotEnabled(clientId, botEnabled) {
  try {
    const db = getPrisma();
    await db.clientConfig.update({
      where: { client_id: clientId },
      data: { bot_enabled: botEnabled }
    });
    return true;
  } catch (error) {
    logSession(`client_${clientId}`, `⚠️ Error actualizando estado del bot: ${error?.message || error}`);
    return false;
  }
}

