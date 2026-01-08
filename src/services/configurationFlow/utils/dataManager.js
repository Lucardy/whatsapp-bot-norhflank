// Utilidades para manejar datos de configuración

/**
 * Obtiene el número de opciones configuradas actualmente
 * @param {Object} data - Datos de configuración
 * @returns {number} Número de opciones
 */
export function getOptionCount(data) {
  if (!data.options || !Array.isArray(data.options)) {
    return 0;
  }
  return data.options.length;
}

/**
 * Actualiza una opción en los datos de configuración
 * @param {Object} data - Datos de configuración
 * @param {string} key - Clave de la opción ('1', '2', '3', etc.)
 * @param {string} message - Mensaje de la opción
 * @param {boolean} isLabel - true si es el label, false si es la respuesta
 */
export function updateOption(data, key, message, isLabel = false) {
  if (!data.options) {
    data.options = [];
  }
  
  const existingIndex = data.options.findIndex(opt => opt.key === key);
  let option;
  
  if (existingIndex >= 0) {
    option = { ...data.options[existingIndex] };
    if (isLabel) {
      option.label = message;
    } else {
      option.response = message;
    }
    data.options[existingIndex] = option;
  } else {
    option = {
      key,
      label: isLabel ? message : `Opción ${key}`,
      response: isLabel ? '' : message
    };
    data.options.push(option);
  }
}

/**
 * Obtiene el mensaje actual de una opción
 * @param {Object} data - Datos de configuración
 * @param {string} key - Clave de la opción
 * @returns {string|null} Mensaje actual o null
 */
export function getCurrentOption(data, key) {
  if (!data.options) return null;
  const option = data.options.find(opt => opt.key === key);
  return option?.response || null;
}

/**
 * Obtiene el label actual de una opción
 * @param {Object} data - Datos de configuración
 * @param {string} key - Clave de la opción
 * @returns {string|null} Label actual o null
 */
export function getCurrentLabel(data, key) {
  if (!data.options) return null;
  const option = data.options.find(opt => opt.key === key);
  return option?.label || null;
}

/**
 * Resetea todos los datos de configuración
 * @param {Object} data - Datos de configuración
 */
export function resetConfigData(data) {
  data.welcome_message = null;
  data.options = [];
}

