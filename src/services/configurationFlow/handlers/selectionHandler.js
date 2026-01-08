// Handler para la selección del menú inicial
import { ConfigStep, MAX_OPTIONS } from '../constants.js';
import { getSession, updateSession } from '../sessionManager.js';
import { getOptionCount } from '../utils/dataManager.js';
import { calculateSaveOptionNumber } from '../menuGenerator.js';
import { buildResponse } from '../utils/responseBuilder.js';
import { generateSelectionMenu } from '../menuGenerator.js';
import { logSession } from '../../../utils/logger/index.js';
import { showPreviewAndConfirm } from '../preview/previewManager.js';

/**
 * Maneja la selección del menú inicial
 * @param {number} clientId - ID del cliente
 * @param {string} message - Mensaje del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta
 */
export async function handleSelection(clientId, message, sessionId) {
  const configSession = getSession(clientId);
  if (!configSession) {
    return buildResponse(clientId, null, false, false);
  }
  
  const messageLower = message.toLowerCase().trim();
  const optionCount = getOptionCount(configSession.data);
  
  // PRIORIDAD 1: Comandos de texto (siempre primero)
  // Opción "Guardar y salir" - usar palabra clave "guardar" como principal
  if (messageLower === 'guardar' || messageLower === 'save' || messageLower === 'guardar y salir') {
    return await showPreviewAndConfirm(clientId, sessionId);
  }
  
  // Opción 0: Resetear configuración
  if (messageLower === '0' || messageLower === 'resetear' || messageLower === 'reset') {
    updateSession(clientId, { step: ConfigStep.RESETTING });
    return buildResponse(clientId, `⚠️ *¿Estás seguro que quieres resetear toda la configuración?*

Esto eliminará:
• Tu mensaje de bienvenida
• Todas las ${optionCount} opciones configuradas

⚠️ *Esta acción NO se puede deshacer.*

Para confirmar, escribe *"eliminar"*.
Para cancelar, escribe *"cancelar"*.`, false, false);
  }
  
  // Opción 1: Mensaje de bienvenida
  if (messageLower === '1' || messageLower === 'bienvenida' || messageLower === 'welcome') {
    updateSession(clientId, { step: ConfigStep.WELCOME });
    const current = configSession.data.welcome_message || 'No configurado';
    return buildResponse(clientId, `📝 *Editando: Mensaje de Bienvenida*

Envía el mensaje que quieres que aparezca cuando alguien escriba por primera vez a tu bot.

💡 *Comandos disponibles:*
• 'saltar' - Mantener mensaje actual
• 'cancelar' - Volver al menú
• 'ver' - Ver vista previa

📏 *Requisitos:* Mínimo 3 caracteres, máximo 2000 caracteres

*Mensaje actual:* ${current !== 'No configurado' ? `"${current.substring(0, 80)}${current.length > 80 ? '...' : ''}"` : 'No configurado'}`, false, false);
  }
  
  // PRIORIDAD 2: Opciones numéricas 2 en adelante (para preguntas y respuestas)
  const optionNumber = parseInt(messageLower);
  
  if (!isNaN(optionNumber) && optionNumber >= 2) {
    // Convertir número del menú a índice de opción (menú 2 = opción 1, menú 3 = opción 2, etc.)
    const targetOption = optionNumber - 1;
    
    if (targetOption > optionCount && targetOption <= MAX_OPTIONS) {
      // Agregar nueva opción
      updateSession(clientId, {
        currentOption: String(targetOption),
        step: ConfigStep.OPTION_LABEL
      });
      
      return buildResponse(clientId, `📝 *Agregando: Pregunta y Respuesta N°${targetOption}*

Primero, envía el *texto de la pregunta* que aparecerá en el menú.

Ejemplo: "Consultar precios" o "Ver productos"

💡 *Comandos disponibles:*
• 'cancelar' - Volver al menú
• 'ver' - Ver vista previa

📏 *Requisitos:* Mínimo 3 caracteres, máximo 2000 caracteres`, false, false);
    } else if (targetOption >= 1 && targetOption <= optionCount) {
      // Editar opción existente
      const option = configSession.data.options.find(opt => opt.key === String(targetOption));
      updateSession(clientId, {
        currentOption: String(targetOption),
        step: ConfigStep.OPTION_LABEL
      });
      
      const currentLabel = option?.label || 'No configurado';
      return buildResponse(clientId, `📝 *Editando: Pregunta y Respuesta N°${targetOption}*

Primero, envía el *texto de la pregunta* que aparecerá en el menú.

💡 *Comandos disponibles:*
• 'saltar' - Mantener pregunta actual
• 'cancelar' - Volver al menú
• 'ver' - Ver vista previa

📏 *Requisitos:* Mínimo 3 caracteres, máximo 2000 caracteres

*Pregunta actual:* ${currentLabel !== 'No configurado' ? `"${currentLabel.substring(0, 80)}${currentLabel.length > 80 ? '...' : ''}"` : 'No configurado'}`, false, false);
    }
  }
  
  // Opción no válida
  return buildResponse(clientId, `❓ Opción no válida.\n\n${generateSelectionMenu(configSession.data, sessionId)}`, false, false);
}

