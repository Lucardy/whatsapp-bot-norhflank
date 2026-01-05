// Servicio para operaciones de configuración de clientes
import { logSession } from '../../utils/logger/index.js';
import { getPrisma } from '../../config/database.js';
import { getCachedConfig, setCachedConfig } from '../messageHandler/cache.js';

/**
 * Obtiene la configuración del cliente desde la base de datos
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
        menu_options: session.client.config.menu_options
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
 * Actualiza la configuración de un cliente
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

