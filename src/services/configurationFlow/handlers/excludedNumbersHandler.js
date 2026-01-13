// Handler para gestionar números de excepción
import { ConfigStep } from '../constants.js';
import { getSession, updateSession } from '../sessionManager.js';
import { buildResponse } from '../utils/responseBuilder.js';
import { logSession } from '../../../utils/logger/index.js';
import { returnToSelectionMenu } from '../navigation.js';
import { normalizePhoneNumber } from '../../../utils/validation/phoneValidator.js';
import { PHONE_VALIDATION_PATTERN } from '../../../config/constants.js';

/**
 * Maneja la gestión de números de excepción
 * @param {number} clientId - ID del cliente
 * @param {string} message - Mensaje del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta
 */
export async function handleExcludedNumbers(clientId, message, sessionId) {
  const configSession = getSession(clientId);
  if (!configSession) {
    return buildResponse(clientId, null, false, false);
  }
  
  const messageLower = message.toLowerCase().trim();
  
  // Inicializar excluded_numbers si no existe
  if (!configSession.data.excluded_numbers) {
    configSession.data.excluded_numbers = [];
  }
  
  // Comandos especiales
  if (messageLower === 'listar' || messageLower === 'lista' || messageLower === 'ver') {
    return showExcludedNumbersList(clientId, sessionId);
  }
  
  if (messageLower === 'limpiar' || messageLower === 'eliminar todos') {
    configSession.data.excluded_numbers = [];
    updateSession(clientId, { data: configSession.data });
    return buildResponse(clientId, `✅ *Lista de números de excepción limpiada*\n\nYa no hay números excluidos.\n\n💡 Escribe un número para agregarlo, "listar" para ver la lista, o "volver" para regresar al menú.`, false, false);
  }
  
  if (messageLower === 'volver' || messageLower === 'menu' || messageLower === 'menú') {
    return await returnToSelectionMenu(clientId, sessionId);
  }
  
  // Intentar parsear como número de teléfono
  const cleanPhone = message.trim().replace(/[\s\-\(\)]/g, '');
  
  if (!PHONE_VALIDATION_PATTERN.test(cleanPhone)) {
    return buildResponse(clientId, `❌ *Número inválido*\n\nPor favor, envía un número de teléfono válido (8-15 dígitos).\n\n💡 *Ejemplo:* 5491169956253\n\n💡 *Comandos disponibles:*\n• "listar" - Ver números excluidos\n• "limpiar" - Eliminar todos\n• "volver" - Regresar al menú`, false, false);
  }
  
  // Normalizar el número
  let normalizedPhone;
  try {
    normalizedPhone = await normalizePhoneNumber(cleanPhone);
  } catch (err) {
    logSession(sessionId, `⚠️ Error normalizando número: ${err?.message || err}`);
    normalizedPhone = cleanPhone; // Usar el número sin normalizar como fallback
  }
  
  const excludedNumbers = configSession.data.excluded_numbers || [];
  const phoneIndex = excludedNumbers.indexOf(normalizedPhone);
  
  if (phoneIndex >= 0) {
    // El número ya está en la lista, eliminarlo
    excludedNumbers.splice(phoneIndex, 1);
    configSession.data.excluded_numbers = excludedNumbers;
    updateSession(clientId, { data: configSession.data });
    
    return buildResponse(clientId, `✅ *Número eliminado de la lista de excepciones*\n\n📱 ${normalizedPhone}\n\nEl bot ahora responderá a este número.\n\n💡 Escribe otro número para agregarlo o quitar, "listar" para ver la lista, o "volver" para regresar al menú.`, false, false);
  } else {
    // Agregar el número a la lista
    excludedNumbers.push(normalizedPhone);
    configSession.data.excluded_numbers = excludedNumbers;
    updateSession(clientId, { data: configSession.data });
    
    return buildResponse(clientId, `✅ *Número agregado a la lista de excepciones*\n\n📱 ${normalizedPhone}\n\nEl bot NO responderá a este número.\n\n💡 Escribe otro número para agregarlo o quitar, "listar" para ver la lista, o "volver" para regresar al menú.`, false, false);
  }
}

/**
 * Muestra la lista de números de excepción
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Object} Respuesta
 */
function showExcludedNumbersList(clientId, sessionId) {
  const configSession = getSession(clientId);
  if (!configSession) {
    return buildResponse(clientId, null, false, false);
  }
  
  const excludedNumbers = configSession.data.excluded_numbers || [];
  
  if (excludedNumbers.length === 0) {
    return buildResponse(clientId, `📋 *Lista de Números de Excepción*\n\nNo hay números excluidos.\n\n💡 Escribe un número para agregarlo, o "volver" para regresar al menú.`, false, false);
  }
  
  let listMessage = `📋 *Lista de Números de Excepción*\n\n`;
  excludedNumbers.forEach((phone, index) => {
    listMessage += `${index + 1}️⃣ ${phone}\n`;
  });
  
  listMessage += `\n💡 *Para quitar un número, escríbelo nuevamente.*\n💡 Escribe "limpiar" para eliminar todos, o "volver" para regresar al menú.`;
  
  return buildResponse(clientId, listMessage, false, false);
}

