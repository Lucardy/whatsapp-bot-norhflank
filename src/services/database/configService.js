// Servicio para operaciones de configuración de clientes
import { logSession } from '../../utils/logger/index.js';
import { getPrisma } from '../../config/database.js';
import { getCachedConfig, setCachedConfig } from '../messageHandler/cache.js';

/**
 * Obtiene la configuración del cliente desde la base de datos por sessionId
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object|null>} Configuración del cliente o null
 */
export async function getClientConfig(sessionId) {
  // Intentar obtener del cache primero
  const cached = getCachedConfig(sessionId);
  if (cached) {
    return cached;
  }

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
      const config = {
        welcome_message: session.client.config.welcome_message,
        menu_options: session.client.config.menu_options,
        bot_enabled: session.client.config.bot_enabled
      };
      // Guardar en cache
      setCachedConfig(sessionId, config);
      return config;
    }
  } catch (error) {
    logSession(sessionId, '⚠️ Error obteniendo configuración de DB:', error?.message || error);
  }

  return null;
}

/**
 * Obtiene la configuración del cliente desde la base de datos por clientId
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<Object|null>} Configuración del cliente o null
 */
export async function getClientConfigById(clientId, sessionId) {
  try {
    const db = getPrisma();
    const config = await db.clientConfig.findUnique({
      where: { client_id: clientId }
    });

    if (config) {
      return {
        welcome_message: config.welcome_message,
        menu_options: config.menu_options,
        bot_enabled: config.bot_enabled
      };
    }
  } catch (error) {
    logSession(sessionId, `⚠️ Error obteniendo configuración de DB para cliente ${clientId}:`, error?.message || error);
  }

  return null;
}

/**
 * Actualiza la configuración de un cliente por sessionId
 * @param {string} sessionId - ID de la sesión
 * @param {Object} configData - Datos de configuración a actualizar
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
export async function updateClientConfig(sessionId, configData) {
  try {
    const db = getPrisma();
    const session = await db.whatsAppSession.findUnique({
      where: { session_name: sessionId },
      include: { client: true }
    });

    if (!session?.client) {
      return false;
    }

    await db.clientConfig.upsert({
      where: { client_id: session.client.id },
      update: configData,
      create: {
        client_id: session.client.id,
        ...configData
      }
    });

    // Limpiar cache para forzar recarga
    const { clearConfigCache } = await import('../messageHandler/cache.js');
    clearConfigCache(sessionId);

    return true;
  } catch (error) {
    logSession(sessionId, '⚠️ Error actualizando configuración:', error?.message || error);
    return false;
  }
}

/**
 * Actualiza la configuración de un cliente por clientId
 * @param {number} clientId - ID del cliente
 * @param {Object} configData - Datos de configuración a actualizar
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
export async function updateClientConfigById(clientId, configData, sessionId) {
  try {
    const db = getPrisma();
    
    await db.clientConfig.upsert({
      where: { client_id: clientId },
      update: configData,
      create: {
        client_id: clientId,
        bot_enabled: false, // Por defecto desactivado (cliente debe activarlo manualmente)
        ...configData
      }
    });

    // Limpiar cache de todas las sesiones de este cliente
    const { clearConfigCache } = await import('../messageHandler/cache.js');
    const { getSessionsByClientId } = await import('./sessionService.js');
    const sessions = await getSessionsByClientId(clientId);
    for (const session of sessions) {
      clearConfigCache(session.session_name);
    }

    return true;
  } catch (error) {
    logSession(sessionId, `⚠️ Error actualizando configuración para cliente ${clientId}:`, error?.message || error);
    return false;
  }
}

