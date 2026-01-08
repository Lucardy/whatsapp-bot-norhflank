// Gestión de vista previa y confirmación
import { ConfigStep } from '../constants.js';
import { getSession, updateSession } from '../sessionManager.js';
import { getCurrentOption, getCurrentLabel } from '../utils/dataManager.js';
import { buildResponse } from '../utils/responseBuilder.js';

/**
 * Muestra una vista previa del menú configurado
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta con vista previa
 */
export async function showPreview(clientId, sessionId) {
  const configSession = getSession(clientId);
  
  if (!configSession) {
    return buildResponse(clientId, null, false, false);
  }
  
  const welcome = configSession.data.welcome_message || 'No configurado';
  const options = configSession.data.options || [];
  
  let preview = `👁️ *Vista Previa del Menú*\n\n📝 *Mensaje de Bienvenida:*\n${welcome !== 'No configurado' ? welcome.substring(0, 200) + (welcome.length > 200 ? '...' : '') : 'No configurado'}\n\n`;
  
  if (options.length > 0) {
    preview += `📋 *Opciones del Menú:*\n\n`;
    options.forEach(option => {
      const label = option.label || `Opción ${option.key}`;
      const response = option.response || 'Sin respuesta configurada';
      preview += `${option.key}️⃣ *${label}*\n${response.substring(0, 100)}${response.length > 100 ? '...' : ''}\n\n`;
    });
  } else {
    preview += `📋 *Opciones:*\n⚠️ No configuradas\n\n`;
  }
  
  preview += `💡 *Comandos:*\n• Escribe cualquier número para volver al menú\n• 'cancelar' - Salir sin guardar\n• '0' - Resetear todo`;
  
  return buildResponse(clientId, preview, false, false);
}

/**
 * Muestra vista previa y solicita confirmación antes de guardar
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta con confirmación
 */
export async function showPreviewAndConfirm(clientId, sessionId) {
  const configSession = getSession(clientId);
  
  if (!configSession) {
    return buildResponse(clientId, null, false, false);
  }
  
  // Cambiar a modo de confirmación
  updateSession(clientId, {
    step: ConfigStep.COMPLETED,
    waitingConfirmation: true
  });
  
  const preview = await showPreview(clientId, sessionId);
  
  return buildResponse(clientId, `${preview.response}\n\n✅ *¿Guardar esta configuración?*\n\nEscribe 'guardar' o 'si' para confirmar, o 'cancelar' para salir sin guardar.`, false, false);
}

