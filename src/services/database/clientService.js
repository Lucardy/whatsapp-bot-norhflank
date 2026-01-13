// Servicio para operaciones de clientes
// NOTA: Este servicio ahora usa los repositorios para abstraer las queries
import * as clientRepository from '../../repositories/clientRepository.js';
import { logSession } from '../../utils/logger/index.js';

/**
 * Obtiene un cliente por su nombre
 * @param {string} clientName - Nombre del cliente
 * @returns {Promise<Object|null>} Cliente o null si no existe
 */
export async function getClientByName(clientName) {
  return await clientRepository.getClientByName(clientName);
}

/**
 * Crea un nuevo cliente
 * @param {Object} clientData - Datos del cliente
 * @returns {Promise<Object>} Cliente creado
 * @throws {Error} Si hay un error al crear el cliente
 */
export async function createClient(clientData) {
  return await clientRepository.createClient(clientData);
}

/**
 * Actualiza el número de teléfono de un cliente
 * @param {number} clientId - ID del cliente
 * @param {string} phoneNumber - Número de teléfono
 * @returns {Promise<boolean>} true si se actualizó correctamente
 */
export async function updateClientPhone(clientId, phoneNumber) {
  try {
    // Validar que el número sea un número real, no un ID largo de WhatsApp
    const { PHONE_VALIDATION_PATTERN } = await import('../../config/constants.js');
    const cleanPhone = phoneNumber ? phoneNumber.replace(/[^0-9]/g, '') : '';
    
    if (!cleanPhone || !PHONE_VALIDATION_PATTERN.test(cleanPhone)) {
      logSession(`client_${clientId}`, `⚠️ Número inválido o ID largo detectado (${phoneNumber}), no se actualizará`);
      return false;
    }

    const { getPrisma } = await import('../../config/database.js');
    const db = getPrisma();
    await db.client.update({
      where: { id: clientId },
      data: { contact_phone: cleanPhone }
    });
    logSession(`client_${clientId}`, `✅ Número de teléfono actualizado: ${cleanPhone}`);
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
  return await clientRepository.getClientById(clientId);
}

/**
 * Obtiene todos los clientes activos
 * @returns {Promise<Array>} Lista de clientes
 */
export async function getActiveClients() {
  return await clientRepository.getAllActiveClients();
}

