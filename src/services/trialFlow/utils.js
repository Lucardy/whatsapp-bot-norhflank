// Funciones de utilidad para el flujo de prueba gratuita
import { trialSessions } from './constants.js';

/**
 * Verifica si un usuario está en modo prueba gratuita
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @returns {boolean} true si está en modo prueba gratuita
 */
export function isInTrialFlow(phoneNumber) {
  return trialSessions.has(phoneNumber);
}

/**
 * Obtiene el paso actual del flujo de prueba gratuita
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @returns {string|null} Paso actual o null si no está en el flujo
 */
export function getTrialStep(phoneNumber) {
  const trialSession = trialSessions.get(phoneNumber);
  return trialSession ? trialSession.step : null;
}

/**
 * Cancela el flujo de prueba gratuita para un usuario
 * @param {string} phoneNumber - Número de teléfono del usuario
 */
export function cancelTrialFlow(phoneNumber) {
  trialSessions.delete(phoneNumber);
}

/**
 * Obtiene la sesión de prueba gratuita para un usuario
 * @param {string} phoneNumber - Número de teléfono del usuario (chatId usado como clave)
 * @returns {Object|null} Sesión de trial o null si no existe
 */
export function getTrialSession(phoneNumber) {
  return trialSessions.get(phoneNumber) || null;
}

