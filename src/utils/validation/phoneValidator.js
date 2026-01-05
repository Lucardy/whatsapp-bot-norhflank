// Validador robusto de números de teléfono
import { ValidationError } from '../errors.js';

/**
 * Normaliza un número de teléfono removiendo espacios, guiones y otros caracteres
 * @param {string} phoneNumber - Número de teléfono a normalizar
 * @returns {string} Número normalizado
 */
export function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return '';
  }
  
  // Remover espacios, guiones, paréntesis y otros caracteres
  return phoneNumber.replace(/[\s\-\(\)\.]/g, '');
}

/**
 * Valida formato básico de número de teléfono
 * @param {string} phoneNumber - Número de teléfono
 * @returns {boolean} true si el formato es válido
 */
function isValidFormat(phoneNumber) {
  // Formato: opcional +, seguido de 10-15 dígitos
  const normalized = normalizePhoneNumber(phoneNumber);
  return /^\+?[0-9]{10,15}$/.test(normalized);
}

/**
 * Valida que el número no sea un número de prueba o inválido común
 * @param {string} phoneNumber - Número de teléfono
 * @returns {boolean} true si no es un número de prueba
 */
function isNotTestNumber(phoneNumber) {
  const normalized = normalizePhoneNumber(phoneNumber);
  const testPatterns = [
    /^1234567890+$/,  // Secuencias repetitivas
    /^0000000000+$/,  // Solo ceros
    /^1111111111+$/,  // Solo unos
    /^5555555555+$/,  // Solo cincos
  ];
  
  return !testPatterns.some(pattern => pattern.test(normalized));
}

/**
 * Valida un número de teléfono de forma robusta
 * @param {string} phoneNumber - Número de teléfono a validar
 * @param {Object} options - Opciones de validación
 * @param {boolean} options.required - Si es requerido (default: true)
 * @param {boolean} options.allowEmpty - Si permite vacío (default: false)
 * @throws {ValidationError} Si el número no es válido
 */
export function validatePhoneNumber(phoneNumber, options = {}) {
  const { required = true, allowEmpty = false } = options;
  
  // Si no es requerido y está vacío, es válido
  if (!required && (!phoneNumber || phoneNumber.trim().length === 0)) {
    return;
  }
  
  // Si permite vacío y está vacío, es válido
  if (allowEmpty && (!phoneNumber || phoneNumber.trim().length === 0)) {
    return;
  }
  
  // Validar que existe y es string
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    throw new ValidationError('El número de teléfono es requerido', 'phoneNumber');
  }
  
  const trimmed = phoneNumber.trim();
  
  if (trimmed.length === 0) {
    throw new ValidationError('El número de teléfono no puede estar vacío', 'phoneNumber');
  }
  
  // Validar formato
  if (!isValidFormat(trimmed)) {
    throw new ValidationError(
      'El número de teléfono debe tener entre 10 y 15 dígitos y puede comenzar con +',
      'phoneNumber'
    );
  }
  
  // Validar que no sea número de prueba
  if (!isNotTestNumber(trimmed)) {
    throw new ValidationError(
      'El número de teléfono parece ser un número de prueba inválido',
      'phoneNumber'
    );
  }
  
  // Validar longitud después de normalizar
  const normalized = normalizePhoneNumber(trimmed);
  if (normalized.length < 10 || normalized.length > 15) {
    throw new ValidationError(
      `El número de teléfono debe tener entre 10 y 15 dígitos (tiene ${normalized.length})`,
      'phoneNumber'
    );
  }
}

/**
 * Valida formato de email (opcional para contact_email)
 * @param {string} email - Email a validar
 * @param {Object} options - Opciones de validación
 * @param {boolean} options.required - Si es requerido (default: false)
 * @throws {ValidationError} Si el email no es válido
 */
export function validateEmail(email, options = {}) {
  const { required = false } = options;
  
  // Si no es requerido y está vacío, es válido
  if (!required && (!email || email.trim().length === 0)) {
    return;
  }
  
  if (!email || typeof email !== 'string') {
    if (required) {
      throw new ValidationError('El email es requerido', 'email');
    }
    return;
  }
  
  const trimmed = email.trim();
  
  if (trimmed.length === 0) {
    if (required) {
      throw new ValidationError('El email no puede estar vacío', 'email');
    }
    return;
  }
  
  // Validar formato básico de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new ValidationError('El email no tiene un formato válido', 'email');
  }
  
  // Validar longitud
  if (trimmed.length > 255) {
    throw new ValidationError('El email no puede tener más de 255 caracteres', 'email');
  }
}

