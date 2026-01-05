// Gestión de datos de configuración
/**
 * Actualiza una opción en los datos de configuración
 * @param {Object} data - Datos de configuración
 * @param {string} key - Clave de la opción ('1', '2', '3', '4')
 * @param {string} message - Mensaje de la opción
 * @param {boolean} isLabel - Si es true, actualiza el label; si es false, actualiza la respuesta
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

