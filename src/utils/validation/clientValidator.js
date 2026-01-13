// Validador completo de datos de clientes
import { ValidationError } from '../errors.js';
import { validatePhoneNumber } from './phoneValidator.js';
import { validateEmail } from './emailValidator.js';
import { validateClientName } from './messageValidator.js';

/**
 * Valida el estado de un cliente
 * @param {string} status - Estado a validar
 * @throws {ValidationError} Si el estado no es válido
 */
export function validateClientStatus(status) {
  const validStatuses = ['trial', 'active', 'suspended', 'cancelled'];
  
  if (!status || typeof status !== 'string') {
    throw new ValidationError('El estado del cliente es requerido', 'status');
  }
  
  if (!validStatuses.includes(status)) {
    throw new ValidationError(
      `El estado debe ser uno de: ${validStatuses.join(', ')}`,
      'status'
    );
  }
}

/**
 * Valida datos completos de un cliente
 * @param {Object} clientData - Datos del cliente a validar
 * @param {Object} options - Opciones de validación
 * @param {boolean} options.requirePhone - Si requiere teléfono (default: false)
 * @param {boolean} options.requireEmail - Si requiere email (default: false)
 * @throws {ValidationError} Si los datos no son válidos
 */
export function validateClientData(clientData, options = {}) {
  const { requirePhone = false, requireEmail = false } = options;
  
  if (!clientData || typeof clientData !== 'object') {
    throw new ValidationError('Los datos del cliente deben ser un objeto', 'clientData');
  }
  
  // Validar nombre
  try {
    validateClientName(clientData.name);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new ValidationError(
        `Error en el nombre del cliente: ${error.message}`,
        'name'
      );
    }
    throw error;
  }
  
  // Validar teléfono
  if (clientData.contact_phone) {
    try {
      validatePhoneNumber(clientData.contact_phone, { required: requirePhone });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Error en el teléfono del cliente: ${error.message}`,
          'contact_phone'
        );
      }
      throw error;
    }
  } else if (requirePhone) {
    throw new ValidationError('El teléfono del cliente es requerido', 'contact_phone');
  }
  
  // Validar email
  if (clientData.contact_email) {
    try {
      validateEmail(clientData.contact_email, { required: requireEmail });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Error en el email del cliente: ${error.message}`,
          'contact_email'
        );
      }
      throw error;
    }
  } else if (requireEmail) {
    throw new ValidationError('El email del cliente es requerido', 'contact_email');
  }
  
  // Validar status si está presente
  if (clientData.status) {
    try {
      validateClientStatus(clientData.status);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Error en el estado del cliente: ${error.message}`,
          'status'
        );
      }
      throw error;
    }
  }
  
  // Validar plan_id si está presente (debe ser número positivo)
  if (clientData.plan_id !== undefined && clientData.plan_id !== null) {
    if (typeof clientData.plan_id !== 'number' || clientData.plan_id <= 0) {
      throw new ValidationError(
        'El ID del plan debe ser un número positivo',
        'plan_id'
      );
    }
  }
}

