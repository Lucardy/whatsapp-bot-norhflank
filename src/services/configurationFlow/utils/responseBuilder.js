// Constructor de respuestas con timestamp automático
import { markResponseTime } from '../sessionManager.js';

/**
 * Construye una respuesta marcando automáticamente el timestamp
 * @param {number} clientId - ID del cliente
 * @param {string} response - Mensaje de respuesta
 * @param {boolean} completed - Si la configuración está completada
 * @param {boolean} cancelled - Si fue cancelada
 * @returns {Object} Objeto de respuesta
 */
export function buildResponse(clientId, response, completed = false, cancelled = false) {
  const responseObj = {
    response,
    completed,
    cancelled
  };
  
  // Marcar timestamp si hay respuesta
  if (response) {
    markResponseTime(clientId);
  }
  
  return responseObj;
}

