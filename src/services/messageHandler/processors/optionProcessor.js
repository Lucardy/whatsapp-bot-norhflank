// Procesador de opciones válidas del menú
import { logSession } from '../../../utils/logger/index.js';
import { handleOption5, handleStandardOption } from '../handlers/optionHandlers.js';

/**
 * Procesa opciones válidas del menú (1-8)
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {string} textoLower - Texto en minúsculas
 * @param {Object} responses - Objeto con las respuestas disponibles
 * @returns {Promise<boolean>} true si el mensaje fue procesado
 */
export async function processOptions(msg, sessionId, chatId, textoLower, responses) {
  // Opción 5: Prueba gratuita (solo para master)
  if (textoLower === '5' || textoLower === 'prueba gratuita' || textoLower === 'prueba') {
    const { getSessionType } = await import('../../database/sessionService.js');
    const sessionType = await getSessionType(sessionId);
    // Solo procesar opción 5 si es master o si no hay respuesta personalizada para 5
    if (sessionType === 'master' || !responses['5']) {
      await handleOption5(msg, sessionId, chatId);
      return true;
    }
  }
  
  // Opción 6: Test de pairing code (temporal, solo para master)
  if (textoLower === '6' || textoLower === 'test pairing' || textoLower === 'test') {
    const { getSessionType } = await import('../../database/sessionService.js');
    const sessionType = await getSessionType(sessionId);
    // Solo procesar opción 6 si es master o si no hay respuesta personalizada para 6
    if (sessionType === 'master' || !responses['6']) {
      const { handleOption6 } = await import('../handlers/optionHandlers.js');
      await handleOption6(msg, sessionId, chatId);
      return true;
    }
  }
  
  // Opciones numéricas (1-8) - procesar dinámicamente
  const numericOption = parseInt(textoLower);
  if (!isNaN(numericOption) && numericOption >= 1 && numericOption <= 8) {
    // Verificar si existe respuesta personalizada para esta opción
    if (responses[textoLower]) {
      await handleStandardOption(msg, sessionId, chatId, textoLower, responses);
      return true;
    }
    // Si no hay respuesta personalizada y es opción 5 o 6, ya se procesó arriba
    // Para otras opciones sin respuesta, no hacer nada (devolver false)
    if (numericOption >= 1 && numericOption <= 4) {
      // Opciones 1-4 siempre se procesan (compatibilidad)
      await handleStandardOption(msg, sessionId, chatId, textoLower, responses);
      return true;
    }
  }
  
  return false; // No es una opción válida
}

