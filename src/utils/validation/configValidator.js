// Validador de configuraciones del bot
import { ValidationError } from '../errors.js';
import { validateBotMessage, validateOptionLabel } from './messageValidator.js';

/**
 * Valida la estructura de opciones del menú
 * @param {Array} options - Array de opciones del menú
 * @throws {ValidationError} Si las opciones no son válidas
 */
export function validateMenuOptions(options) {
  if (!Array.isArray(options)) {
    throw new ValidationError('Las opciones del menú deben ser un array', 'menuOptions');
  }
  
  if (options.length === 0) {
    throw new ValidationError('Debe haber al menos una opción en el menú', 'menuOptions');
  }
  
  if (options.length > 10) {
    throw new ValidationError('No puede haber más de 10 opciones en el menú', 'menuOptions');
  }
  
  // Validar cada opción
  const usedKeys = new Set();
  
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    
    if (!option || typeof option !== 'object') {
      throw new ValidationError(
        `La opción ${i + 1} debe ser un objeto`,
        'menuOptions'
      );
    }
    
    // Validar key (número de opción)
    if (!option.key || typeof option.key !== 'string') {
      throw new ValidationError(
        `La opción ${i + 1} debe tener una clave (key)`,
        'menuOptions'
      );
    }
    
    // Validar que la key sea única
    if (usedKeys.has(option.key)) {
      throw new ValidationError(
        `La clave "${option.key}" está duplicada en las opciones`,
        'menuOptions'
      );
    }
    usedKeys.add(option.key);
    
    // Validar que la key sea un número válido (1-9)
    if (!/^[1-9]$/.test(option.key)) {
      throw new ValidationError(
        `La clave de la opción ${i + 1} debe ser un número del 1 al 9`,
        'menuOptions'
      );
    }
    
    // Validar label
    if (!option.label || typeof option.label !== 'string') {
      throw new ValidationError(
        `La opción ${i + 1} debe tener una etiqueta (label)`,
        'menuOptions'
      );
    }
    
    try {
      validateOptionLabel(option.label);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Error en la etiqueta de la opción ${i + 1}: ${error.message}`,
          'menuOptions'
        );
      }
      throw error;
    }
    
    // Validar response
    if (!option.response || typeof option.response !== 'string') {
      throw new ValidationError(
        `La opción ${i + 1} debe tener una respuesta (response)`,
        'menuOptions'
      );
    }
    
    try {
      validateBotMessage(option.response);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Error en la respuesta de la opción ${i + 1}: ${error.message}`,
          'menuOptions'
        );
      }
      throw error;
    }
  }
}

/**
 * Valida una configuración completa de cliente
 * @param {Object} config - Configuración a validar
 * @param {Object} options - Opciones de validación
 * @param {boolean} options.requireWelcome - Si requiere mensaje de bienvenida (default: true)
 * @param {boolean} options.requireOptions - Si requiere opciones del menú (default: true)
 * @throws {ValidationError} Si la configuración no es válida
 */
export function validateClientConfig(config, options = {}) {
  const { requireWelcome = true, requireOptions = true } = options;
  
  if (!config || typeof config !== 'object') {
    throw new ValidationError('La configuración debe ser un objeto', 'config');
  }
  
  // Validar welcome_message
  if (requireWelcome) {
    if (!config.welcome_message || typeof config.welcome_message !== 'string') {
      throw new ValidationError('El mensaje de bienvenida es requerido', 'welcome_message');
    }
    
    try {
      validateBotMessage(config.welcome_message);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Error en el mensaje de bienvenida: ${error.message}`,
          'welcome_message'
        );
      }
      throw error;
    }
  } else if (config.welcome_message) {
    // Si no es requerido pero está presente, validarlo
    try {
      validateBotMessage(config.welcome_message, { required: false });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(
          `Error en el mensaje de bienvenida: ${error.message}`,
          'welcome_message'
        );
      }
      throw error;
    }
  }
  
  // Validar menu_options
  if (requireOptions) {
    if (!config.menu_options) {
      throw new ValidationError('Las opciones del menú son requeridas', 'menuOptions');
    }
    
    // Si es un array vacío y es requerido, lanzar error
    if (Array.isArray(config.menu_options) && config.menu_options.length === 0) {
      throw new ValidationError('Debe haber al menos una opción en el menú', 'menuOptions');
    }
    
    validateMenuOptions(config.menu_options);
  } else if (config.menu_options && Array.isArray(config.menu_options) && config.menu_options.length > 0) {
    // Si no es requerido pero está presente y no está vacío, validarlo
    validateMenuOptions(config.menu_options);
  }
}

/**
 * Valida que un JSON sea válido y tenga la estructura esperada
 * @param {string} jsonString - String JSON a validar
 * @param {Function} structureValidator - Función que valida la estructura
 * @throws {ValidationError} Si el JSON no es válido
 */
export function validateJSON(jsonString, structureValidator = null) {
  if (!jsonString || typeof jsonString !== 'string') {
    throw new ValidationError('El JSON debe ser un string', 'json');
  }
  
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    throw new ValidationError(
      `El JSON no es válido: ${error.message}`,
      'json'
    );
  }
  
  // Si hay un validador de estructura, usarlo
  if (structureValidator) {
    try {
      structureValidator(parsed);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Error en la estructura del JSON: ${error.message}`,
        'json'
      );
    }
  }
  
  return parsed;
}

