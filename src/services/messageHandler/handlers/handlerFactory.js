// Factory pattern para crear y registrar handlers de mensajes
// Centraliza la creación y ejecución de handlers para mejorar extensibilidad y mantenibilidad
import { logSession } from '../../../utils/logger/index.js';

// Registro de handlers por tipo de mensaje/flujo
// Estructura: Map<handlerType, handlerFunction>
const handlers = new Map();

/**
 * Tipos de handlers disponibles en el sistema
 * @enum {string}
 */
export const HandlerType = {
  QR_RESEND: 'qr_resend',
  TRIAL: 'trial',
  CONFIGURATION: 'configuration',
  OPTION: 'option',
  WELCOME: 'welcome',
  ADMIN: 'admin'
};

/**
 * Registra un handler para un tipo específico de mensaje
 * @param {string} handlerType - Tipo de handler (ej: 'trial', 'configuration', 'qr_resend')
 * @param {Function} handlerFn - Función handler que debe retornar Promise<boolean>
 * @throws {Error} Si el handlerType ya está registrado o si handlerFn no es una función
 */
export function registerHandler(handlerType, handlerFn) {
  if (!handlerType || typeof handlerType !== 'string') {
    throw new Error('handlerType debe ser un string no vacío');
  }
  
  if (typeof handlerFn !== 'function') {
    throw new Error('handlerFn debe ser una función');
  }
  
  if (handlers.has(handlerType)) {
    logSession('system', `⚠️ Handler ${handlerType} ya estaba registrado, reemplazando...`);
  }
  
  handlers.set(handlerType, handlerFn);
  logSession('system', `📝 Handler registrado: ${handlerType}`);
}

/**
 * Obtiene un handler por tipo
 * @param {string} handlerType - Tipo de handler
 * @returns {Function|null} Handler o null si no existe
 */
export function getHandler(handlerType) {
  return handlers.get(handlerType) || null;
}

/**
 * Verifica si un handler está registrado
 * @param {string} handlerType - Tipo de handler
 * @returns {boolean} true si el handler está registrado
 */
export function hasHandler(handlerType) {
  return handlers.has(handlerType);
}

/**
 * Ejecuta un handler si está registrado
 * @param {string} handlerType - Tipo de handler
 * @param {...any} args - Argumentos para el handler
 * @returns {Promise<boolean>} true si el handler fue ejecutado y procesó el mensaje, false en caso contrario
 */
export async function executeHandler(handlerType, ...args) {
  const handler = getHandler(handlerType);
  if (!handler) {
    logSession('system', `⚠️ Handler ${handlerType} no encontrado`);
    return false;
  }
  
  try {
    const result = await handler(...args);
    // Normalizar resultado a boolean
    return Boolean(result);
  } catch (error) {
    logSession('system', `❌ Error ejecutando handler ${handlerType}: ${error?.message || error}`);
    if (error.stack) {
      logSession('system', `Stack trace: ${error.stack}`);
    }
    return false;
  }
}

/**
 * Obtiene todos los handlers registrados
 * @returns {Array<string>} Lista de tipos de handlers registrados
 */
export function getRegisteredHandlers() {
  return Array.from(handlers.keys());
}

/**
 * Elimina un handler del registro
 * @param {string} handlerType - Tipo de handler a eliminar
 * @returns {boolean} true si el handler fue eliminado, false si no existía
 */
export function unregisterHandler(handlerType) {
  const removed = handlers.delete(handlerType);
  if (removed) {
    logSession('system', `🗑️ Handler ${handlerType} eliminado del registro`);
  }
  return removed;
}

/**
 * Limpia todos los handlers registrados (útil para testing)
 */
export function clearHandlers() {
  handlers.clear();
  logSession('system', '🧹 Todos los handlers han sido eliminados');
}

