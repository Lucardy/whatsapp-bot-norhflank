// Servicio para manejar el menú de opciones del cliente en su propia sesión
import { logSession } from '../../utils/logger/index.js';
import { getClientConfigById, updateClientConfigById } from '../database/configService.js';

/**
 * Verifica si el cliente está bloqueado (suspendido o trial expirado)
 * @param {Object} client - Cliente de la base de datos
 * @returns {Promise<boolean>} true si está bloqueado
 */
export async function isClientBlocked(client) {
  if (!client) return false;
  
  if (client.status === 'suspended') {
    return true;
  }
  
  if (client.status === 'trial') {
    const { getTrialDaysRemaining } = await import('../subscription/subscriptionService.js');
    const daysRemaining = getTrialDaysRemaining(client.created_at);
    return daysRemaining <= 0;
  }
  
  return false;
}

export async function showClientMenu(clientId, sessionId) {
  try {
    const config = await getClientConfigById(clientId, sessionId);
    const { getClientById } = await import('../database/clientService.js');
    const client = await getClientById(clientId);
    
    const botStatus = config?.bot_enabled !== false ? '✅ Activado' : '❌ Desactivado';
    const accountStatus = client?.status || 'unknown';
    
    // Verificar si el cliente está bloqueado
    const isBlocked = await isClientBlocked(client);
    
    let statusMessage = '';
    if (accountStatus === 'suspended') {
      statusMessage = `\n🚫 *Estado de cuenta:* Suspendida\n\n`;
      statusMessage += `⚠️ *Tu período de prueba ha finalizado.*\n\n`;
      statusMessage += `💳 *Para continuar usando el bot y aprovechar todos los beneficios, necesitas activar una suscripción.*\n\n`;
      statusMessage += `📞 *Contacta con nosotros* para elegir un plan y mantener tu bot activo.\n`;
    } else if (accountStatus === 'trial') {
      const { getTrialDaysRemaining } = await import('../subscription/subscriptionService.js');
      const daysRemaining = getTrialDaysRemaining(client.created_at);
      if (daysRemaining > 0) {
        statusMessage = `\n⏰ *Prueba:* ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} restante${daysRemaining !== 1 ? 's' : ''}\n`;
      } else {
        statusMessage = `\n⚠️ *Prueba:* Finalizada\n\n`;
        statusMessage += `💳 *Para continuar usando el bot y aprovechar todos los beneficios, necesitas activar una suscripción.*\n\n`;
        statusMessage += `📞 *Contacta con nosotros* para elegir un plan y mantener tu bot activo.\n`;
      }
    } else if (accountStatus === 'active') {
      statusMessage = `\n✅ *Estado de cuenta:* Activa\n`;
    }
    
    // Si está bloqueado, solo mostrar el mensaje de pago sin opciones
    if (isBlocked) {
      return `🚫 *Cuenta Suspendida*

${statusMessage}

0️⃣ *Salir del menú*

Escribe "0" o "salir" para salir del menú.`;
    }
    
    // Si no está bloqueado, mostrar el menú completo
    return `⚙️ *Menú de Configuración*

📊 *Estado del bot:* ${botStatus}${statusMessage}

*Opciones disponibles:*

1️⃣ *Configurar respuestas*
   Personaliza los mensajes y opciones de tu bot

2️⃣ *${config?.bot_enabled !== false ? 'Desactivar' : 'Activar'} bot*
   ${config?.bot_enabled !== false ? 'Pausa las respuestas automáticas' : 'Reanuda las respuestas automáticas'}

3️⃣ *Ver configuración actual*
   Muestra tu mensaje de bienvenida y opciones configuradas

4️⃣ *Ayuda*
   Guía de uso y comandos disponibles

5️⃣ *Probar bot (Modo Test)*
   Prueba cómo funciona tu bot sin activarlo

6️⃣ *Estadísticas*
   Ver métricas y uso de tu bot

0️⃣ *Salir del menú*

Escribe el número de la opción que deseas.`;
  } catch (err) {
    logSession(sessionId, `❌ Error mostrando menú de cliente: ${err?.message || err}`);
    return '❌ Hubo un error al mostrar el menú. Por favor, intenta nuevamente.';
  }
}

/**
 * Activa o desactiva el bot
 * @param {number} clientId - ID del cliente
 * @param {boolean} enabled - true para activar, false para desactivar
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<string>} Mensaje de confirmación
 */
export async function toggleBot(clientId, enabled, sessionId) {
  try {
    // Verificar estado de la cuenta antes de permitir activar
    if (enabled) {
      const { getClientById } = await import('../database/clientService.js');
      const client = await getClientById(clientId);
      
      if (!client) {
        logSession(sessionId, `⚠️ Cliente ${clientId} no encontrado al intentar activar bot`);
        return '❌ *Error*\n\nNo se pudo encontrar tu cuenta. Por favor, contacta con soporte.';
      }
      
      // Si está suspendido, no permitir activar
      if (client.status === 'suspended') {
        logSession(sessionId, `⚠️ Cliente ${clientId} intentó activar bot pero está suspendido`);
        return `🚫 *No se puede activar el bot*

Tu período de prueba ha finalizado y tu cuenta está suspendida.

💳 *Para continuar usando el bot, necesitas activar una suscripción.*

📞 *Contacta con nosotros* para elegir un plan y mantener tu bot activo.`;
      }
      
      // Si está en trial pero ya expiró, no permitir activar
      if (client.status === 'trial') {
        const { getTrialDaysRemaining } = await import('../subscription/subscriptionService.js');
        const daysRemaining = getTrialDaysRemaining(client.created_at);
        
        if (daysRemaining <= 0) {
          logSession(sessionId, `⚠️ Cliente ${clientId} intentó activar bot pero el trial expiró (${daysRemaining} días restantes)`);
          return `🚫 *No se puede activar el bot*

Tu período de prueba ha finalizado.

💳 *Para continuar usando el bot, necesitas activar una suscripción.*

📞 *Contacta con nosotros* para elegir un plan y mantener tu bot activo.`;
        }
      }
    }
    
    await updateClientConfigById(clientId, { bot_enabled: enabled }, sessionId);
    const status = enabled ? 'activado' : 'desactivado';
    logSession(sessionId, `✅ Bot ${status} para cliente ${clientId}`);
    
    return `✅ *Bot ${status}*

${enabled 
  ? '🤖 Tu bot ahora responderá automáticamente a los mensajes entrantes.' 
  : '⏸️ Tu bot está pausado y no responderá automáticamente.\n\nPuedes reactivarlo desde el menú cuando lo desees.'}`;
  } catch (err) {
    logSession(sessionId, `❌ Error ${enabled ? 'activando' : 'desactivando'} bot: ${err?.message || err}`);
    return `❌ Hubo un error al ${enabled ? 'activar' : 'desactivar'} el bot. Por favor, intenta nuevamente.`;
  }
}

/**
 * Verifica si el bot está activo para un cliente
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<boolean>} true si el bot está activo
 */
export async function isBotEnabled(clientId, sessionId) {
  try {
    const config = await getClientConfigById(clientId, sessionId);
    // Por defecto, el bot está DESACTIVADO si no hay configuración o si bot_enabled es false
    // El cliente debe activarlo manualmente después de configurarlo
    return config?.bot_enabled === true;
  } catch (err) {
    logSession(sessionId, `⚠️ Error verificando estado del bot: ${err?.message || err}`);
    // Por defecto, asumir que está DESACTIVADO si hay error (más seguro)
    return false;
  }
}

