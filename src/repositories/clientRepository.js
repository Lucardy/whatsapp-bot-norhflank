// Repositorio para operaciones de clientes
import { getPrisma } from '../config/database.js';
import { logSession } from '../utils/logger/index.js';

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
    logSession(`client_${clientId}`, `⚠️ Error obteniendo cliente: ${error?.message || error}`);
    return null;
  }
}

/**
 * Obtiene un cliente por su nombre
 * @param {string} clientName - Nombre del cliente
 * @returns {Promise<Object|null>} Cliente o null si no existe
 */
export async function getClientByName(clientName) {
  try {
    const db = getPrisma();
    return await db.client.findFirst({
      where: { name: clientName },
      include: {
        config: true,
        sessions: true
      }
    });
  } catch (error) {
    logSession(clientName, `⚠️ Error obteniendo cliente: ${error?.message || error}`);
    return null;
  }
}

/**
 * Obtiene un cliente por su número de teléfono
 * @param {string} phoneNumber - Número de teléfono del cliente
 * @returns {Promise<Object|null>} Cliente o null si no existe
 */
export async function getClientByPhone(phoneNumber) {
  try {
    const db = getPrisma();
    const { normalizePhoneNumber } = await import('../utils/validation/phoneValidator.js');
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    
    // Buscar con diferentes variantes del número
    return await db.client.findFirst({
      where: {
        OR: [
          { contact_phone: phoneNumber },
          { contact_phone: normalizedPhone },
          { contact_phone: { contains: normalizedPhone.replace(/^54/, '') } } // Sin código de país
        ]
      },
      include: {
        sessions: {
          where: {
            session_type: 'client'
          },
          orderBy: {
            created_at: 'desc'
          }
        },
        config: true
      }
    });
  } catch (error) {
    logSession('repository', `⚠️ Error obteniendo cliente por teléfono: ${error?.message || error}`);
    return null;
  }
}

/**
 * Crea un nuevo cliente
 * @param {Object} clientData - Datos del cliente
 * @returns {Promise<Object>} Cliente creado
 * @throws {Error} Si hay un error al crear el cliente
 */
export async function createClient(clientData) {
  try {
    const db = getPrisma();
    return await db.client.create({
      data: {
        name: clientData.name,
        contact_email: clientData.contact_email || null,
        contact_phone: clientData.contact_phone || null,
        status: clientData.status || 'trial',
        plan_id: clientData.plan_id || null
      },
      include: {
        config: true,
        sessions: true
      }
    });
  } catch (error) {
    logSession('repository', `⚠️ Error creando cliente: ${error?.message || error}`);
    // Propagar el error en lugar de retornar null para que pueda ser manejado correctamente
    throw error;
  }
}

/**
 * Actualiza un cliente
 * @param {number} clientId - ID del cliente
 * @param {Object} updateData - Datos a actualizar
 * @returns {Promise<Object|null>} Cliente actualizado o null si hubo error
 */
export async function updateClient(clientId, updateData) {
  try {
    const db = getPrisma();
    return await db.client.update({
      where: { id: clientId },
      data: updateData,
      include: {
        config: true,
        sessions: true
      }
    });
  } catch (error) {
    logSession(`client_${clientId}`, `⚠️ Error actualizando cliente: ${error?.message || error}`);
    return null;
  }
}

/**
 * Obtiene todos los clientes activos
 * @returns {Promise<Array>} Lista de clientes
 */
export async function getAllActiveClients() {
  try {
    const db = getPrisma();
    return await db.client.findMany({
      where: {
        status: { in: ['trial', 'active'] }
      },
      include: {
        config: true,
        sessions: true,
        plan: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
  } catch (error) {
    logSession('repository', `⚠️ Error obteniendo clientes activos: ${error?.message || error}`);
    return [];
  }
}

