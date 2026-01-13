// Funciones de búsqueda en base de datos para el flujo de prueba gratuita
// NOTA: Este archivo ahora usa los repositorios para abstraer las queries
import { logSession } from '../../utils/logger/index.js';
import * as clientRepository from '../../repositories/clientRepository.js';

/**
 * Verifica si el usuario ya tiene una sesión pendiente de QR
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @returns {Promise<Object|null>} Sesión pendiente o null
 */
export async function findPendingSessionByPhone(phoneNumber) {
  try {
    const client = await clientRepository.getClientByPhone(phoneNumber);
    
    if (client && client.status === 'trial' && client.sessions && client.sessions.length > 0) {
      // Filtrar sesiones pendientes de QR
      const pendingSessions = client.sessions.filter(s => 
        s.session_type === 'client' && 
        ['qr_pending', 'connecting'].includes(s.status)
      );
      
      if (pendingSessions.length > 0) {
        return {
          client,
          session: pendingSessions[0]
        };
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Busca un cliente existente por número de teléfono
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @returns {Promise<Object|null>} Cliente con su sesión o null
 */
export async function findClientByPhone(phoneNumber) {
  return await clientRepository.getClientByPhone(phoneNumber);
}

