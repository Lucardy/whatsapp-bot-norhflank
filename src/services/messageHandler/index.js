// Procesador principal de mensajes de WhatsApp - Orquestador
import { logSession } from '../../utils/logger/index.js';
import { shouldIgnoreMessage, shouldIgnoreEmptyMessage, shouldIgnoreOldMessage, setBotStartTime } from './filters.js';
import { checkCooldown, clearConfigCache, getLastMessageTime } from './cache.js';
import { isChatHumanManaged, markChatAsHumanManaged, markBotSentMessage } from './humanManager.js';
import { detectKnownClient } from './clientDetector.js';
import { getResponses } from './responseBuilder.js';
import { hasWelcomeBeenSent, markWelcomeSent, isValidOption, resetConversationState } from './conversationState.js';
import { handleOption5, handleOption6, handleStandardOption } from './handlers/optionHandlers.js';
import { handleTrialFlow, handleConfigurationFlow } from './handlers/flowHandlers.js';
import { sendWelcomeMessage } from './handlers/welcomeHandler.js';

// Mapa de tiempos de inicio por sesión (cuando cada sesión se conectó)
const sessionReadyTimes = new Map();

/**
 * Establece el tiempo en que una sesión se marcó como "ready"
 * @param {string} sessionId - ID de la sesión
 * @param {number} timestamp - Tiempo en milisegundos
 */
export function setSessionReadyTime(sessionId, timestamp) {
  sessionReadyTimes.set(sessionId, timestamp);
  logSession(sessionId, `⏱️ Tiempo de ready establecido: ${new Date(timestamp).toISOString()}`);
}

/**
 * Obtiene el tiempo en que una sesión se marcó como "ready"
 * @param {string} sessionId - ID de la sesión
 * @returns {number|null} Timestamp o null si no existe
 */
export function getSessionReadyTime(sessionId) {
  return sessionReadyTimes.get(sessionId) || null;
}

// Re-exportar funciones necesarias para otros módulos
export { markChatAsHumanManaged, isChatHumanManaged } from './humanManager.js';
export { clearConfigCache } from './cache.js';
export { setBotStartTime } from './filters.js';

// Re-exportar sendQRImage para uso externo
export { sendQRImage } from './handlers/qrImageHandler.js';

/**
 * Procesa un mensaje entrante y envía la respuesta correspondiente
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión que recibió el mensaje
 */
