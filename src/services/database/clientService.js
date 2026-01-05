// Servicio para operaciones de clientes
import { getPrisma } from '../../config/database.js';
import { logSession } from '../../utils/logger/index.js';

/**
 * Obtiene un cliente por su nombre
 * @param {string} clientName - Nombre del cliente
 * @returns {Promise<Object|null>} Cliente o null si no existe
 */
export async function getClientByName(clientName) {
  try {
    const db = getPrisma();
    return await db.client.findUnique({
      where: { name: clientName },
      include: {
        config: true,
        sessions: true
      }
    });
  } catch (error) {
    logSession(clientName, '⚠️ Error obteniendo cliente:', error?.message || error);
    return null;
  }
}

/**
 * Crea un nuevo cliente
 * @param {Object} clientData - Datos del cliente
 * @returns {Promise<Object|null>} Cliente creado o null si hubo error
 */
export async function createClient(clientData) {
  try {
    const db = getPrisma();
    return await db.client.create({
      data: clientData
    });
  } catch (error) {
    logSession(clientData.name || 'unknown', '⚠️ Error creando cliente:', error?.message || error);
    return null;
  }
}

/**
 * Actualiza el número de teléfono de un cliente
 * @param {number} clientId - ID del cliente
 * @param {string} phoneNumber - Número de teléfono
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
export async function updateClientPhone(clientId, phoneNumber) {
  try {
    const db = getPrisma();
    await db.client.update({
      where: { id: clientId },
      data: { contact_phone: phoneNumber }
    });
    return true;
  } catch (error) {
    logSession(`client_${clientId}`, '⚠️ Error actualizando teléfono del cliente:', error?.message || error);
    return false;
  }
}

/**
 * Obtiene un cliente por su ID
 * @param {number} clientId - ID del cliente
 * @returns {Promise<Object|null>} Cliente o null si no existe
 */
export async function getClientById(clientId) {
  try {
    const db = getPrisma();
    return await db.client.findUnique({
      where: { id: clientId },
      include: {
        config: true,
        sessions: true,
        plan: true
      }
    });
  } catch (error) {
    logSession(`client_${clientId}`, '⚠️ Error obteniendo cliente:', error?.message || error);
    return null;
  }
}

/**
 * Obtiene todos los clientes activos
 * @returns {Promise<Array>} Lista de clientes
 */
export async function getActiveClients() {
  try {
    const db = getPrisma();
    return await db.client.findMany({
      where: {
        status: {
          in: ['active', 'trial']
        }
      },
      include: {
        sessions: true,
        config: true
      }
    });
  } catch (error) {
    return [];
  }
}

