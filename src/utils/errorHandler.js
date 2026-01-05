// Manejo centralizado de errores
import { log, logSession } from './logger/index.js';
import { AppError } from './errors.js';

/**
 * Maneja errores y los formatea para logging
 * @param {Error} error - Error a manejar
 * @param {string} context - Contexto donde ocurrió el error
 * @param {string} sessionId - ID de sesión (opcional)
 */
export function handleError(error, context = 'Unknown', sessionId = null) {
  const logger = sessionId ? (msg, ...args) => logSession(sessionId, msg, ...args) : log;
  
  if (error instanceof AppError) {
    logger(`⚠️ [${error.code}] ${context}: ${error.message}`);
    if (error.originalError) {
      logger(`   Original: ${error.originalError.message}`);
    }
  } else {
    logger(`❌ ${context}: ${error?.message || error}`);
    if (error?.stack) {
      logger(`   Stack: ${error.stack}`);
    }
  }
}

/**
 * Middleware de Express para manejo de errores
 * @param {Error} err - Error
 * @param {Object} req - Request
 * @param {Object} res - Response
 * @param {Function} next - Next
 */
export function errorMiddleware(err, req, res, next) {
  handleError(err, `HTTP ${req.method} ${req.path}`);
  
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      ok: false,
      error: err.message,
      code: err.code
    });
  }
  
  // Error no manejado
  res.status(500).json({
    ok: false,
    error: 'Error interno del servidor',
    code: 'INTERNAL_ERROR'
  });
}

/**
 * Wrapper para funciones async que maneja errores automáticamente
 * @param {Function} fn - Función async
 * @returns {Function} Función envuelta
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