export async function handleMessage(msg, sessionId) {
  const msgId = msg.id?._serialized || msg.id || 'unknown';
  
  try {
    // Validar que la sesión esté disponible antes de procesar
    const { getGlobalSessionManager } = await import('../sessionManager/global.js');
    const sessionManager = getGlobalSessionManager();
    
    if (sessionManager) {
      const sessionData = sessionManager.getSession(sessionId);
      if (!sessionData || !sessionData.client) {
        logSession(sessionId, '⚠️ Sesión no disponible, ignorando mensaje');
        return;
      }
      
      // Validar que el cliente esté conectado
      try {
        const state = await sessionData.client.getState();
        if (state !== 'CONNECTED') {
          logSession(sessionId, `⚠️ Cliente no conectado (estado: ${state}), ignorando mensaje`);
          return;
        }
      } catch (stateError) {
        logSession(sessionId, `⚠️ Error verificando estado: ${stateError?.message || stateError}`);
        return;
      }
    }
    // ANTES de filtrar: Verificar si es un mensaje del dueño en sesión master para modo admin
    // Esto debe procesarse ANTES de shouldIgnoreMessage porque fromMe=true normalmente se ignora
    if (msg.fromMe) {
      const targetPhone = (msg.to || msg.from || '').split('@')[0] || '';
      const texto = (msg.body || '').trim();
      
      // Si el mensaje está vacío, ignorarlo
      if (!texto) {
        return;
      }
      
      const { getSessionType } = await import('../database/sessionService.js');
      const sessionType = await getSessionType(sessionId);
      
      if (sessionType === 'master') {
        // Verificar si el dueño está enviando un mensaje a sí mismo
        const { isOwnerPhone, isInAdminMode } = await import('../adminFlow.js');
        const isOwner = await isOwnerPhone(targetPhone, sessionId);
        
        if (isOwner) {
          // Verificar si ya está en modo admin PRIMERO (antes de verificar mensajes del bot)
          const inAdminMode = isInAdminMode(targetPhone);
          logSession(sessionId, `🔐 Verificando modo admin: phone=${targetPhone}, inAdminMode=${inAdminMode}, texto="${texto}"`);
          
          if (inAdminMode) {
            // En modo admin, primero verificar si el mensaje es del bot (por contenido)
            // NO usar isRecentBotMessage porque bloquea los mensajes del usuario también
            const textoLower = texto.toLowerCase();
            const botMenuIndicators = [
              'menú de administración',
              'opciones disponibles',
              'total de sesiones',
              'bot está corriendo',
              'escribe el número',
              'selecciona una sesión',
              'agregar nueva sesión',
              'qué tipo de sesión',
              'sesiones configuradas',
              'números maestro',
              'clientes:'
            ];
            const isBotMenu = botMenuIndicators.some(indicator => textoLower.includes(indicator));
            
            if (isBotMenu) {
              logSession(sessionId, `⏭️ Ignorado: mensaje contiene texto del menú del bot en modo admin (evitando bucle infinito)`);
              return; // Ignorar mensajes que contienen texto del menú del bot
            }
            
            // Si el mensaje es muy largo (más de 200 caracteres), probablemente es del bot
            if (texto.length > 200) {
              logSession(sessionId, `⏭️ Ignorado: mensaje muy largo en modo admin (${texto.length} caracteres), probablemente del bot`);
              return;
            }
            
            // Si el mensaje es corto y no contiene texto del menú, es un mensaje del usuario
            // Procesarlo directamente sin verificar isRecentBotMessage
            logSession(sessionId, `🔐 Procesando paso de administración para ${targetPhone}, texto: "${texto}"`);
            const { handleAdminStep } = await import('../adminFlow.js');
            const adminResult = await handleAdminStep(targetPhone, texto, sessionId);
            logSession(sessionId, `🔐 Resultado de handleAdminStep: response=${!!adminResult.response}, completed=${adminResult.completed}, cancelled=${adminResult.cancelled}`);
            
            if (adminResult.response) {
              try {
                const { markBotSentMessage } = await import('./humanManager.js');
                const { BOT_MESSAGE_REGISTER_DELAY } = await import('../../config/constants.js');
                // Marcar ANTES de enviar para evitar que el mensaje del bot active el flujo de nuevo
                markBotSentMessage(sessionId, targetPhone);
                await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
                await msg.reply(adminResult.response);
                logSession(sessionId, '✅ Respuesta de administración enviada');
              } catch (err) {
                logSession(sessionId, `❌ Error enviando respuesta admin: ${err?.message || err}`);
              }
            } else {
              logSession(sessionId, `⚠️ handleAdminStep no devolvió respuesta para texto: "${texto}"`);
            }
            return; // Procesado - NO continuar con el filtro normal
          } else {
            // No está en modo admin, verificar primero si es un mensaje reciente del bot
            // Esto previene bucles infinitos cuando el bot envía el menú
            const { isRecentBotMessage } = await import('./humanManager.js');
            
            if (targetPhone && isRecentBotMessage(sessionId, targetPhone)) {
              logSession(sessionId, `⏭️ Ignorado: mensaje propio reciente del bot (evitando bucle infinito)`);
              return; // Ignorar mensajes recientes del bot
            }
            
            // Si el mensaje contiene texto del menú del bot, definitivamente es del bot y debe ignorarse
            const textoLower = texto.toLowerCase();
            const botMenuIndicators = [
              'menú de administración',
              'opciones disponibles',
              'total de sesiones',
              'bot está corriendo',
              'escribe el número',
              'selecciona una sesión',
              'agregar nueva sesión',
              'qué tipo de sesión'
            ];
            const isBotMenu = botMenuIndicators.some(indicator => textoLower.includes(indicator));
            
            if (isBotMenu) {
              logSession(sessionId, `⏭️ Ignorado: mensaje contiene texto del menú del bot (evitando bucle infinito)`);
              return; // Ignorar mensajes que contienen texto del menú del bot
            }
            
            // Si el mensaje es muy largo (más de 200 caracteres), probablemente es del bot
            if (texto.length > 200) {
              logSession(sessionId, `⏭️ Ignorado: mensaje muy largo (${texto.length} caracteres), probablemente del bot`);
              return;
            }
            
            // Verificar si es una palabra clave para activarlo
            const adminKeywords = ['admin', 'gestionar', 'gestion', 'menu admin', 'administrar', '🔐'];
            const isAdminKeyword = adminKeywords.some(keyword => {
              // Verificar que la palabra clave esté presente
              const keywordIndex = textoLower.indexOf(keyword);
              if (keywordIndex === -1) return false;
              
              // Si el mensaje es muy corto (solo la palabra clave o similar), es válido
              if (texto.length <= keyword.length + 10) return true;
              
              // Si el mensaje es largo pero contiene la palabra clave al inicio, también es válido
              // (para casos como "admin 1" o "gestionar clientes")
              return keywordIndex < 20; // Palabra clave en los primeros 20 caracteres
            });
            
            if (isAdminKeyword) {
              // Iniciar modo admin
              logSession(sessionId, `🔐 Mensaje del dueño detectado para modo admin: ${targetPhone}, texto: "${texto}"`);
              logSession(sessionId, `🔐 Activando modo administración para ${targetPhone}`);
              const { startAdminFlow } = await import('../adminFlow.js');
              const startMessage = await startAdminFlow(targetPhone, sessionId);
              try {
                const { markBotSentMessage } = await import('./humanManager.js');
                const { BOT_MESSAGE_REGISTER_DELAY } = await import('../../config/constants.js');
                // Marcar ANTES de enviar para evitar que el mensaje del bot active el flujo de nuevo
                markBotSentMessage(sessionId, targetPhone);
                await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
                await msg.reply(startMessage);
                logSession(sessionId, '✅ Menú de administración enviado');
              } catch (err) {
                logSession(sessionId, `❌ Error enviando menú admin: ${err?.message || err}`);
              }
              return; // Procesado - NO continuar con el filtro normal
            }
          }
        } else {
          logSession(sessionId, `⚠️ Intento de activar admin desde número no autorizado: ${targetPhone}`);
        }
      }
    }
    
    // Filtrar mensajes propios, de grupos y de estado PRIMERO (antes de loggear)
    if (shouldIgnoreMessage(msg, sessionId)) {
      // Si el dueño envía un mensaje, marcar el chat como manejado por humano
      // PERO solo si NO es un mensaje reciente del bot y NO está en modo admin
      // (markChatAsHumanManaged ya verifica esto)
      if (msg.fromMe) {
        const chatId = (msg.to || msg.from || '').split('@')[0] || '';
        if (chatId) {
          // markChatAsHumanManaged ya verifica internamente si es un mensaje reciente del bot
          // y si está en modo administración
          await markChatAsHumanManaged(sessionId, chatId);
        }
      }
      return; // Ignorar silenciosamente mensajes propios, grupos y estados
    }

    // Verificar si este chat está siendo manejado por humano
    const chatId = (msg.from || '').split('@')[0] || '';
    if (chatId && isChatHumanManaged(sessionId, chatId)) {
      logSession(sessionId, `⏭️ Ignorado: chat ${chatId} está siendo manejado por humano - Bot pausado`);
      return;
    }

    // Filtrar mensajes sin contenido
    if (shouldIgnoreEmptyMessage(msg, sessionId)) {
      return;
    }

    // Filtrar mensajes antiguos
    if (shouldIgnoreOldMessage(msg, sessionId)) {
      return;
    }

    const texto = (msg.body || '').trim();
    const messageTimestamp = msg.timestamp ? msg.timestamp * 1000 : null;

    logSession(sessionId, '📨 ========== MENSAJE RECIBIDO ==========');
    logSession(sessionId, '📨 ID:', msgId);
    logSession(sessionId, '📨 From:', msg.from);
    logSession(sessionId, '📨 Body:', texto.substring(0, 100));
    logSession(sessionId, '📨 FromMe:', msg.fromMe);
    logSession(sessionId, '📨 IsGroup:', msg.from?.endsWith('@g.us'));
    logSession(sessionId, '📨 Timestamp:', messageTimestamp ? new Date(messageTimestamp).toISOString() : 'N/A');

    // Cooldown para evitar spam
    try {
      const { MESSAGE_COOLDOWN } = await import('../../config/constants.js');
      if (checkCooldown(msg.from, MESSAGE_COOLDOWN)) {
        const last = getLastMessageTime(msg.from);
        const now = Date.now();
        logSession(sessionId, '⏭️ Ignorado: cooldown activo (último:', last, 'ahora:', now, 'diff:', now - last);
        return;
      }
      logSession(sessionId, '✅ Cooldown actualizado');
    } catch (err) {
      logSession(sessionId, '⚠️ Error en cooldown:', err?.message || err);
    }

    const textoLower = texto.toLowerCase();
    
    logSession(sessionId, '✅ Procesando mensaje - texto:', texto, 'teléfono:', chatId);

    // Obtener el tipo de sesión para determinar cómo obtener el cliente
    const { getSessionType, getSessionByName } = await import('../database/sessionService.js');
    const sessionType = await getSessionType(sessionId);
    
    let clientName = null;
    let clientId = null;
    
    if (sessionType === 'master') {
      // Para sesiones maestro: buscar si el remitente es un cliente conocido
      const clientInfo = await detectKnownClient(chatId, sessionId);
      clientName = clientInfo?.name || null;
      clientId = clientInfo?.id || null;
    } else if (sessionType === 'client') {
      // Para sesiones cliente: obtener el cliente dueño de esta sesión
      const session = await getSessionByName(sessionId);
      if (session?.client) {
        clientId = session.client.id;
        clientName = session.client.name;
        logSession(sessionId, `👤 Sesión de cliente detectada - Cliente: ${clientName} (ID: ${clientId})`);
      } else {
        logSession(sessionId, `⚠️ Sesión de tipo 'client' pero no tiene cliente asociado`);
      }
    }

    // Manejar flujos conversacionales (trial, configuración)
    const trialHandled = await handleTrialFlow(msg, sessionId, chatId, texto);
    if (trialHandled) {
      return; // Mensaje procesado por el flujo de trial
    }
    
    const configHandled = await handleConfigurationFlow(msg, sessionId, chatId, clientId, texto);
    if (configHandled) {
      return; // Mensaje procesado por el flujo de configuración
    }

    // Obtener respuestas (desde DB o fallback, con personalización si es cliente conocido)
    const responses = await getResponses(sessionId, clientName, clientId);

    // Verificar si es una opción válida
    const isOptionValid = isValidOption(texto);
    
    // Verificar si el mensaje es muy antiguo (más del timeout configurado)
    // Si es así, tratarlo como un nuevo contacto y resetear el estado
    const { CONVERSATION_TIMEOUT, MS_PER_MINUTE } = await import('../../config/constants.js');
    const messageAge = messageTimestamp ? (Date.now() - messageTimestamp) : 0;
    const messageAgeMinutes = messageAge / MS_PER_MINUTE;
    const isOldMessage = messageTimestamp && messageAge > CONVERSATION_TIMEOUT;
    
    // Solo resetear si el mensaje es muy antiguo
    const shouldResetState = isOldMessage;
    
    if (shouldResetState) {
      if (CONVERSATION_TIMEOUT === 0) {
        logSession(sessionId, `🔄 Modo testing: reseteando estado para enviar bienvenida`);
      } else {
        logSession(sessionId, `🕐 Mensaje antiguo detectado (${messageAgeMinutes.toFixed(0)} minutos de antigüedad) - Tratando como nuevo contacto`);
      }
      // Resetear el estado de conversación para este chat
      const { resetConversationState } = await import('./conversationState.js');
      resetConversationState(sessionId, chatId);
    }
    
    // Verificar si ya se envió el mensaje de bienvenida
    const welcomeSent = hasWelcomeBeenSent(sessionId, chatId);

    // Si NO es una opción válida y ya se envió el mensaje de bienvenida, mostrar mensaje de opción inválida
    if (!isOptionValid && welcomeSent) {
      logSession(sessionId, `⚠️ Mensaje no reconocido: "${texto}" - Enviando mensaje de opción inválida`);
      try {
        // Marcar ANTES de enviar para evitar que se detecte como acción humana
        markBotSentMessage(sessionId, chatId);
        // Pequeño delay para asegurar que el registro se procese antes del listener
        const { BOT_MESSAGE_REGISTER_DELAY } = await import('../../config/constants.js');
        await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
        const invalidMessage = responses.invalid_option || responses.default;
        await msg.reply(invalidMessage);
        logSession(sessionId, '✅ Mensaje de opción inválida enviado');
      } catch (replyError) {
        logSession(sessionId, `❌ Error al enviar mensaje de opción inválida:`, replyError?.message || replyError);
      }
      return; // No procesar más
    }

    // Si NO es una opción válida y NO se ha enviado el mensaje de bienvenida
    // Si el estado fue reseteado (shouldResetState), enviar bienvenida
    // Si no, mostrar mensaje de ayuda recordando las opciones disponibles
    if (!isOptionValid && !welcomeSent) {
      if (shouldResetState) {
        // El estado fue reseteado, así que este es un nuevo contacto - continuar con el flujo de bienvenida
        logSession(sessionId, `📨 Estado reseteado detectado - Continuando con envío de bienvenida`);
        // Continuar con el flujo de bienvenida más abajo (no hacer return aquí)
      } else {
        // No se reseteó el estado, pero el usuario escribió algo inválido
        // Mostrar mensaje de ayuda con las opciones disponibles
        logSession(sessionId, `💡 Usuario escribió algo inválido sin haber recibido bienvenida - Mostrando opciones disponibles`);
        try {
          // Marcar ANTES de enviar para evitar que se detecte como acción humana
          markBotSentMessage(sessionId, chatId);
          // Pequeño delay para asegurar que el registro se procese antes del listener
          const { BOT_MESSAGE_REGISTER_DELAY } = await import('../../config/constants.js');
          await new Promise(resolve => setTimeout(resolve, BOT_MESSAGE_REGISTER_DELAY));
          // Enviar mensaje de bienvenida completo para recordar las opciones
          await sendWelcomeMessage(msg, sessionId, chatId, responses);
          logSession(sessionId, '✅ Mensaje de bienvenida enviado como ayuda');
        } catch (replyError) {
          logSession(sessionId, `❌ Error al enviar mensaje de ayuda:`, replyError?.message || replyError);
        }
        return; // Procesado
      }
    }

    // Si es una opción válida (1, 2, 3, 4, 5, 6, configurar, etc.)
    if (isOptionValid) {
      // Opción 6: Test de imagen
      if (textoLower === '6' || textoLower === 'test imagen' || textoLower === 'testimagen') {
        await handleOption6(msg, sessionId, chatId);
        return;
      }
      
      // Opción 5: Prueba gratuita
      if (textoLower === '5' || textoLower === 'prueba gratuita' || textoLower === 'prueba') {
        await handleOption5(msg, sessionId, chatId);
        return;
      }
      
      // Opciones estándar (1-4)
      await handleStandardOption(msg, sessionId, chatId, textoLower, responses);
      return; // Procesado
    }

    // Si NO se ha enviado el mensaje de bienvenida y es el primer contacto, enviar bienvenida
    if (!welcomeSent) {
      await sendWelcomeMessage(msg, sessionId, chatId, responses);
      return; // Procesado
    }

    logSession(sessionId, '📨 ========== FIN PROCESAMIENTO MENSAJE ==========');
  } catch (error) {
    logSession(sessionId, '❌ Error procesando mensaje:', error?.message || error);
    logSession(sessionId, '❌ Stack:', error?.stack);
    logSession(sessionId, '📨 ========== ERROR EN MENSAJE ==========');
  }
}

