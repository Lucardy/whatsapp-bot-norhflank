// Construcción de mensajes para el flujo de prueba gratuita

/**
 * Construye el mensaje de pairing code
 * @param {string|null} pairingCode - Código de pairing o null
 * @returns {string} Mensaje formateado
 */
export function buildPairingCodeMessage(pairingCode) {
  if (pairingCode) {
    return `\n\n🔐 *Código de vinculación:*

*${pairingCode}*

📱 *Cómo vincular:*
1. Abre WhatsApp en tu celular
2. Ve a *Configuración* → *Dispositivos vinculados*
3. Toca *Vincular con número*
4. Ingresa el código de arriba`;
  } else {
    return '\n\n⏳ *Generando código de vinculación...*\n\nTe lo enviaré en un momento.';
  }
}

/**
 * Construye mensaje para cliente existente
 * @param {Object} client - Cliente existente
 * @param {string|null} pairingCode - Código de pairing o null (no usado si se usa QR)
 * @param {boolean} requestFailed - Si la solicitud falló pero se envió a WhatsApp (no usado si se usa QR)
 * @returns {string} Mensaje formateado
 */
export function buildExistingClientMessage(client, pairingCode, requestFailed = false) {
  const emailLine = client.contact_email ? `\n📧 Email: ${client.contact_email}` : '';
  // Usar QR en lugar de pairing code
  const linkMessage = '\n\n📱 *Escanea el código QR que te enviaré para vincular tu WhatsApp.*';
  
  return `✅ *Ya estás registrado*\n\n👤 Nombre: *${client.name}*${emailLine}${linkMessage}`;
}

/**
 * Construye mensaje para sesión pendiente
 * @param {Object} pendingSession - Sesión pendiente
 * @param {string|null} pairingCode - Código de pairing o null (no usado si se usa QR)
 * @param {boolean} requestFailed - Si la solicitud falló pero se envió a WhatsApp (no usado si se usa QR)
 * @returns {string} Mensaje formateado
 */
export function buildPendingSessionMessage(pendingSession, pairingCode, requestFailed = false) {
  const emailLine = pendingSession.client.contact_email ? `\n📧 Email: ${pendingSession.client.contact_email}` : '';
  // Usar QR en lugar de pairing code
  const linkMessage = '\n\n📱 *Escanea el código QR que te enviaré para vincular tu WhatsApp.*';
  
  return `🔄 *Ya tienes una cuenta de prueba*\n\n👤 Nombre: *${pendingSession.client.name}*${emailLine}${linkMessage}`;
}

/**
 * Construye mensaje de inicio del flujo
 * @returns {string} Mensaje de bienvenida
 */
export function buildWelcomeMessage() {
  return `🎁 *¡Prueba Gratuita de Bot de WhatsApp!*

✨ *7 días gratis* con un bot personalizado que responde automáticamente por ti.

📝 Para comenzar, solo necesito tu nombre:

💡 Escribe "cancelar" si quieres salir.`;
}

