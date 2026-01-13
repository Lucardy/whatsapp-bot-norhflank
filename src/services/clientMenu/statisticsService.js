// Servicio de estadísticas para clientes
import { logSession } from '../../utils/logger/index.js';
import * as clientRepository from '../../repositories/clientRepository.js';
import * as sessionRepository from '../../repositories/sessionRepository.js';
import * as messageRepository from '../../repositories/messageRepository.js';
import { getSessionByName } from '../database/sessionService.js';

/**
 * Obtiene estadísticas de un cliente
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<Object>} Estadísticas del cliente
 */
export async function getClientStatistics(clientId, sessionId) {
  try {
    // Obtener información del cliente usando repositorio
    const client = await clientRepository.getClientById(clientId);
    
    if (!client) {
      logSession(sessionId, `⚠️ Cliente ${clientId} no encontrado`);
      return null;
    }
    
    const clientSession = client.sessions?.find(s => s.session_type === 'client');
    if (!clientSession) {
      logSession(sessionId, `⚠️ Cliente ${clientId} no tiene sesión`);
      return null;
    }
    
    // Obtener estadísticas de mensajes usando repositorio
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    // Mensajes recibidos (hoy, esta semana, este mes)
    // Nota: session_id en Message se refiere al ID de WhatsAppSession
    const messagesToday = await messageRepository.countMessages(clientSession.id, 'inbound', today);
    const messagesThisWeek = await messageRepository.countMessages(clientSession.id, 'inbound', weekAgo);
    const messagesThisMonth = await messageRepository.countMessages(clientSession.id, 'inbound', monthAgo);
    
    // Opción más usada (analizar mensajes que contienen números 1-8)
    const optionUsage = {};
    const messagesWithOptions = await messageRepository.getMessagesWithOptions(
      clientSession.id,
      ['1', '2', '3', '4', '5', '6', '7', '8'],
      monthAgo
    );
    
    messagesWithOptions.forEach(msg => {
      const option = msg.message_body;
      if (option) {
        optionUsage[option] = (optionUsage[option] || 0) + 1;
      }
    });
    
    const mostUsedOption = Object.keys(optionUsage).length > 0
      ? Object.keys(optionUsage).reduce((a, b) => 
          optionUsage[a] > optionUsage[b] ? a : b
        )
      : null;
    
    // Días restantes de prueba (si está en trial)
    let daysRemaining = null;
    if (client.status === 'trial') {
      const createdAt = new Date(client.created_at);
      const daysSinceCreation = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(0, 7 - daysSinceCreation);
    }
    
    // Estado de la sesión
    const sessionData = await getSessionByName(clientSession.session_name);
    const sessionStatus = sessionData?.status || 'unknown';
    const isConnected = sessionStatus === 'connected';
    
    // Última actividad
    const lastMessage = await messageRepository.getLastMessage(clientSession.id);
    const lastActivity = lastMessage?.created_at || client.updated_at || client.created_at;
    
    return {
      clientName: client.name,
      status: client.status,
      daysRemaining,
      messagesToday,
      messagesThisWeek,
      messagesThisMonth,
      mostUsedOption: mostUsedOption ? parseInt(mostUsedOption) : null,
      optionUsageCount: mostUsedOption ? optionUsage[mostUsedOption] : 0,
      isConnected,
      sessionStatus,
      lastActivity,
      botEnabled: client.config?.bot_enabled || false
    };
  } catch (error) {
    logSession(sessionId, `❌ Error obteniendo estadísticas: ${error?.message || error}`);
    return null;
  }
}

/**
 * Formatea las estadísticas en un mensaje legible
 * @param {Object} stats - Estadísticas del cliente
 * @returns {string} Mensaje formateado
 */
export function formatStatisticsMessage(stats) {
  if (!stats) {
    return '❌ *Error al obtener estadísticas*\n\nNo se pudieron cargar las estadísticas en este momento.';
  }
  
  let message = `📊 *Estadísticas de tu Bot*\n\n`;
  
  // Estado general
  message += `*Estado:* ${stats.isConnected ? '🟢 Conectado' : '🔴 Desconectado'}\n`;
  message += `*Bot:* ${stats.botEnabled ? '✅ Activado' : '⏸️ Desactivado'}\n\n`;
  
  // Mensajes recibidos
  message += `*Mensajes recibidos:*\n`;
  message += `📨 Hoy: *${stats.messagesToday}*\n`;
  message += `📨 Esta semana: *${stats.messagesThisWeek}*\n`;
  message += `📨 Este mes: *${stats.messagesThisMonth}*\n\n`;
  
  // Opción más usada
  if (stats.mostUsedOption) {
    message += `*Opción más usada:*\n`;
    message += `🔝 Opción *${stats.mostUsedOption}* (${stats.optionUsageCount} veces este mes)\n\n`;
  } else {
    message += `*Opción más usada:*\n`;
    message += `📊 Aún no hay datos suficientes\n\n`;
  }
  
  // Estado de suscripción
  if (stats.status === 'trial' && stats.daysRemaining !== null) {
    message += `*Período de prueba:*\n`;
    if (stats.daysRemaining > 0) {
      message += `⏰ *${stats.daysRemaining} día${stats.daysRemaining !== 1 ? 's' : ''} restante${stats.daysRemaining !== 1 ? 's' : ''}*\n\n`;
    } else {
      message += `⚠️ *Prueba finalizada*\n\n`;
    }
  } else if (stats.status === 'suspended') {
    message += `*Estado de cuenta:*\n`;
    message += `🚫 *Cuenta suspendida*\n\n`;
    message += `Tu período de prueba ha finalizado. Para continuar usando el bot, necesitas activar una suscripción.\n\n`;
    message += `📞 *Contacta con nosotros* para reactivar tu cuenta.\n\n`;
  } else if (stats.status === 'active') {
    message += `*Estado de cuenta:*\n`;
    message += `✅ *Cuenta activa*\n\n`;
  }
  
  // Última actividad
  if (stats.lastActivity) {
    const lastActivityDate = new Date(stats.lastActivity);
    const hoursAgo = Math.floor((Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60));
    let lastActivityText;
    if (hoursAgo < 1) {
      lastActivityText = 'Hace menos de 1 hora';
    } else if (hoursAgo < 24) {
      lastActivityText = `Hace ${hoursAgo} hora${hoursAgo !== 1 ? 's' : ''}`;
    } else {
      const daysAgo = Math.floor(hoursAgo / 24);
      lastActivityText = `Hace ${daysAgo} día${daysAgo !== 1 ? 's' : ''}`;
    }
    message += `*Última actividad:*\n`;
    message += `🕐 ${lastActivityText}\n`;
  }
  
  return message;
}

