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
 * Valida un nombre de cliente (debe ser un nombre "real")
 * @param {string} name - Nombre a validar
 * @param {Object} options - Opciones de validación
 * @throws {ValidationError} Si el nombre no es válido
 */
export function validateClientName(name, options = {}) {
  const { maxLength = 100, minLength = 2 } = options;
  
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
  
  // Validar que tenga al menos 2 letras (no solo números o símbolos)
  const letterCount = (trimmed.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g) || []).length;
  if (letterCount < 2) {
    throw new ValidationError(
      'El nombre debe contener al menos 2 letras. No se permiten solo números o símbolos.',
      'name'
    );
  }
  
  // Validar que no sea solo números
  const onlyNumbers = /^\d+$/.test(trimmed.replace(/[\s\-'\.]/g, ''));
  if (onlyNumbers) {
    throw new ValidationError(
      'El nombre no puede ser solo números. Por favor, ingresa un nombre real.',
      'name'
    );
  }
  
  // Validar que no sea solo símbolos (permitir espacios, guiones, apostrofes y puntos para nombres como "María José", "O'Connor", etc.)
  const onlySymbols = /^[\s\-'\.]+$/.test(trimmed);
  if (onlySymbols) {
    throw new ValidationError(
      'El nombre no puede ser solo símbolos. Por favor, ingresa un nombre real.',
      'name'
    );
  }
  
  // Validar que tenga al menos una letra (ya validado arriba, pero por seguridad)
  const hasLetters = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(trimmed);
  if (!hasLetters) {
    throw new ValidationError(
      'El nombre debe contener al menos una letra',
      'name'
    );
  }
  
  // Validar que no tenga caracteres especiales raros (permitir letras, números, espacios, guiones, apostrofes, puntos y acentos)
  const hasInvalidChars = /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s\-'\.]/.test(trimmed);
  if (hasInvalidChars) {
    throw new ValidationError(
      'El nombre contiene caracteres no permitidos. Solo se permiten letras, números, espacios, guiones, apostrofes y puntos.',
      'name'
    );
  }
  
  // Validar que no tenga múltiples espacios consecutivos
  const hasMultipleSpaces = /\s{2,}/.test(trimmed);
  if (hasMultipleSpaces) {
    throw new ValidationError(
      'El nombre no puede tener múltiples espacios consecutivos',
      'name'
    );
  }
}

