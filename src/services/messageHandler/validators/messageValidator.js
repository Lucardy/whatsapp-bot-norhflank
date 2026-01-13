// Validador de mensajes - Filtrado y validación
import { logSession } from '../../../utils/logger/index.js';
import { shouldIgnoreMessage, shouldIgnoreEmptyMessage, shouldIgnoreOldMessage } from '../filters.js';
import { checkCooldown, getLastMessageTime } from '../cache.js';
import { isChatHumanManaged, markChatAsHumanManaged } from '../humanManager.js';

/**
 * Valida y filtra mensajes según múltiples criterios
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {string} texto - Texto del mensaje
 * @param {string} sessionType - Tipo de sesión ('master' o 'client')
 * @returns {Promise<{shouldIgnore: boolean, reason: string|null}>}
 */
export async function validateMessage(msg, sessionId, chatId, texto, sessionType) {
  // Filtrar mensajes propios, de grupos y de estado
  if (shouldIgnoreMessage(msg, sessionId)) {
    // Si el dueño envía un mensaje, marcar el chat como manejado por humano
    if (msg.fromMe) {
      if (chatId) {
        await markChatAsHumanManaged(sessionId, chatId);
      }
    }
    return { shouldIgnore: true, reason: 'Mensaje propio, grupo o estado' };
  }

  // Verificar si este chat está siendo manejado por humano
  // REGLA GENERAL: El bot SIEMPRE debe responder, excepto en casos específicos
  const textoLower = texto.toLowerCase().trim();
  const isMenuCommand = ['menú', 'menu', 'configurar', 'config', 'ayuda', 'help', 'probar', 'test', 'activar'].includes(textoLower);
  
  if (chatId && isChatHumanManaged(sessionId, chatId)) {
    // EXCEPCIÓN CRÍTICA: Si el usuario está en flujo de trial, SIEMPRE permitir que pase
    // Esto asegura que el bot responda durante todo el flujo de registro
    try {
      const { isInTrialFlow } = await import('../../../services/trialFlow/index.js');
      if (isInTrialFlow(chatId)) {
        logSession(sessionId, `🎁 Usuario en flujo de trial - Permitindo mensaje aunque chat esté manejado por humano`);
        // Continuar procesando - el flujo de trial tiene prioridad
        return { shouldIgnore: false, reason: null };
      }
    } catch (err) {
      logSession(sessionId, `⚠️ Error verificando flujo de trial: ${err?.message || err}`);
      // Continuar con la verificación normal
    }
    
    // Para sesiones MASTER: El bot SIEMPRE responde por defecto
    // Solo NO responder si es un cliente existente (el dueño está manejando manualmente)
    if (sessionType === 'master') {
      try {
        // Verificar si es un cliente existente
        const { detectKnownClient } = await import('../clientDetector.js');
        const clientInfo = await detectKnownClient(chatId, sessionId);
        
        if (clientInfo && clientInfo.id) {
          // Es cliente existente - el dueño está manejando la conversación, pausar bot
          logSession(sessionId, `⏭️ Ignorado: chat ${chatId} está siendo manejado por humano - Bot pausado (cliente existente: ${clientInfo.name})`);
          return { shouldIgnore: true, reason: 'Chat manejado por humano' };
        } else {
          // NO es cliente existente - es un nuevo contacto, el bot DEBE responder
          logSession(sessionId, `✅ Nuevo contacto en master - Bot responderá (iniciará flujo de trial si corresponde)`);
          // Continuar procesando normalmente
        }
      } catch (err) {
        logSession(sessionId, `⚠️ Error verificando si es cliente existente: ${err?.message || err}`);
        // Si hay error, permitir que pase (mejor responder que bloquear)
        logSession(sessionId, `✅ Continuando procesamiento (error al verificar cliente)`);
        // Continuar procesando
      }
    }
    // Para sesiones CLIENT: Solo permitir comandos del menú si el chat está manejado por humano
    else if (sessionType === 'client') {
      if (isMenuCommand) {
        logSession(sessionId, `🔓 Comando del menú detectado en chat manejado por humano - Procesando`);
        // Continuar procesando
      } else {
        logSession(sessionId, `⏭️ Ignorado: chat ${chatId} está siendo manejado por humano - Bot pausado`);
        return { shouldIgnore: true, reason: 'Chat manejado por humano' };
      }
    } else {
      // Otro tipo de sesión (no debería pasar, pero por seguridad)
      logSession(sessionId, `⏭️ Ignorado: chat ${chatId} está siendo manejado por humano - Bot pausado`);
      return { shouldIgnore: true, reason: 'Chat manejado por humano' };
    }
  }

  // Filtrar mensajes sin contenido
  if (shouldIgnoreEmptyMessage(msg, sessionId)) {
    return { shouldIgnore: true, reason: 'Mensaje sin contenido' };
  }

  // Filtrar mensajes antiguos
  if (shouldIgnoreOldMessage(msg, sessionId)) {
    return { shouldIgnore: true, reason: 'Mensaje antiguo' };
  }

  // Cooldown para evitar spam
  try {
    const { MESSAGE_COOLDOWN } = await import('../../../config/constants.js');
    if (checkCooldown(msg.from, MESSAGE_COOLDOWN)) {
      const last = getLastMessageTime(msg.from);
      const now = Date.now();
      logSession(sessionId, `⏭️ Ignorado: cooldown activo (último: ${last}, ahora: ${now}, diff: ${now - last})`);
      return { shouldIgnore: true, reason: 'Cooldown activo' };
    }
    logSession(sessionId, '✅ Cooldown actualizado');
  } catch (err) {
    logSession(sessionId, `⚠️ Error en cooldown: ${err?.message || err}`);
  }

  // Verificar si el remitente está en la lista de números de excepción (solo para sesiones de cliente)
  if (sessionType === 'client' && chatId) {
    try {
      const { getClientConfig } = await import('../../database/configService.js');
      const config = await getClientConfig(sessionId);
      
      if (config?.excluded_numbers && Array.isArray(config.excluded_numbers) && config.excluded_numbers.length > 0) {
        // Extraer el número del chatId (puede ser un número o un identificador largo)
        const phoneFromChatId = chatId.split('@')[0];
        
        // Normalizar el número del remitente para comparar
        const { normalizePhoneNumber } = await import('../../../utils/validation/phoneValidator.js');
        let normalizedRemitterPhone;
        try {
          normalizedRemitterPhone = normalizePhoneNumber(phoneFromChatId);
        } catch (err) {
          // Si no se puede normalizar, usar el número tal cual
          normalizedRemitterPhone = phoneFromChatId;
        }
        
        // Verificar si el número está en la lista de excepciones
        const isExcluded = config.excluded_numbers.some(excludedPhone => {
          // Comparar tanto el número normalizado como el número original
          return excludedPhone === normalizedRemitterPhone || excludedPhone === phoneFromChatId;
        });
        
        if (isExcluded) {
          logSession(sessionId, `🚫 Ignorado: número ${normalizedRemitterPhone} está en la lista de excepciones`);
          return { shouldIgnore: true, reason: 'Número en lista de excepciones' };
        }
      }
    } catch (err) {
      logSession(sessionId, `⚠️ Error verificando lista de excepciones: ${err?.message || err}`);
      // Continuar procesando si hay error (no bloquear por error de verificación)
    }
  }

  return { shouldIgnore: false, reason: null };
}

