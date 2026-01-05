// Gestión de vista previa y confirmación
import { ConfigStep } from '../index.js';
import { getCurrentOption, getCurrentLabel } from '../data/configDataManager.js';

/**
 * Muestra una vista previa del menú configurado
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta con vista previa
 */
export async function showPreview(clientId, sessionId) {
  // Importar dinámicamente para evitar dependencias circulares
  const { getConfigurationSession } = await import('../index.js');
  const configSession = getConfigurationSession(clientId);
  
  if (!configSession) {
    return { response: null, completed: false, cancelled: false };
  }
  
  const welcome = configSession.data.welcome_message || 'No configurado';
  const label1 = getCurrentLabel(configSession.data, '1') || 'Opción 1';
  const label2 = getCurrentLabel(configSession.data, '2') || 'Opción 2';
  const label3 = getCurrentLabel(configSession.data, '3') || 'Opción 3';
  const label4 = getCurrentLabel(configSession.data, '4') || 'Opción 4';
  
  const option1 = getCurrentOption(configSession.data, '1') || 'No configurado';
  const option2 = getCurrentOption(configSession.data, '2') || 'No configurado';
  const option3 = getCurrentOption(configSession.data, '3') || 'No configurado';
  const option4 = getCurrentOption(configSession.data, '4') || 'No configurado';
  
  const preview = `👁️ *Vista Previa del Menú*

📝 *Mensaje de Bienvenida:*
${welcome.substring(0, 150)}${welcome.length > 150 ? '...' : ''}

📋 *Opciones del Menú:*

*1️⃣ ${label1}:*
${option1.substring(0, 100)}${option1.length > 100 ? '...' : ''}

*2️⃣ ${label2}:*
${option2.substring(0, 100)}${option2.length > 100 ? '...' : ''}

*3️⃣ ${label3}:*
${option3.substring(0, 100)}${option3.length > 100 ? '...' : ''}

*4️⃣ ${label4}:*
${option4.substring(0, 100)}${option4.length > 100 ? '...' : ''}

💡 *Comandos:*
• Continúa escribiendo para seguir configurando
• 'editar [1-4]' - Editar una opción específica
• 'cancelar' - Salir sin guardar`;
  
  return {
    response: preview,
    completed: false,
    cancelled: false
  };
}

/**
 * Muestra vista previa y solicita confirmación antes de guardar
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta con confirmación
 */
export async function showPreviewAndConfirm(clientId, sessionId) {
  // Importar dinámicamente para evitar dependencias circulares
  const { getConfigurationSession } = await import('../index.js');
  const configSession = getConfigurationSession(clientId);
  
  if (!configSession) {
    return { response: null, completed: false, cancelled: false };
  }
  
  // Cambiar a modo de confirmación
  configSession.step = ConfigStep.COMPLETED;
  configSession.waitingConfirmation = true;
  
  const preview = await showPreview(clientId, sessionId);
  
  return {
    response: `${preview.response}\n\n✅ *¿Guardar esta configuración?*\n\nEscribe 'guardar' o 'si' para confirmar, o 'cancelar' para salir sin guardar.`,
    completed: false,
    cancelled: false
  };
}

