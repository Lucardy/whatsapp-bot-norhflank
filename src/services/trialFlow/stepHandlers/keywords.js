// Manejo de palabras clave globales del flujo de prueba gratuita
// Responsabilidad única: Detectar y procesar palabras clave que funcionan en cualquier paso

import { logSession } from '../../../utils/logger/index.js';
import { trialSessions } from '../constants.js';
import { getContextualHelp } from './helpMessages.js';

/**
 * Detecta si el mensaje es una palabra clave de ayuda
 * @param {string} message - Mensaje del usuario
 * @returns {boolean} true si es una palabra clave de ayuda
 */
export function isHelpKeyword(message) {
  const messageLower = message.toLowerCase().trim();
  const helpKeywords = ['ayuda', 'help', '?', '¿?', 'que hacer', 'qué hacer', 'que hago', 'qué hago', 'no entiendo', 'no sé', 'no se'];
  return helpKeywords.includes(messageLower);
}

/**
 * Detecta si el mensaje es el comando cancelar
 * @param {string} message - Mensaje del usuario
 * @returns {boolean} true si es el comando cancelar
 */
export function isCancelKeyword(message) {
  const messageLower = message.toLowerCase().trim();
  return messageLower === 'cancelar' || messageLower === 'cancel';
}

// Las funciones de procesamiento de keywords se manejan directamente en stepHandler.js
// Este archivo solo exporta las funciones de detección
