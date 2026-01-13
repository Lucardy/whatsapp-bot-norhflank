// Validador de emails
// Responsabilidad única: Validar formatos de email

import { ValidationError } from '../errors.js';

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
