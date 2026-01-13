// Servicio para enviar mensaje de confirmación cuando un cliente escanea el QR
import { logSession } from '../../utils/logger/index.js';
import { getGlobalSessionManager } from './global.js';

// Mapa para almacenar mensajes originales pendientes de confirmación
// Estructura: Map<clientSessionId, msg>
const pendingConfirmationMessages = new Map();

/**
 * Guarda un mensaje original para enviar confirmación cuando la sesión se conecte
 * @param {string} clientSessionId - ID de la sesión del cliente
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 */
export function storePendingConfirmationMessage(clientSessionId, msg) {
  pendingConfirmationMessages.set(clientSessionId, msg);
}

/**
 * Construye el mensaje de confirmación de conexión
 * @param {string} clientName - Nombre del cliente
 * @param {string} clientContactPhone - Número de teléfono del cliente (contact_phone) - para el link
 * @param {string} clientBotPhone - Número de teléfono del bot del cliente (phone_number de la sesión)
 * @returns {string} Mensaje de confirmación
 */
export function buildConnectionConfirmationMessage(clientName, clientContactPhone, clientBotPhone) {
  // Crear enlace de WhatsApp usando el número del cliente (contact_phone)
  // El cliente hace clic en el link y se abre un chat consigo mismo, donde está su bot
  const whatsappLink = clientContactPhone ? `https://api.whatsapp.com/send/?phone=${clientContactPhone}` : '';
  
  return `🎉 *¡QR Escaneado Exitosamente!*

Hola *${clientName}*, tu bot de WhatsApp ya está conectado y listo para usar.

*Haz clic en el enlace para abrir tu chat (contigo mismo):*
🔗 ${whatsappLink || 'Busca tu número en WhatsApp'}

*En tu propio chat podrás gestionar tu bot con estos comandos:*
• Escribe *"menú"* → Ver todas las opciones disponibles
• Escribe *"configurar"* → Personalizar tus respuestas y opciones
• Escribe *"ayuda"* → Ver la guía completa de uso
• Escribe *"probar"* → Activar modo test para probar tu bot

⏸️ *Estado inicial:* Tu bot comienza *desactivado* para que puedas configurarlo con tranquilidad.

📱 *¿Qué puedes hacer ahora?*

💡 *Pasos recomendados:*

1️⃣ *Haz clic en el enlace* de arriba para abrir tu chat contigo mismo
2️⃣ *Configura tus respuestas* escribiendo "configurar" en tu chat
3️⃣ *Prueba tu bot* usando el modo test
4️⃣ *Activa tu bot* cuando estés listo (escribe "activar")

✅ *Una vez activado:*
   Tu bot responderá automáticamente a todos los mensajes que reciba, usando las respuestas que configuraste.

📞 *Importante:*
   • Para gestionar tu bot → Escribe en *tu propio chat* (usa el enlace de arriba)
   • Para consultas o soporte → Escribe a este número (Unikuo)

🚀 *¡Comienza ahora! Haz clic en el enlace de arriba.*`;
}

/**
 * Envía un mensaje de confirmación desde el master cuando un cliente escanea el QR
 * @param {string} clientSessionId - ID de la sesión del cliente que se conectó
 * @returns {Promise<boolean>} true si se envió exitosamente
 */
