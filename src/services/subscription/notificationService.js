// Servicio de notificaciones para suscripciones
import { logSession } from '../../utils/logger/index.js';
import { getClientById } from '../database/clientService.js';
import { getSessionByClientId } from '../database/sessionService.js';
import { getGlobalSessionManager } from '../sessionManager/global.js';

/**
 * Envía notificación cuando un cliente está suspendido
 * @param {number} clientId - ID del cliente
 * @returns {Promise<boolean>} true si se envió correctamente
 */
export async function sendSuspendedNotification(clientId) {
  try {
    const client = await getClientById(clientId);
    if (!client) {
      logSession('subscription', `⚠️ Cliente ${clientId} no encontrado para notificación`);
      return false;
    }

    // Obtener la sesión del cliente
    const clientSession = await getSessionByClientId(clientId, 'client');
    if (!clientSession || !clientSession.phone_number) {
      logSession('subscription', `⚠️ Cliente ${clientId} no tiene sesión o número para notificar`);
      return false;
    }

    const sessionManager = getGlobalSessionManager();
    if (!sessionManager) {
      logSession('subscription', `⚠️ SessionManager no disponible para enviar notificación`);
      return false;
    }

    const sessionData = sessionManager.getSession(clientSession.session_name);
    if (!sessionData || !sessionData.client) {
      logSession('subscription', `⚠️ Sesión ${clientSession.session_name} no está disponible`);
      return false;
    }

    const whatsappClient = sessionData.client;
    const clientPhone = clientSession.phone_number;

    // Verificar que el cliente esté listo y conectado
    if (!whatsappClient || !whatsappClient.info || !whatsappClient.info.wid) {
      logSession('subscription', `⚠️ Cliente de WhatsApp no está listo para cliente ${clientId}`);
      return false;
    }

    // Verificar que la sesión esté conectada
    if (!sessionData.isReady) {
      logSession('subscription', `⚠️ Sesión ${clientSession.session_name} no está conectada para cliente ${clientId}`);
      return false;
    }

    // Formatear número para WhatsApp
    const phoneFormatted = clientPhone.includes('@') 
      ? clientPhone 
      : `${clientPhone}@c.us`;

    // Generar link de pago
    const { generatePaymentLink } = await import('../payments/mercadopagoService.js');
    const paymentResult = await generatePaymentLink(clientId, null, 'subscription');
    
    let paymentLinkText = '';
    if (paymentResult.success && paymentResult.paymentLink) {
      paymentLinkText = `\n💳 *Pagar ahora:*\n${paymentResult.paymentLink}\n`;
    } else {
      paymentLinkText = `\n📞 *Contacta con nosotros* para reactivar tu cuenta y elegir un plan.\n`;
    }

    const message = `⚠️ *Tu cuenta ha sido suspendida*

Tu período de prueba gratuita de 7 días ha finalizado.

Para continuar usando el bot, necesitas activar una suscripción.${paymentLinkText}
Gracias por usar nuestro servicio.`;

    try {
      // Usar sendMessage directamente del cliente de WhatsApp
      // No necesitamos msg.reply porque no hay un mensaje entrante
      await whatsappClient.sendMessage(phoneFormatted, message);
      logSession('subscription', `✅ Notificación de suspensión enviada a cliente ${clientId} (${client.name}) al número ${phoneFormatted}`);
      return true;
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Error desconocido';
      logSession('subscription', `❌ Error enviando notificación de suspensión: ${errorMessage}`);
      logSession('subscription', `❌ Stack: ${error?.stack || 'N/A'}`);
      return false;
    }
  } catch (error) {
    logSession('subscription', `❌ Error en sendSuspendedNotification: ${error?.message || error}`);
    return false;
  }
}

/**
 * Envía notificación cuando quedan 1 día de prueba
 * @param {number} clientId - ID del cliente
 * @returns {Promise<boolean>} true si se envió correctamente
 */
export async function sendTrialExpiringNotification(clientId) {
  try {
    const client = await getClientById(clientId);
    if (!client) {
      logSession('subscription', `⚠️ Cliente ${clientId} no encontrado para notificación`);
      return false;
    }

    // Obtener la sesión del cliente
    const clientSession = await getSessionByClientId(clientId, 'client');
    if (!clientSession || !clientSession.phone_number) {
      logSession('subscription', `⚠️ Cliente ${clientId} no tiene sesión o número para notificar`);
      return false;
    }

    const sessionManager = getGlobalSessionManager();
    if (!sessionManager) {
      logSession('subscription', `⚠️ SessionManager no disponible para enviar notificación`);
      return false;
    }

    const sessionData = sessionManager.getSession(clientSession.session_name);
    if (!sessionData || !sessionData.client) {
      logSession('subscription', `⚠️ Sesión ${clientSession.session_name} no está disponible`);
      return false;
    }

    const whatsappClient = sessionData.client;
    const clientPhone = clientSession.phone_number;

    // Verificar que el cliente esté listo y conectado
    if (!whatsappClient || !whatsappClient.info || !whatsappClient.info.wid) {
      logSession('subscription', `⚠️ Cliente de WhatsApp no está listo para cliente ${clientId}`);
      return false;
    }

    // Verificar que la sesión esté conectada
    if (!sessionData.isReady) {
      logSession('subscription', `⚠️ Sesión ${clientSession.session_name} no está conectada para cliente ${clientId}`);
      return false;
    }

    // Formatear número para WhatsApp
    const phoneFormatted = clientPhone.includes('@') 
      ? clientPhone 
      : `${clientPhone}@c.us`;

    const message = `⏰ *Recordatorio: Tu prueba gratuita finaliza mañana*

Hola ${client.name},

Tu período de prueba gratuita de 7 días finaliza mañana.

Para continuar usando el bot después de mañana, necesitarás activar una suscripción.

📞 *Contacta con nosotros* para elegir un plan y mantener tu bot activo.

¡Gracias por usar nuestro servicio!`;

    try {
      // Usar sendMessage directamente del cliente de WhatsApp
      // No necesitamos msg.reply porque no hay un mensaje entrante
      await whatsappClient.sendMessage(phoneFormatted, message);
      logSession('subscription', `✅ Notificación de expiración enviada a cliente ${clientId} (${client.name}) al número ${phoneFormatted}`);
      return true;
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Error desconocido';
      logSession('subscription', `❌ Error enviando notificación de expiración: ${errorMessage}`);
      logSession('subscription', `❌ Stack: ${error?.stack || 'N/A'}`);
      return false;
    }
  } catch (error) {
    logSession('subscription', `❌ Error en sendTrialExpiringNotification: ${error?.message || error}`);
    return false;
  }
}
