// Servicio para operaciones de configuración de clientes
// NOTA: Este servicio ahora usa los repositorios para abstraer las queries
import { logSession } from '../../utils/logger/index.js';
import * as configRepository from '../../repositories/configRepository.js';
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

  const config = await configRepository.getConfigBySessionId(sessionId);
  if (config) {
    // Guardar en cache
    setCachedConfig(sessionId, config);
  }
  return config;
}

/**
 * Obtiene la configuración del cliente desde la base de datos por clientId
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<Object|null>} Configuración del cliente o null
 */
export async function getClientConfigById(clientId, sessionId) {
  return await configRepository.getConfigByClientId(clientId);
}

/**
 * Actualiza la configuración de un cliente por sessionId
 * @param {string} sessionId - ID de la sesión
 * @param {Object} configData - Datos de configuración a actualizar
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
export async function updateClientConfig(sessionId, configData) {
  try {
    const { getSessionByName } = await import('./sessionService.js');
    const session = await getSessionByName(sessionId);

    if (!session?.client) {
      return false;
    }

    const result = await configRepository.upsertConfig(session.client.id, configData);
    
    if (result) {
      // Limpiar cache para forzar recarga
      const { clearConfigCache } = await import('../messageHandler/cache.js');
      clearConfigCache(sessionId);
      return true;
    }
    return false;
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
    const result = await configRepository.upsertConfig(clientId, {
      ...configData,
      bot_enabled: configData.bot_enabled !== undefined ? configData.bot_enabled : false
    });

    if (result) {
      // Limpiar cache de todas las sesiones de este cliente
      const { clearConfigCache } = await import('../messageHandler/cache.js');
      const { getSessionsByClientId } = await import('./sessionService.js');
      const sessions = await getSessionsByClientId(clientId);
      for (const session of sessions) {
        clearConfigCache(session.session_name);
      }
      return true;
    }
    return false;
  } catch (error) {
    logSession(sessionId, `⚠️ Error actualizando configuración para cliente ${clientId}:`, error?.message || error);
    return false;
  }
}

