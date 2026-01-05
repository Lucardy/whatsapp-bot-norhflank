// Validador robusto de mensajes del bot
import { ValidationError } from '../errors.js';
import { MIN_MESSAGE_LENGTH, MAX_MESSAGE_LENGTH } from '../../config/constants.js';

/**
 * Valida un mensaje del bot de forma robusta
 * @param {string} message - Mensaje a validar
 * @param {Object} options - Opciones de validación
 * @param {number} options.minLength - Longitud mínima (default: MIN_MESSAGE_LENGTH)
 * @param {number} options.maxLength - Longitud máxima (default: MAX_MESSAGE_LENGTH)
 * @param {boolean} options.required - Si es requerido (default: true)
 * @param {boolean} options.allowEmpty - Si permite vacío (default: false)
 * @throws {ValidationError} Si el mensaje no es válido
 */
export function validateBotMessage(message, options = {}) {
  const {
    minLength = MIN_MESSAGE_LENGTH,
    maxLength = MAX_MESSAGE_LENGTH,
    required = true,
    allowEmpty = false
  } = options;
  
  // Si no es requerido y está vacío, es válido
  if (!required && (!message || message.trim().length === 0)) {
    return;
  }
  
  // Si permite vacío y está vacío, es válido
  if (allowEmpty && (!message || message.trim().length === 0)) {
    return;
  }
  
  // Validar que existe y es string
  if (!message || typeof message !== 'string') {
    throw new ValidationError('El mensaje es requerido', 'message');
  }
  
  const trimmed = message.trim();
  
  if (trimmed.length === 0) {
    throw new ValidationError('El mensaje no puede estar vacío', 'message');
  }
  
  // Validar longitud mínima
  if (trimmed.length < minLength) {
    throw new ValidationError(
      `El mensaje debe tener al menos ${minLength} caracteres (tiene ${trimmed.length})`,
      'message'
    );
  }
  
  // Validar longitud máxima
  if (trimmed.length > maxLength) {
    throw new ValidationError(
      `El mensaje no puede tener más de ${maxLength} caracteres (tiene ${trimmed.length})`,
      'message'
    );
  }
  
  // Validar que no sea solo espacios o caracteres especiales
  const hasContent = /[a-zA-Z0-9]/.test(trimmed);
  if (!hasContent) {
    throw new ValidationError(
      'El mensaje debe contener al menos una letra o número',
      'message'
    );
  }
  
  // Validar que no tenga caracteres de control (excepto \n, \r, \t)
  const hasControlChars = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(message);
  if (hasControlChars) {
    throw new ValidationError(
      'El mensaje contiene caracteres de control inválidos',
      'message'
    );
  }
}

/**
 * Valida una etiqueta (label) de opción del menú
 * @param {string} label - Etiqueta a validar
 * @param {Object} options - Opciones de validación
 * @throws {ValidationError} Si la etiqueta no es válida
 */
export function validateOptionLabel(label, options = {}) {
  const { maxLength = 100 } = options;
  
  if (!label || typeof label !== 'string') {
    throw new ValidationError('La etiqueta de la opción es requerida', 'label');
  }
  
  const trimmed = label.trim();
  
  if (trimmed.length === 0) {
    throw new ValidationError('La etiqueta de la opción no puede estar vacía', 'label');
  }
  
  if (trimmed.length > maxLength) {
    throw new ValidationError(
      `La etiqueta no puede tener más de ${maxLength} caracteres (tiene ${trimmed.length})`,
      'label'
    );
  }
  
  if (trimmed.length < 2) {
    throw new ValidationError(
      'La etiqueta debe tener al menos 2 caracteres',
      'label'
    );
  }
}

/**
 * Valida un nombre de cliente
 * @param {string} name - Nombre a validar
 * @param {Object} options - Opciones de validación
 * @throws {ValidationError} Si el nombre no es válido
 */
export function validateClientName(name, options = {}) {
  const { maxLength = 255, minLength = 2 } = options;
  
  if (!name || typeof name !== 'string') {
    throw new ValidationError('El nombre del cliente es requerido', 'name');
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    throw new ValidationError('El nombre del cliente no puede estar vacío', 'name');
  }
  
  if (trimmed.length < minLength) {
    throw new ValidationError(
      `El nombre debe tener al menos ${minLength} caracteres (tiene ${trimmed.length})`,
      'name'
    );
  }
  
  if (trimmed.length > maxLength) {
    throw new ValidationError(
      `El nombre no puede tener más de ${maxLength} caracteres (tiene ${trimmed.length})`,
      'name'
    );
  }
  
  // Validar que no sea solo espacios o caracteres especiales
  const hasContent = /[a-zA-Z0-9]/.test(trimmed);
  if (!hasContent) {
    throw new ValidationError(
      'El nombre debe contener al menos una letra o número',
      'name'
    );
  }
}

