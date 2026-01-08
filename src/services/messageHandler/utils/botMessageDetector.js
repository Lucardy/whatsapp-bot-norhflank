// Utilidad para detectar mensajes del bot (para prevenir bucles infinitos)

// Patrones que indican que un mensaje es del bot en modo test
const TEST_MODE_BOT_PATTERNS = [
  '🧪 *[MODO TEST]*',
  '*[MODO TEST]*',
  '🧪 *Modo Test Activado*',
  'Modo Test Activado',
  '[MODO TEST]'
];

// Patrones que indican que un mensaje es del bot en modo configuración
const CONFIG_MODE_BOT_PATTERNS = [
  '⚙️ *Menú de Configuración*',
  'Modo Configuración Activado',
  '¿Qué quieres editar o configurar?',
  '*Editando:',
  '*Agregando:',
  '*Vista Previa',
  '✅ Mensaje de bienvenida guardado',
  '✅ Pregunta guardada',
  '✅ Pregunta y Respuesta'
];

/**
 * Verifica si un mensaje es del bot en modo test
 * @param {string} texto - Texto del mensaje
 * @returns {boolean} true si el mensaje parece ser del bot en modo test
 */
export function isBotTestMessage(texto) {
  return TEST_MODE_BOT_PATTERNS.some(pattern => texto.includes(pattern));
}

/**
 * Verifica si un mensaje es del bot en modo configuración
 * @param {string} texto - Texto del mensaje
 * @returns {boolean} true si el mensaje parece ser del bot en modo configuración
 */
export function isBotConfigMessage(texto) {
  return CONFIG_MODE_BOT_PATTERNS.some(pattern => texto.includes(pattern));
}

/**
 * Verifica si un mensaje es del bot (en cualquier modo)
 * @param {string} texto - Texto del mensaje
 * @param {boolean} isFromMe - Si el mensaje es propio (fromMe)
 * @returns {boolean} true si el mensaje parece ser del bot
 */
export function isBotMessage(texto, isFromMe) {
  if (!isFromMe) {
    return false; // Solo los mensajes propios pueden ser del bot
  }
  return isBotTestMessage(texto) || isBotConfigMessage(texto);
}

