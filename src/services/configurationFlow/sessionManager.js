// Gestión de sesiones de configuración
import { ConfigStep } from './constants.js';

// Mapa de sesiones en modo configuración: clientId -> { step, data, phoneNumber, currentOption, lastResponseTime }
const configurationSessions = new Map();

/**
 * Crea una nueva sesión de configuración
 * @param {number} clientId - ID del cliente
 * @param {Object} config - Configuración inicial
 * @returns {Object} Sesión creada
 */
export function createSession(clientId, config) {
  const session = {
    step: ConfigStep.SELECTING_OPTION,
    phoneNumber: config.phoneNumber,
    data: {
      welcome_message: config.welcome_message || null,
      options: config.options || []
    },
    startedAt: Date.now(),
    lastResponseTime: null
  };
  
  configurationSessions.set(clientId, session);
  return session;
}

/**
 * Obtiene una sesión de configuración
 * @param {number} clientId - ID del cliente
 * @returns {Object|null} Sesión o null si no existe
 */
export function getSession(clientId) {
  return configurationSessions.get(clientId) || null;
}

/**
 * Actualiza una sesión de configuración
 * @param {number} clientId - ID del cliente
 * @param {Object} updates - Actualizaciones a aplicar
 */
export function updateSession(clientId, updates) {
  const session = configurationSessions.get(clientId);
  if (session) {
    Object.assign(session, updates);
  }
}

/**
 * Elimina una sesión de configuración
 * @param {number} clientId - ID del cliente
 */
export function deleteSession(clientId) {
  configurationSessions.delete(clientId);
}

/**
 * Verifica si un cliente está en modo configuración
 * @param {number} clientId - ID del cliente
 * @returns {boolean} true si está en modo configuración
 */
export function hasSession(clientId) {
  return configurationSessions.has(clientId);
}

/**
 * Obtiene el paso actual de configuración
 * @param {number} clientId - ID del cliente
 * @returns {string|null} Paso actual o null
 */
export function getStep(clientId) {
  const session = configurationSessions.get(clientId);
  return session?.step || null;
}

/**
 * Marca el timestamp de la última respuesta
 * @param {number} clientId - ID del cliente
 */
export function markResponseTime(clientId) {
  const session = configurationSessions.get(clientId);
  if (session) {
    session.lastResponseTime = Date.now();
  }
}

/**
 * Obtiene el timestamp de la última respuesta
 * @param {number} clientId - ID del cliente
 * @returns {number|null} Timestamp o null
 */
export function getLastResponseTime(clientId) {
  const session = configurationSessions.get(clientId);
  return session?.lastResponseTime || null;
}

