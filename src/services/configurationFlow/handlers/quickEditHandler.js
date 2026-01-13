// Handler para edición rápida de opciones
import { logSession } from '../../../utils/logger/index.js';
import { getClientConfigById } from '../../database/configService.js';
import { updateClientConfigById } from '../../database/configService.js';
import { buildResponse } from '../utils/responseBuilder.js';

// Mapa para rastrear el estado de edición rápida por cliente
// Estructura: clientId -> { mode: 'label' | 'response', optionKey: string }
const quickEditSessions = new Map();

/**
 * Inicia la edición rápida de una opción
 * @param {number} clientId - ID del cliente
 * @param {string} optionKey - Clave de la opción a editar (ej: '1', '2')
 * @param {string} editType - Tipo de edición: 'label' o 'response'
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<string>} Mensaje de confirmación
 */
export async function startQuickEdit(clientId, optionKey, editType, sessionId) {
  try {
    const config = await getClientConfigById(clientId, sessionId);
    if (!config) {
      return '❌ No se encontró la configuración del bot.';
    }
    
    const menuOptions = config.menu_options?.options || [];
    const option = menuOptions.find(opt => opt.key === optionKey);
    
    if (!option) {
      return `❌ No se encontró la opción ${optionKey}.`;
    }
    
    // Guardar estado de edición rápida
    quickEditSessions.set(clientId, {
      mode: editType,
      optionKey: optionKey,
      startedAt: Date.now()
    });
    
    const currentValue = editType === 'label' ? option.label : option.response;
    const fieldName = editType === 'label' ? 'etiqueta' : 'respuesta';
    
    logSession(sessionId, `⚡ Iniciando edición rápida de ${fieldName} para opción ${optionKey} del cliente ${clientId}`);
    
    return `⚡ *Edición Rápida - Opción ${optionKey}*

📝 *Editando:* ${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}

*Valor actual:*
"${currentValue}"

Envía el nuevo ${fieldName} o escribe "cancelar" para salir.

💡 *Comandos:*
• "cancelar" - Salir sin guardar
• "ver" - Ver valor actual completo`;
  } catch (error) {
    logSession(sessionId, `❌ Error iniciando edición rápida: ${error?.message || error}`);
    return '❌ Hubo un error al iniciar la edición. Por favor, intenta nuevamente.';
  }
}

/**
 * Procesa el mensaje durante la edición rápida
 * @param {number} clientId - ID del cliente
 * @param {string} message - Mensaje del cliente
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<Object|null>} Respuesta o null si no está en modo edición rápida
 */
export async function handleQuickEdit(clientId, message, sessionId) {
  const editSession = quickEditSessions.get(clientId);
  if (!editSession) {
    return null; // No está en modo edición rápida
  }
  
  const messageLower = message.toLowerCase().trim();
  
  // Comando cancelar
  if (messageLower === 'cancelar' || messageLower === 'cancel') {
    quickEditSessions.delete(clientId);
    logSession(sessionId, `❌ Edición rápida cancelada para cliente ${clientId}`);
    return {
      response: '✅ *Edición cancelada*\n\nNo se realizaron cambios.',
      completed: false,
      cancelled: true
    };
  }
  
  // Comando ver
  if (messageLower === 'ver' || messageLower === 'view') {
    try {
      const config = await getClientConfigById(clientId, sessionId);
      const menuOptions = config.menu_options?.options || [];
      const option = menuOptions.find(opt => opt.key === editSession.optionKey);
      
      if (option) {
        const currentValue = editSession.mode === 'label' ? option.label : option.response;
        return {
          response: `📋 *Valor actual completo:*\n\n"${currentValue}"`,
          completed: false,
          cancelled: false
        };
      }
    } catch (error) {
      logSession(sessionId, `❌ Error mostrando valor actual: ${error?.message || error}`);
    }
  }
  
  // Validar que el mensaje no esté vacío
  if (message.trim().length < 3) {
    return {
      response: '❌ *Texto muy corto*\n\nEl texto debe tener al menos 3 caracteres.\n\nEnvía el nuevo texto o escribe "cancelar" para salir.',
      completed: false,
      cancelled: false
    };
  }
  
  // Validar longitud máxima
  if (message.trim().length > 2000) {
    return {
      response: '❌ *Texto muy largo*\n\nEl texto no puede exceder 2000 caracteres.\n\nEnvía un texto más corto o escribe "cancelar" para salir.',
      completed: false,
      cancelled: false
    };
  }
  
  // Guardar el cambio
  try {
    const config = await getClientConfigById(clientId, sessionId);
    const menuOptions = config.menu_options?.options || [];
    const optionIndex = menuOptions.findIndex(opt => opt.key === editSession.optionKey);
    
    if (optionIndex === -1) {
      quickEditSessions.delete(clientId);
      return {
        response: '❌ La opción ya no existe. La edición rápida ha sido cancelada.',
        completed: false,
        cancelled: true
      };
    }
    
    // Actualizar la opción
    const updatedOptions = [...menuOptions];
    if (editSession.mode === 'label') {
      updatedOptions[optionIndex].label = message.trim();
    } else {
      updatedOptions[optionIndex].response = message.trim();
    }
    
    // Guardar en la base de datos
    await updateClientConfigById(clientId, {
      menu_options: {
        options: updatedOptions
      }
    }, sessionId);
    
    // Limpiar sesión de edición rápida
    quickEditSessions.delete(clientId);
    
    const fieldName = editSession.mode === 'label' ? 'etiqueta' : 'respuesta';
    logSession(sessionId, `✅ Edición rápida completada: ${fieldName} de opción ${editSession.optionKey} actualizada para cliente ${clientId}`);
    
    return {
      response: `✅ *¡${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} actualizada!*\n\nLa opción ${editSession.optionKey} ha sido actualizada exitosamente.\n\n💡 Escribe "menú" para ver todas las opciones.`,
      completed: true,
      cancelled: false
    };
  } catch (error) {
    logSession(sessionId, `❌ Error guardando edición rápida: ${error?.message || error}`);
    quickEditSessions.delete(clientId);
    return {
      response: '❌ Hubo un error al guardar los cambios. Por favor, intenta nuevamente.',
      completed: false,
      cancelled: true
    };
  }
}

/**
 * Verifica si un cliente está en modo edición rápida
 * @param {number} clientId - ID del cliente
 * @returns {boolean} true si está en modo edición rápida
 */
export function isInQuickEditMode(clientId) {
  return quickEditSessions.has(clientId);
}

/**
 * Cancela la edición rápida para un cliente
 * @param {number} clientId - ID del cliente
 */
export function cancelQuickEdit(clientId) {
  quickEditSessions.delete(clientId);
}

