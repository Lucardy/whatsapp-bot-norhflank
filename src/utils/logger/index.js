// Sistema de logging mejorado con niveles
import { LogLevel, shouldLog } from './levels.js';
import { formatLog } from './formatters.js';

/**
 * Log de debug (información detallada para desarrollo)
 * @param {...any} args - Argumentos a loggear
 */
export function debug(...args) {
  if (shouldLog(LogLevel.DEBUG)) {
    console.log(formatLog('DEBUG', null, ...args));
  }
}

/**
 * Log de información general
 * @param {...any} args - Argumentos a loggear
 */
export function log(...args) {
  if (shouldLog(LogLevel.INFO)) {
    console.log(formatLog('INFO', null, ...args));
  }
}

/**
 * Log de advertencia
 * @param {...any} args - Argumentos a loggear
 */
export function warn(...args) {
  if (shouldLog(LogLevel.WARN)) {
    console.warn(formatLog('WARN', null, ...args));
  }
}

/**
 * Log de error
 * @param {...any} args - Argumentos a loggear
 */
export function error(...args) {
  if (shouldLog(LogLevel.ERROR)) {
    console.error(formatLog('ERROR', null, ...args));
  }
}

/**
 * Log de sesión con nivel debug
 * @param {string} sessionId - ID de la sesión
 * @param {...any} args - Argumentos a loggear
 */
export function debugSession(sessionId, ...args) {
  if (shouldLog(LogLevel.DEBUG)) {
    console.log(formatLog('DEBUG', sessionId, ...args));
  }
}

/**
 * Log de sesión con nivel info
 * @param {string} sessionId - ID de la sesión
 * @param {...any} args - Argumentos a loggear
 */
export function logSession(sessionId, ...args) {
  if (shouldLog(LogLevel.INFO)) {
    console.log(formatLog('INFO', sessionId, ...args));
  }
}

/**
 * Log de sesión con nivel warn
 * @param {string} sessionId - ID de la sesión
 * @param {...any} args - Argumentos a loggear
 */
export function warnSession(sessionId, ...args) {
  if (shouldLog(LogLevel.WARN)) {
    console.warn(formatLog('WARN', sessionId, ...args));
  }
}

/**
 * Log de sesión con nivel error
 * @param {string} sessionId - ID de la sesión
 * @param {...any} args - Argumentos a loggear
 */
export function errorSession(sessionId, ...args) {
  if (shouldLog(LogLevel.ERROR)) {
    console.error(formatLog('ERROR', sessionId, ...args));
  }
}

// Exportar niveles para uso externo
export { LogLevel, shouldLog, getCurrentLevel, setLogLevel } from './levels.js';

