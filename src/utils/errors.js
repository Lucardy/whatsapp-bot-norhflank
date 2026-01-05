// Clases de error personalizadas para el sistema

/**
 * Error base personalizado
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error de validación
 */
export class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

/**
 * Error de recurso no encontrado
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} no encontrado`, 404, 'NOT_FOUND');
    this.resource = resource;
  }
}

/**
 * Error de sesión
 */
export class SessionError extends AppError {
  constructor(message, sessionId = null) {
    super(message, 500, 'SESSION_ERROR');
    this.sessionId = sessionId;
  }
}

/**
 * Error de base de datos
 */
export class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

/**
 * Error de configuración
 */
export class ConfigurationError extends AppError {
  constructor(message) {
    super(message, 500, 'CONFIGURATION_ERROR');
  }
}

