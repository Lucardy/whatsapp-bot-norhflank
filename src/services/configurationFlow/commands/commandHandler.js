// Manejo de comandos especiales (cancelar, saltar, ver, editar)
import { logSession } from '../../../utils/logger/index.js';
import { ConfigStep } from '../index.js';
import { showPreview } from '../preview/previewManager.js';
import { startPartialEdit } from './partialEditHandler.js';

/**
 * Maneja el comando cancelar
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Object} Resultado del comando
 */
export function handleCancelCommand(clientId, sessionId) {
  logSession(sessionId, `❌ Configuración cancelada por cliente ${clientId}`);
  return {
    response: '❌ Configuración cancelada. Puedes volver a configurar cuando quieras escribiendo "configurar".',
    completed: false,
    cancelled: true
  };
}

/**
 * Maneja el comando ver/preview
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Resultado del comando
 */
export async function handlePreviewCommand(clientId, sessionId) {
  return await showPreview(clientId, sessionId);
}

/**
 * Maneja el comando editar [1-4]
 * @param {number} clientId - ID del cliente
 * @param {string} optionKey - Clave de la opción
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Resultado del comando
 */
export async function handleEditCommand(clientId, optionKey, sessionId) {
  if (['1', '2', '3', '4'].includes(optionKey)) {
    return await startPartialEdit(clientId, optionKey, sessionId);
  }
  return {
    response: '❌ Opción inválida. Usa: editar 1, editar 2, editar 3 o editar 4',
    completed: false,
    cancelled: false
  };
}

/**
 * Procesa comandos especiales
 * @param {string} messageLower - Mensaje en minúsculas
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object|null>} Resultado del comando o null si no es un comando
 */
export async function processCommand(messageLower, clientId, sessionId) {
  // Comando cancelar
  if (messageLower === 'cancelar' || messageLower === 'cancel') {
    return handleCancelCommand(clientId, sessionId);
  }
  
  // Comando ver/preview
  if (messageLower === 'ver' || messageLower === 'preview' || messageLower === 'vista previa') {
    return await handlePreviewCommand(clientId, sessionId);
  }
  
  // Comando editar
  if (messageLower.startsWith('editar ') || messageLower.startsWith('edit ')) {
    const optionKey = messageLower.split(' ')[1];
    return await handleEditCommand(clientId, optionKey, sessionId);
  }
  
  return null; // No es un comando
}

