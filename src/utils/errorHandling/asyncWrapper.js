// Wrapper para funciones async con manejo de errores centralizado
import { handleError } from '../errorHandler.js';

/**
 * Envuelve una función async con manejo de errores centralizado
 * @param {Function} fn - Función async a envolver
 * @param {string} context - Contexto donde se ejecuta la función
 * @param {string} sessionId - ID de sesión para logging (opcional)
 * @returns {Function} Función envuelta
 */
export function asyncWithErrorHandling(fn, context, sessionId = null) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context, sessionId);
      throw error; // Re-lanzar para manejo específico si es necesario
    }
  };
}

/**
 * Ejecuta una función async con manejo de errores y retorna un resultado seguro
 * @param {Function} fn - Función async a ejecutar
 * @param {string} context - Contexto donde se ejecuta la función
 * @param {string} sessionId - ID de sesión para logging (opcional)
 * @param {*} defaultValue - Valor por defecto si hay error
 * @returns {Promise<*>} Resultado de la función o defaultValue si hay error
 */
export async function safeAsync(fn, context, sessionId = null, defaultValue = null) {
  try {
    return await fn();
  } catch (error) {
    handleError(error, context, sessionId);
    return defaultValue;
  }
}

