// Validación de datos - Re-exportar validadores mejorados
import { ValidationError } from './errors.js';

// Re-exportar validadores mejorados
export { validatePhoneNumber } from './validation/phoneValidator.js';
export { validateEmail } from './validation/emailValidator.js';
export { normalizePhoneNumber, normalizePhoneWithCountryCode } from './validation/phoneNormalizer.js';
export { validateBotMessage, validateOptionLabel, validateClientName } from './validation/messageValidator.js';
export { validateMenuOptions, validateClientConfig, validateJSON } from './validation/configValidator.js';
export { validateClientData, validateClientStatus } from './validation/clientValidator.js';

/**
 * Valida el nombre de una sesión
 * @param {string} sessionName - Nombre de la sesión
 * @throws {ValidationError} Si el nombre no es válido
 */
export function validateSessionName(sessionName) {
  if (!sessionName || typeof sessionName !== 'string') {
    throw new ValidationError('El nombre de sesión es requerido', 'sessionName');
  }
  
  if (sessionName.trim().length === 0) {
    throw new ValidationError('El nombre de sesión no puede estar vacío', 'sessionName');
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionName)) {
    throw new ValidationError(
      'El nombre de sesión solo puede contener letras, números, guiones y guiones bajos',
      'sessionName'
    );
  }
  
  if (sessionName.length > 50) {
    throw new ValidationError('El nombre de sesión no puede tener más de 50 caracteres', 'sessionName');
  }
  
  // Validar longitud mínima
  if (sessionName.length < 2) {
    throw new ValidationError('El nombre de sesión debe tener al menos 2 caracteres', 'sessionName');
  }
}

/**
 * Valida el tipo de sesión
 * @param {string} sessionType - Tipo de sesión
 * @throws {ValidationError} Si el tipo no es válido
 */
export function validateSessionType(sessionType) {
  const validTypes = ['master', 'client'];
  if (!validTypes.includes(sessionType)) {
    throw new ValidationError(
      `El tipo de sesión debe ser uno de: ${validTypes.join(', ')}`,
      'sessionType'
    );
  }
}

/**
 * Valida el estado de una sesión
 * @param {string} status - Estado de la sesión
 * @throws {ValidationError} Si el estado no es válido
 */
export function validateSessionStatus(status) {
  const validStatuses = ['qr_pending', 'connecting', 'connected', 'disconnected', 'error'];
  if (!validStatuses.includes(status)) {
    throw new ValidationError(
      `El estado debe ser uno de: ${validStatuses.join(', ')}`,
      'status'
    );
  }
}

// validateBotMessage ahora está en validation/messageValidator.js y se re-exporta arriba

