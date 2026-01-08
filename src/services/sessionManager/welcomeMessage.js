// Servicio para enviar mensaje de bienvenida a clientes cuando se conectan
import { logSession } from '../../utils/logger/index.js';

/**
 * Construye el mensaje de bienvenida para un cliente
 * @param {string} clientName - Nombre del cliente
 * @param {string} clientBotPhone - Número de teléfono del bot del cliente
 * @returns {string} Mensaje de bienvenida completo
 */
export function buildWelcomeMessage(clientName, clientBotPhone) {
  // Crear enlace de WhatsApp para el bot del cliente
  const whatsappLink = `https://wa.me/${clientBotPhone}`;
  
  return `🎉 *¡Bienvenido a tu Bot de WhatsApp!*

Hola *${clientName}*, tu bot ya está conectado y listo para usar.

⏸️ *Estado inicial:* Tu bot comienza *desactivado* para que puedas configurarlo con tranquilidad.

📱 *¿Qué puedes hacer ahora?*

*Para comenzar, escribe a tu propio bot:*
🔗 ${whatsappLink}

*Comandos rápidos en tu bot:*
• Escribe *"menú"* → Ver todas las opciones disponibles
• Escribe *"configurar"* → Personalizar tus respuestas y opciones
• Escribe *"ayuda"* → Ver la guía completa de uso
• Escribe *"probar"* → Activar modo test para probar tu bot

💡 *Pasos recomendados:*

1️⃣ *Escribe a tu bot* usando el enlace de arriba o buscando tu número
2️⃣ *Configura tus respuestas* escribiendo "configurar" en tu bot
3️⃣ *Prueba tu bot* usando el modo test
4️⃣ *Activa tu bot* cuando estés listo

✅ *Una vez activado:*
   Tu bot responderá automáticamente a todos los mensajes que reciba, usando las respuestas que configuraste.

📞 *Importante:*
   • Para gestionar tu bot → Escribe a *tu propio bot* (usa el enlace de arriba)
   • Para consultas o soporte → Escribe a este número (Unikuo)

🚀 *¡Comienza ahora! Haz clic en el enlace de arriba o escribe a tu bot.*`;
}

/**
 * Envía el mensaje de bienvenida al cliente desde el número master
 * Esta función se llama cuando el cliente escribe al master por primera vez
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js (del master)
 * @param {string} masterSessionId - ID de la sesión master
 * @param {string} clientPhoneNumber - Número de teléfono del cliente
 * @param {number} clientId - ID del cliente
 * @param {string} clientName - Nombre del cliente
 * @returns {Promise<boolean>} true si se envió exitosamente
 */
export async function sendWelcomeMessageFromMaster(msg, masterSessionId, clientPhoneNumber, clientId, clientName) {
  try {
    // Obtener la sesión del cliente para obtener el número de su bot
    const { getSessionByClientId } = await import('../database/sessionService.js');
    const clientSession = await getSessionByClientId(clientId, 'client');
    
    if (!clientSession || !clientSession.phone_number) {
      logSession(masterSessionId, `⚠️ No se encontró sesión del cliente o número de bot`);
      return false;
    }
    
    const clientBotPhone = clientSession.phone_number;
    
    // Construir mensaje con enlace al bot del cliente
    const welcomeMessage = buildWelcomeMessage(clientName, clientBotPhone);
    
    logSession(masterSessionId, `📤 Enviando mensaje de bienvenida a cliente ${clientName} (${clientPhoneNumber})...`);
    
    try {
      // Enviar el mensaje como respuesta (el chat ya existe porque el cliente acaba de escribir)
      await msg.reply(welcomeMessage);
      
      logSession(masterSessionId, `✅ Mensaje de bienvenida enviado exitosamente al cliente ${clientName}`);
      
      return true;
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Error desconocido';
      logSession(masterSessionId, `❌ Error enviando mensaje de bienvenida: ${errorMessage}`);
      return false;
    }
  } catch (error) {
    logSession(masterSessionId, `❌ Error enviando mensaje de bienvenida: ${error?.message || error}`);
    return false;
  }
}

