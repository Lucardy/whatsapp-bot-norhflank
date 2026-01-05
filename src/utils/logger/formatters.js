// Formateadores de logs
import { LogLevel } from './levels.js';

const PID = process.pid;
const COLORS = {
  DEBUG: '\x1b[36m',    // Cyan
  INFO: '\x1b[32m',     // Green
  WARN: '\x1b[33m',     // Yellow
  ERROR: '\x1b[31m',    // Red
  RESET: '\x1b[0m'      // Reset
};

/**
 * Formatea un mensaje de log
 * @param {string} level - Nivel del log
 * @param {string} sessionId - ID de sesión (opcional)
 * @param {Array} args - Argumentos a loggear
 * @returns {string} Mensaje formateado
 */
export function formatLog(level, sessionId, ...args) {
  const timestamp = new Date().toISOString();
  const color = COLORS[level] || COLORS.RESET;
  const reset = COLORS.RESET;
  const levelStr = level.padEnd(5);
  
  if (sessionId) {
    return `${color}[${timestamp}] [${levelStr}] [pid ${PID}] [${sessionId}]${reset} ${args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')}`;
  }
  
  return `${color}[${timestamp}] [${levelStr}] [pid ${PID}]${reset} ${args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ')}`;
}

/**
 * Formatea un mensaje de log simple (sin colores)
 * @param {string} level - Nivel del log
 * @param {string} sessionId - ID de sesión (opcional)
 * @param {Array} args - Argumentos a loggear
 * @returns {string} Mensaje formateado
 */
export function formatLogSimple(level, sessionId, ...args) {
  const timestamp = new Date().toISOString();
  const levelStr = level.padEnd(5);
  
  if (sessionId) {
    return `[${timestamp}] [${levelStr}] [pid ${PID}] [${sessionId}] ${args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')}`;
  }
  
  return `[${timestamp}] [${levelStr}] [pid ${PID}] ${args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ')}`;
}