export async function sendConnectionConfirmation(clientSessionId) {
  try {
    logSession(clientSessionId, `📤 Iniciando envío de confirmación de conexión...`);
    
    // Obtener información de la sesión del cliente desde la base de datos
    const { getSessionByName } = await import('../database/sessionService.js');
    const clientSession = await getSessionByName(clientSessionId);
    
    if (!clientSession || !clientSession.client) {
      logSession(clientSessionId, `⚠️ No se encontró sesión o cliente para enviar confirmación`);
      logSession(clientSessionId, `   Sesión encontrada: ${!!clientSession}, Cliente encontrado: ${!!clientSession?.client}`);
      return false;
    }
    
    const clientName = clientSession.client.name;
    const clientContactPhone = clientSession.client.contact_phone; // Número del cliente (para el link)
    const clientBotPhone = clientSession.phone_number; // Número del bot del cliente
    
    logSession(clientSessionId, `📋 Datos del cliente: nombre=${clientName}, contact_phone=${clientContactPhone || 'null'}, bot_phone=${clientBotPhone || 'null'}`);
    
    if (!clientContactPhone) {
      logSession(clientSessionId, `⚠️ Cliente ${clientName} no tiene número de contacto para generar link`);
      // Continuar sin link
    }
    
    // Obtener la sesión master
    const sessionManager = getGlobalSessionManager();
    if (!sessionManager) {
      logSession(clientSessionId, `⚠️ SessionManager no disponible para enviar confirmación`);
      return false;
    }
    
    // Intentar obtener el mensaje original guardado cuando se envió el QR
    const originalMessage = pendingConfirmationMessages.get(clientSessionId);
    logSession(clientSessionId, `📨 Mensaje original guardado: ${originalMessage ? 'Sí' : 'No'}`);
    
    // IMPORTANTE: La confirmación debe enviarse al número del cliente que se contactó originalmente
    // Usamos el mensaje original (cuando escribió "5" o completó su nombre) para responder
    // Esto garantiza que el mensaje llegue al número correcto y que el chat exista
    
    if (originalMessage) {
      logSession(clientSessionId, `📤 Enviando confirmación respondiendo al mensaje original del cliente...`);
      try {
        const confirmationMessage = buildConnectionConfirmationMessage(clientName, clientContactPhone || '', clientBotPhone || '');
        
        // Obtener el master sessionId
        const { getSessionsByType } = await import('../database/sessionService.js');
        const masterSessions = await getSessionsByType('master');
        const masterSessionId = masterSessions[0]?.session_name;
        
        if (masterSessionId) {
          // Usar sendBotMessage para consolidar el patrón markBotSentMessage + delay
          const { sendBotMessage } = await import('../../services/messageHandler/humanManager.js');
          const chatId = (originalMessage.from || '').split('@')[0] || '';
          
          // Responder al mensaje original del cliente (esto garantiza que el chat existe)
          await sendBotMessage(originalMessage, masterSessionId, chatId, confirmationMessage);
          
          // Limpiar el mensaje guardado
          pendingConfirmationMessages.delete(clientSessionId);
          
          logSession(clientSessionId, `✅ Confirmación de conexión enviada exitosamente respondiendo al mensaje original`);
          return true;
        }
      } catch (replyError) {
        logSession(clientSessionId, `❌ Error respondiendo al mensaje original: ${replyError?.message || replyError}`);
        // Limpiar el mensaje guardado si falla
        pendingConfirmationMessages.delete(clientSessionId);
        // Continuar con el método alternativo
      }
    }
    
    // Método alternativo: intentar enviar mensaje nuevo usando el número del cliente
    // Si no hay mensaje original guardado, intentar enviar directamente al número del cliente
    if (!clientContactPhone) {
      logSession(clientSessionId, `⚠️ Cliente ${clientName} no tiene número de contacto y no hay mensaje original guardado`);
      logSession(clientSessionId, `   El mensaje de confirmación no se puede enviar sin número de contacto`);
      return false;
    }
    
    // Buscar la sesión master
    const { getSessionsByType } = await import('../database/sessionService.js');
    const masterSessions = await getSessionsByType('master');
    
    if (masterSessions.length === 0) {
      logSession(clientSessionId, `⚠️ No se encontró sesión master para enviar confirmación`);
      return false;
    }
    
    const masterSession = masterSessions[0];
    const masterSessionId = masterSession.session_name;
    const masterSessionData = sessionManager.getSession(masterSessionId);
    
    if (!masterSessionData || !masterSessionData.client || !masterSessionData.isReady) {
      logSession(clientSessionId, `⚠️ Sesión master no está lista para enviar confirmación`);
      return false;
    }
    
    const masterClient = masterSessionData.client;
    
    // Construir mensaje de confirmación con el número del cliente (contact_phone) para el link
    const confirmationMessage = buildConnectionConfirmationMessage(clientName, clientContactPhone, clientBotPhone || '');
    
    // Formatear número de teléfono para WhatsApp (normalizar primero)
    const { normalizePhoneNumber } = await import('../../utils/validation/phoneValidator.js');
    const normalizedPhone = normalizePhoneNumber(clientContactPhone);
    const clientPhoneFormatted = `${normalizedPhone}@c.us`;
    
    logSession(clientSessionId, `📤 Enviando confirmación de conexión a cliente ${clientName} (${normalizedPhone}) desde master...`);
    
    try {
      // Intentar cargar el chat primero para asegurar que existe
      try {
        await masterClient.getChats();
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (chatsError) {
        logSession(clientSessionId, `⚠️ Error cargando chats (continuando): ${chatsError?.message || chatsError}`);
      }
      
      // Intentar obtener el chat primero
      let chat = null;
      try {
        chat = await masterClient.getChatById(clientPhoneFormatted);
        logSession(clientSessionId, `✅ Chat encontrado para ${normalizedPhone}`);
      } catch (chatError) {
        logSession(clientSessionId, `⚠️ No se pudo obtener chat directamente, intentando crear...`);
        // Si no existe el chat, intentar enviar directamente (WhatsApp puede crear el chat automáticamente)
      }
      
      // Enviar el mensaje
      await masterClient.sendMessage(clientPhoneFormatted, confirmationMessage);
      
      logSession(clientSessionId, `✅ Confirmación de conexión enviada exitosamente a ${clientName} (${normalizedPhone})`);
      return true;
    } catch (sendError) {
      const errorMessage = sendError?.message || sendError?.toString() || 'Error desconocido';
      logSession(clientSessionId, `❌ Error enviando confirmación de conexión: ${errorMessage}`);
      logSession(clientSessionId, `   Stack: ${sendError?.stack || 'N/A'}`);
      
      // Si falla, intentar con diferentes formatos del número
      try {
        // Intentar con formato alternativo (sin @c.us)
        const altPhoneFormatted = `${normalizedPhone}@c.us`;
        logSession(clientSessionId, `🔄 Reintentando con formato alternativo: ${altPhoneFormatted}`);
        await masterClient.sendMessage(altPhoneFormatted, confirmationMessage);
        logSession(clientSessionId, `✅ Confirmación enviada usando formato alternativo`);
        return true;
      } catch (retryError) {
        logSession(clientSessionId, `❌ Error en reintento: ${retryError?.message || retryError}`);
        logSession(clientSessionId, `   El mensaje de confirmación no se pudo enviar, pero el cliente puede usar su bot normalmente`);
        return false;
      }
    }
  } catch (error) {
    logSession(clientSessionId, `❌ Error en sendConnectionConfirmation: ${error?.message || error}`);
    return false;
  }
}

