// Servicio para mostrar ayuda y guía de uso
import { logSession } from '../../utils/logger/index.js';
import { getClientConfigById } from '../database/configService.js';

/**
 * Muestra la guía de ayuda para el cliente
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<string>} Mensaje de ayuda
 */
export async function showHelp(clientId, sessionId) {
  try {
    return `📚 *Guía de Uso - Tu Bot de WhatsApp*

*Comandos disponibles en tu bot:*

🔹 *"menú"* o *"menu"*
   Abre el menú de configuración con todas las opciones

🔹 *"configurar"* o *"config"*
   Inicia el flujo para personalizar tus respuestas y opciones
   (Solo funciona desde tu propio bot, no desde el número master)

🔹 *"ayuda"* o *"help"*
   Muestra esta guía de uso completa

🔹 *"probar"* o *"test"* o *"preview"*
   Activa el modo test para probar tu bot sin activarlo

🔹 *"editar [número] label"* o *"editar [número] respuesta"*
   Edición rápida: edita directamente la etiqueta o respuesta de una opción
   Ejemplo: "editar 1 label" o "editar 2 respuesta"

💡 *Nota:* El comando "admin" solo funciona en el número master de Unikuo, no en tu bot personal.

*Opciones del menú:*

1️⃣ *Configurar respuestas*
   Personaliza el mensaje de bienvenida y las 4 opciones del menú

2️⃣ *Activar/Desactivar bot*
   Pausa o reanuda las respuestas automáticas

3️⃣ *Ver configuración actual*
   Muestra tu configuración sin entrar en modo edición

4️⃣ *Ayuda*
   Muestra esta guía

5️⃣ *Probar bot (Modo Test)*
   Prueba cómo funciona tu bot sin activarlo

6️⃣ *Estadísticas*
   Ver métricas y uso de tu bot

*Edición Rápida:*
   Puedes editar opciones sin entrar al modo configuración completo.
   Ejemplo: "editar 1 label" para cambiar la etiqueta de la opción 1.

*¿Cómo funciona tu bot?*

✅ Cuando alguien escribe a tu número de bot:
   • Recibe un mensaje de bienvenida personalizado
   • Puede elegir entre tus 4 opciones configuradas
   • El bot responde automáticamente según tu configuración

🧪 *Modo Test:*
   • Prueba tu bot sin activarlo
   • Funciona incluso cuando el bot está desactivado
   • Los mensajes de prueba tienen el prefijo "[MODO TEST]"
   • Escribe "salir" para salir del modo test

💡 *Tip:* Configura tus respuestas, pruébalas en modo test, y cuando estés listo, activa el bot.

📞 *Importante:* 
   • Para gestionar tu bot → Escribe a *tu propio bot* (este chat)
   • Para consultas o soporte → Escribe al número de Unikuo

❓ ¿Necesitas más ayuda? Escribe "menú" para ver todas las opciones.`;
  } catch (err) {
    logSession(sessionId, `❌ Error mostrando ayuda: ${err?.message || err}`);
    return '❌ Hubo un error al mostrar la ayuda. Por favor, intenta nuevamente.';
  }
}

/**
 * Muestra la configuración actual del cliente
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<string>} Mensaje con la configuración
 */
export async function showCurrentConfig(clientId, sessionId) {
  try {
    const config = await getClientConfigById(clientId, sessionId);
    const botStatus = config?.bot_enabled !== false ? '✅ Activado' : '❌ Desactivado';
    
    let message = `📋 *Tu Configuración Actual*\n\n`;
    message += `📊 *Estado del bot:* ${botStatus}\n\n`;
    
    if (config?.welcome_message) {
      message += `💬 *Mensaje de Bienvenida:*\n"${config.welcome_message.substring(0, 200)}${config.welcome_message.length > 200 ? '...' : ''}"\n\n`;
    } else {
      message += `💬 *Mensaje de Bienvenida:*\n⚠️ No configurado (se usará el mensaje por defecto)\n\n`;
    }
    
    if (config?.menu_options?.options && config.menu_options.options.length > 0) {
      message += `📋 *Opciones Configuradas:*\n\n`;
      config.menu_options.options.forEach((option, index) => {
        const optionNumber = index + 1;
        const label = option.label || `Opción ${optionNumber}`;
        const response = option.response || 'Sin respuesta configurada';
        message += `${optionNumber}️⃣ *${label}*\n`;
        message += `   Respuesta: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"\n\n`;
      });
    } else {
      message += `📋 *Opciones:*\n⚠️ No configuradas (se usarán las opciones por defecto)\n\n`;
    }
    
    message += `💡 Para modificar tu configuración, escribe "configurar" o elige la opción 1 en el menú.`;
    
    return message;
  } catch (err) {
    logSession(sessionId, `❌ Error mostrando configuración: ${err?.message || err}`);
    return '❌ Hubo un error al mostrar la configuración. Por favor, intenta nuevamente.';
  }
}

