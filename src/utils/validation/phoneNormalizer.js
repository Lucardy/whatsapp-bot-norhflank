// Normalizador de números de teléfono
// Responsabilidad única: Convertir números de teléfono a formato estándar

/**
 * Normaliza un número de teléfono removiendo espacios, guiones y otros caracteres
 * @param {string} phoneNumber - Número de teléfono a normalizar
 * @returns {string} Número normalizado (solo dígitos)
 */
export function normalizePhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return '';
  }
  
  // Remover +, espacios, guiones, paréntesis, puntos y otros caracteres no numéricos
  return phoneNumber.replace(/[^\d]/g, '');
}

/**
 * Normaliza un número de teléfono al formato estándar de WhatsApp (5492665285510)
 * Maneja múltiples formatos de entrada y los convierte al formato correcto
 * 
 * Formatos soportados:
 * - +5492665285510 -> 5492665285510
 * - 5492665285510 -> 5492665285510
 * - +541166122508 -> 5491166122508
 * - 1166122508 -> 5491166122508
 * - 2665285510 -> 5492665285510
 * - 54911-6612-2508 -> 5491166122508
 * - +549116612-2508 -> 5491166122508
 * 
 * @param {string} phoneNumber - Número de teléfono en cualquier formato
 * @param {string} defaultCountry - Código de país por defecto ('AR' para Argentina, 'CL' para Chile)
 * @param {string} sessionId - ID de la sesión para logging (opcional)
 * @returns {Promise<string>} Número normalizado en formato WhatsApp (5492665285510)
 */
export async function normalizePhoneWithCountryCode(phoneNumber, defaultCountry = 'AR', sessionId = null) {
  const { ValidationError } = await import('../errors.js');
  const { logSession } = await import('../../utils/logger/index.js');
  const logger = sessionId ? (msg) => logSession(sessionId, msg) : () => {};
  
  // Paso 1: Remover todos los caracteres no numéricos (+, espacios, guiones, etc.)
  let normalizedPhone = normalizePhoneNumber(phoneNumber);
  
  if (!normalizedPhone || normalizedPhone.length === 0) {
    throw new ValidationError('El número de teléfono no puede estar vacío', 'phoneNumber');
  }
  
  logger(`📱 Normalizando número: ${phoneNumber} -> ${normalizedPhone} (${normalizedPhone.length} dígitos)`);
  
  // Paso 2: Detectar y normalizar según diferentes formatos
  const ARGENTINA_COUNTRY_CODE = '54';
  const CHILE_COUNTRY_CODE = '56';
  
  // Si ya tiene código de país 54 (Argentina)
  if (normalizedPhone.startsWith('54')) {
    // Verificar que tenga el formato correcto (54 + código de área + número)
    // Los números argentinos con código de país suelen tener 12-13 dígitos
    if (normalizedPhone.length >= 12 && normalizedPhone.length <= 13) {
      logger(`✅ Número argentino detectado con código de país: ${normalizedPhone}`);
      return normalizedPhone;
    }
  }
  
  // Si tiene código de país 56 (Chile)
  if (normalizedPhone.startsWith('56')) {
    logger(`📱 Detectado número chileno (código 56): ${normalizedPhone}`);
    return normalizedPhone;
  }
  
  // Paso 3: Detectar códigos de área comunes de Argentina
  // Códigos de área comunes: 11 (Buenos Aires), 2665 (San Luis), 261 (Mendoza), etc.
  const argentinaAreaCodes = [
    '11', '221', '223', '224', '226', '230', '236', '237', '239', '240',
    '260', '261', '262', '263', '264', '265', '266', '2665', '2666', '2667',
    '280', '290', '291', '292', '294', '296', '297', '298', '299',
    '340', '341', '342', '343', '345', '346', '347', '348', '349',
    '351', '352', '353', '354', '356', '357', '358', '362', '364',
    '370', '371', '372', '373', '375', '376', '377', '378', '379',
    '380', '381', '382', '383', '385', '387', '388', '389',
    '391', '392', '394', '395', '396', '397', '398'
  ];
  
  // Detectar si empieza con código de área argentino
  let detectedAreaCode = null;
  for (const areaCode of argentinaAreaCodes.sort((a, b) => b.length - a.length)) {
    if (normalizedPhone.startsWith(areaCode)) {
      detectedAreaCode = areaCode;
      break;
    }
  }
  
  // Paso 4: Normalizar según el formato detectado
  if (detectedAreaCode) {
    // Tiene código de área argentino, agregar código de país 54
    logger(`📱 Código de área argentino detectado: ${detectedAreaCode}`);
    normalizedPhone = ARGENTINA_COUNTRY_CODE + normalizedPhone;
    logger(`✅ Número normalizado: ${normalizedPhone}`);
    return normalizedPhone;
  }
  
  // Paso 5: Si el número empieza con 9 (formato argentino común: 9 + código de área + número)
  if (normalizedPhone.startsWith('9') && normalizedPhone.length >= 10) {
    // Formato: 9 + código de área + número (ej: 91166122508)
    logger(`📱 Formato argentino detectado (empieza con 9): ${normalizedPhone}`);
    normalizedPhone = ARGENTINA_COUNTRY_CODE + normalizedPhone;
    logger(`✅ Número normalizado: ${normalizedPhone}`);
    return normalizedPhone;
  }
  
  // Paso 6: Si el número tiene 8-10 dígitos, probablemente es un número local argentino
  if (normalizedPhone.length >= 8 && normalizedPhone.length <= 10) {
    // Asumir que es argentino y agregar código de país
    const countryCode = defaultCountry === 'CL' ? CHILE_COUNTRY_CODE : ARGENTINA_COUNTRY_CODE;
    logger(`📱 Número local detectado (${normalizedPhone.length} dígitos), agregando código de país ${countryCode}`);
    normalizedPhone = countryCode + '9' + normalizedPhone; // Agregar 9 (prefijo móvil argentino)
    logger(`✅ Número normalizado: ${normalizedPhone}`);
    return normalizedPhone;
  }
  
  // Paso 7: Si tiene 11-13 dígitos y empieza con 5, puede ser un número con código de país
  if (normalizedPhone.length >= 11 && normalizedPhone.length <= 13 && normalizedPhone.startsWith('5')) {
    logger(`📱 Número con posible código de país detectado: ${normalizedPhone}`);
    // Verificar si es un código de país válido
    if (normalizedPhone.startsWith('54') || normalizedPhone.startsWith('56')) {
      return normalizedPhone;
    }
    // Si no, asumir que es argentino
    logger(`📱 Asumiendo número argentino, agregando código 54`);
    normalizedPhone = ARGENTINA_COUNTRY_CODE + normalizedPhone;
    return normalizedPhone;
  }
  
  // Paso 8: Por defecto, agregar código de país según defaultCountry
  const countryCode = defaultCountry === 'CL' ? CHILE_COUNTRY_CODE : ARGENTINA_COUNTRY_CODE;
  if (!normalizedPhone.startsWith(countryCode)) {
    // Si no empieza con 9, agregarlo (prefijo móvil argentino)
    if (countryCode === ARGENTINA_COUNTRY_CODE && !normalizedPhone.startsWith('9')) {
      normalizedPhone = countryCode + '9' + normalizedPhone;
    } else {
      normalizedPhone = countryCode + normalizedPhone;
    }
    logger(`📱 Agregado código de país ${countryCode} (${defaultCountry === 'CL' ? 'Chile' : 'Argentina'})`);
  }
  
  logger(`✅ Número final normalizado: ${normalizedPhone}`);
  return normalizedPhone;
}
