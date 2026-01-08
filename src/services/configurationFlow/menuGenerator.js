// Generador de menús de configuración
import { MAX_OPTIONS } from './constants.js';
import { getOptionCount } from './utils/dataManager.js';

/**
 * Genera el menú de selección inicial
 * @param {Object} data - Datos de configuración
 * @param {string} sessionId - ID de la sesión
 * @returns {string} Mensaje del menú
 */
export function generateSelectionMenu(data, sessionId) {
  const optionCount = getOptionCount(data);
  const welcomeStatus = data.welcome_message ? '✅' : '⏭️';
  
  let menu = `⚙️ *Menú de Configuración*

¿Qué quieres editar o configurar?

1️⃣ *Mensaje de Bienvenida* ${welcomeStatus}
   ${data.welcome_message ? `"${data.welcome_message.substring(0, 40)}..."` : 'No configurado'}

`;

  // Mostrar opciones existentes (empezando desde 2, porque 1 es el mensaje de bienvenida)
  const maxToShow = Math.max(optionCount, 4);
  let currentMenuNumber = 2; // Empezar desde 2 porque 1 es el mensaje de bienvenida
  
  for (let i = 1; i <= maxToShow; i++) {
    const option = data.options?.find(opt => opt.key === String(i));
    const status = (option?.label && option?.response) ? '✅' : '⏭️';
    const label = option?.label || 'No configurado';
    menu += `${currentMenuNumber}️⃣ *Pregunta y Respuesta N°${i}* ${status}\n   "${label.substring(0, 40)}${label.length > 40 ? '...' : ''}"\n\n`;
    currentMenuNumber++;
  }

  // Si hay menos de 8 opciones, mostrar opción para agregar nueva
  if (optionCount < MAX_OPTIONS) {
    menu += `${currentMenuNumber}️⃣ *Agregar Pregunta y Respuesta N°${optionCount + 1}*\n   (Nueva opción)\n\n`;
    currentMenuNumber++;
  }

  // "Guardar y salir" sin número, solo texto
  menu += `💾 *Guardar y salir*
   Escribe *"guardar"* para guardar todos los cambios y salir del modo configuración

0️⃣ *Resetear toda la configuración*
   ⚠️ Elimina todos los mensajes y opciones

💡 *Escribe el número de la opción o "guardar" para guardar y salir.*`;

  return menu;
}

/**
 * Calcula el número de opción para "Guardar y salir"
 * Ya no se usa porque "guardar" es solo texto, pero se mantiene por compatibilidad
 * @param {number} optionCount - Número de opciones configuradas
 * @returns {number} Número de opción para guardar (ya no se usa)
 */
export function calculateSaveOptionNumber(optionCount) {
  // Ya no se usa, pero retornamos un número alto para que nunca coincida
  return 999;
}

