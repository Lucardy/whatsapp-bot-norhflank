// Niveles de logging
export const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// Nivel actual (configurable por variable de entorno)
const currentLevel = LogLevel[process.env.LOG_LEVEL?.toUpperCase()] ?? LogLevel.INFO;

/**
 * Verifica si un nivel debe ser loggeado
 * @param {number} level - Nivel a verificar
 * @returns {boolean} true si debe loggearse
 */
export function shouldLog(level) {
  return level >= currentLevel;
}

/**
 * Obtiene el nivel actual de logging
 * @returns {number} Nivel actual
 */
export function getCurrentLevel() {
  return currentLevel;
}

/**
 * Establece el nivel de logging
 * @param {number} level - Nuevo nivel
 */
export function setLogLevel(level) {
  if (level >= LogLevel.DEBUG && level <= LogLevel.NONE) {
    currentLevel = level;
  }
}

