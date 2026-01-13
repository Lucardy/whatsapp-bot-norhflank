// Handler para el paso QR_PHONE del flujo de prueba gratuita
// Responsabilidad única: Procesar y validar el número de teléfono para recibir el QR

import { logSession } from '../../../utils/logger/index.js';
import { PHONE_VALIDATION_PATTERN } from '../../../config/constants.js';

/**
 * Detecta si el usuario quiere recibir el QR en el mismo número
 * @param {string} message - Mensaje del usuario
 * @returns {boolean} true si quiere recibirlo en el mismo número
 */
export function wantsSameNumber(message) {
  if (!message || typeof message !== 'string') {
    return false;
  }
  
  // Normalizar el mensaje: convertir a minúsculas, quitar acentos y espacios extra
  const messageLower = message.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Lista de palabras clave (sin acentos para comparación)
  const sameNumberKeywords = [
    'aqui', 'aquí', 'este', 'mismo', 'aca', 'acá',
    'aqui mismo', 'aquí mismo', 'este numero', 'este número',
    'mismo numero', 'mismo número', 'este telefono', 'este teléfono',
    'mismo telefono', 'mismo teléfono', 'a este', 'en este',
    'este mismo', 'mismo numero', 'mismo número'
  ];
  
  // Verificar coincidencia exacta
  if (sameNumberKeywords.includes(messageLower)) {
    return true;
  }
  
  // Verificar si contiene palabras clave (para casos como "enviar aquí" o "aquí mismo")
  const keywords = ['aqui', 'aquí', 'este', 'mismo', 'aca', 'acá'];
  const words = messageLower.split(/\s+/);
  const hasKeyword = words.some(word => keywords.includes(word));
  
  return hasKeyword;
}

/**
 * Procesa cuando el usuario quiere recibir el QR en el mismo número
 * @param {Object} trialSession - Sesión de trial
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @returns {Object} Respuesta del paso
 */
export function handleSameNumber(trialSession, phoneNumber, sessionId) {
  // Usar el mismo número desde el que está hablando
  trialSession.data.qrPhoneNumber = null; // null indica que se envía al mismo número
  logSession(sessionId, `✅ QR se enviará al mismo número: ${phoneNumber}`);
  
  // Marcar que se está procesando para enviar mensaje inmediato
  trialSession.data.isProcessing = true;
  
  // Mensaje diferente según si es cliente existente o nuevo
  const isExistingClient = trialSession.data.isExistingClient || false;
  const processingMessage = isExistingClient
    ? '⏳ *Procesando...*\n\nEstamos generando el código QR para tu bot. Te lo enviaremos en un momento.'
    : '⏳ *Procesando...*\n\nEstamos creando tu bot y generando el código QR. Te avisaremos en un momento.';
  
  return {
    response: processingMessage,
    completed: false,
    cancelled: false,
    clientId: null,
    qrUrl: null,
    isProcessing: true // Flag para indicar que se debe continuar con el procesamiento
  };
}

/**
 * Normaliza y valida el número de teléfono ingresado
 * @param {string} message - Mensaje del usuario (número de teléfono)
 * @param {Object} trialSession - Sesión de trial
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<Object>} Respuesta con el número normalizado o error
 */
export async function normalizeAndValidatePhone(message, trialSession, sessionId) {
  try {
    const { normalizePhoneWithCountryCode } = await import('../../../utils/validation/phoneValidator.js');
    
    // Normalizar el número al formato estándar de WhatsApp
    const normalizedPhone = await normalizePhoneWithCountryCode(message, 'AR', sessionId);
    
    // Validar que el número normalizado tenga el formato correcto (8-15 dígitos)
    if (!PHONE_VALIDATION_PATTERN.test(normalizedPhone)) {
      return {
        response: '❌ Número de teléfono inválido.\n\nPor favor, envía un número válido o escribe "aquí" para recibirlo en este mismo número.\n\n💡 Escribe "cancelar" si quieres salir.',
        completed: false,
        cancelled: false,
        clientId: null,
        qrUrl: null,
        isValid: false
      };
    }
    
    // Guardar el número normalizado para validarlo
    trialSession.data.qrPhoneNumberPending = normalizedPhone;
    logSession(sessionId, `📱 Número ingresado: ${message} -> Normalizado: ${normalizedPhone}`);
    
    return {
      response: '🔍 *Validando número...*\n\nVerificando si este número está registrado en WhatsApp. Por favor espera un momento.',
      completed: false,
      cancelled: false,
      clientId: null,
      qrUrl: null,
      needsValidation: true, // Flag para indicar que necesita validación
      phoneToValidate: normalizedPhone,
      isValid: true
    };
  } catch (error) {
    logSession(sessionId, `⚠️ Error normalizando número: ${error?.message || error}`);
    return {
      response: '❌ Error al procesar el número de teléfono.\n\nPor favor, envía un número válido o escribe "aquí" para recibirlo en este mismo número.\n\n💡 Escribe "cancelar" si quieres salir.',
      completed: false,
      cancelled: false,
      clientId: null,
      qrUrl: null,
      isValid: false
    };
  }
}

/**
 * Procesa el paso QR_PHONE del flujo de prueba gratuita
 * @param {string} message - Mensaje del usuario (número de teléfono o "aquí")
 * @param {Object} trialSession - Sesión de trial
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<Object>} Respuesta del paso
 */
export async function handleQrPhoneStep(message, trialSession, phoneNumber, sessionId) {
  logSession(sessionId, `📱 Procesando mensaje en paso QR_PHONE: "${message}" (tipo: ${typeof message}, longitud: ${message?.length || 0})`);
  
  // Verificar si el usuario quiere recibir el QR en el mismo número
  const wantsSame = wantsSameNumber(message);
  logSession(sessionId, `🔍 wantsSameNumber("${message}") = ${wantsSame}`);
  
  if (wantsSame) {
    logSession(sessionId, `✅ Usuario quiere recibir QR en el mismo número`);
    return handleSameNumber(trialSession, phoneNumber, sessionId);
  }
  
  logSession(sessionId, `📞 Mensaje no es "aquí", intentando normalizar como número de teléfono`);
  // Normalizar y validar el número de teléfono
  return await normalizeAndValidatePhone(message, trialSession, sessionId);
}
