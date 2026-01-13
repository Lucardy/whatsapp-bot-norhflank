// Constructor de mensajes para el flujo de prueba gratuita
import { logSession } from '../../utils/logger/index.js';
import { PHONE_VALIDATION_PATTERN } from '../../config/constants.js';

/**
 * Construye el mensaje de bienvenida inicial del flujo de prueba gratuita
 * @returns {string} Mensaje de bienvenida
 */
export function buildWelcomeMessage() {
  return `🎁 *¡Bienvenido a la Prueba Gratuita!*

Para comenzar, necesito algunos datos:

📝 *Paso 1: Tu nombre*
Por favor, escribe tu nombre o el nombre de tu negocio.

💡 Ejemplo: "Juan" o "Mi Negocio"

💡 *Comandos disponibles:*
• "cancelar" - Salir del proceso
• "ayuda" - Ver ayuda contextual en cualquier momento`;
}

/**
 * Construye el mensaje para un cliente existente que solicita prueba gratuita
 * @param {Object} client - Cliente existente
 * @param {string} pairingCode - Código de pairing (opcional, no usado actualmente)
 * @returns {string} Mensaje formateado
 */
export function buildExistingClientMessage(client, pairingCode = null) {
  return `🎉 *¡Hola de nuevo, ${client.name}!*

Veo que ya tienes una cuenta con nosotros.

📱 *¿A qué número quieres que te enviemos el código QR?*

Puede ser el número de un amigo, familiar, o cualquier otro teléfono donde puedas escanear el QR.

⚠️ *Importante:* El QR debe escanearse desde el WhatsApp donde quieres tener el bot (el número donde se activará tu bot).

💡 *Ejemplo:* 5491169956253 (sin espacios ni guiones)
💡 O escribe *"aquí"* para recibirlo en este mismo número

💡 Escribe "cancelar" si quieres salir.`;
}

/**
 * Construye el mensaje para una sesión pendiente
 * @param {Object} pendingSession - Objeto con información de la sesión pendiente
 * @param {string} pairingCode - Código de pairing (opcional, no usado actualmente)
 * @returns {string} Mensaje formateado
 */
export function buildPendingSessionMessage(pendingSession, pairingCode = null) {
  const clientName = pendingSession.client?.name || 'Cliente';
  return `🎉 *¡Hola de nuevo, ${clientName}!*

Veo que ya tienes una sesión pendiente.

📱 *Tu sesión de WhatsApp:*
Se está generando un nuevo código QR para tu bot. Te lo enviaré en un momento.

⚠️ *El QR expira en poco tiempo.* Si tarda o da error al escanear, escribe *"qr"* para solicitar uno nuevo.

⏰ *Recuerda:* Tu prueba es válida por 7 días.`;
}

/**
 * Construye el mensaje final de confirmación del flujo de prueba gratuita
 * @param {Object} client - Cliente creado
 * @param {string} realPhoneNumber - Número de teléfono real del cliente
 * @param {boolean} isSessionReady - Si la sesión ya está lista
 * @param {boolean} hasQR - Si hay QR disponible
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {string} Mensaje formateado
 */
export function buildCompletionMessage(client, realPhoneNumber, isSessionReady, hasQR, sessionId) {
  // Obtener el número de teléfono del cliente (usar el número real, no el chatId)
  const clientPhone = client.contact_phone || realPhoneNumber;
  
  // Validar que clientPhone no sea el chatId (identificador largo)
  let finalClientPhone = null;
  
  if (clientPhone) {
    const cleanPhone = clientPhone.replace(/[^0-9]/g, '');
    if (PHONE_VALIDATION_PATTERN.test(cleanPhone)) {
      finalClientPhone = cleanPhone;
    }
  }
  
  // Si no hay número válido en client.contact_phone, intentar con realPhoneNumber
  if (!finalClientPhone && realPhoneNumber) {
    const cleanRealPhone = realPhoneNumber.replace(/[^0-9]/g, '');
    if (PHONE_VALIDATION_PATTERN.test(cleanRealPhone)) {
      finalClientPhone = cleanRealPhone;
    }
  }
  
  // Si aún no hay número válido, no mostrar el teléfono
  if (!finalClientPhone) {
    logSession(sessionId, `⚠️ No se pudo obtener número de teléfono válido (client.contact_phone: ${client.contact_phone}, realPhoneNumber: ${realPhoneNumber})`);
  } else {
    logSession(sessionId, `📱 Número mostrado en mensaje: ${finalClientPhone}`);
  }
  
  // Construir mensaje según el estado de la sesión
  let linkMessage = '';
  if (isSessionReady) {
    linkMessage = '✅ *Tu bot ya está activo y funcionando!*';
  } else if (hasQR) {
    linkMessage = '\n\n📱 *Escanea el código QR que te enviaré para vincular tu WhatsApp.*\n\n⚠️ *El QR expira en poco tiempo.* Si tarda o da error al escanear, escribe *"qr"* para solicitar uno nuevo.\n\n💡 *¿Necesitas enviarlo a otro número?* Escribe *"cambiar"* o *"otro número"* para elegir un destino diferente.';
  } else {
    linkMessage = '⏳ *Generando código QR...*\n\nTe lo enviaré en un momento.\n\n⚠️ *El QR expira en poco tiempo.* Si tarda o da error al escanear, escribe *"qr"* para solicitar uno nuevo.\n\n💡 *¿Necesitas enviarlo a otro número?* Escribe *"cambiar"* o *"otro número"* para elegir un destino diferente.';
  }
  
  // Construir línea de teléfono solo si hay un número válido
  const phoneLine = finalClientPhone ? `📱 Teléfono: ${finalClientPhone}\n` : '';
  
  return `🎉 *¡Listo! Tu bot está casi listo*

✅ Nombre: *${client.name}*
${client.contact_email ? `📧 Email: ${client.contact_email}\n` : ''}${phoneLine}
${linkMessage}

⏰ *Recuerda:* Tu prueba es válida por 7 días.`;
}
