// Handlers para las opciones del menú (1-6)
import { logSession } from '../../../utils/logger/index.js';
import { markBotSentMessage } from '../humanManager.js';
import { sendQRImage } from './qrImageHandler.js';
import { MESSAGE_SEND_TIMEOUT, BOT_MESSAGE_REGISTER_DELAY } from '../../../config/constants.js';
import pkg from 'whatsapp-web.js';
const { MessageMedia } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Maneja la opción 6 (test de pairing code)
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 */
export async function handleOption6(msg, sessionId, chatId) {
  logSession(sessionId, `🧪 Opción 6 - Test de pairing code detectado`);
  
  try {
    // Obtener el SessionManager
    const { getGlobalSessionManager } = await import('../../sessionManager/global.js');
    const sessionManager = getGlobalSessionManager();
    
    if (!sessionManager) {
      throw new Error('SessionManager no disponible');
    }
    
    // Obtener el número maestro desde la sesión actual
    let phoneForPairing = null;
    try {
      const { getSessionByName } = await import('../../../services/database/sessionService.js');
      const masterSession = await getSessionByName(sessionId);
      if (masterSession?.phone_number) {
        phoneForPairing = masterSession.phone_number;
        logSession(sessionId, `📱 Usando número maestro desde DB: ${phoneForPairing}`);
      } else {
        // Si no está en DB, intentar obtenerlo del cliente
        const masterSessionData = sessionManager.getSession(sessionId);
        if (masterSessionData?.client?.info?.wid?.user) {
          phoneForPairing = masterSessionData.client.info.wid.user;
          logSession(sessionId, `📱 Usando número maestro desde cliente: ${phoneForPairing}`);
        }
      }
    } catch (dbError) {
      logSession(sessionId, `⚠️ Error obteniendo número maestro: ${dbError?.message || dbError}`);
    }
    
    // Si no pudimos obtener el número maestro, usar el del remitente
    if (!phoneForPairing) {
      const { normalizePhoneWithCountryCode } = await import('../../../utils/validation/phoneValidator.js');
      phoneForPairing = await normalizePhoneWithCountryCode(chatId, 'AR', sessionId);
      logSession(sessionId, `📱 Usando número del remitente: ${phoneForPairing}`);
    }
    
    // Usar la sesión maestra directamente para generar el pairing code
    let testSessionName = sessionId; // Usar la sesión maestra
    let sessionData = sessionManager.getSession(testSessionName);
    
    if (!sessionData) {
      throw new Error('Sesión maestra no disponible en SessionManager');
    }
    
    if (!sessionData?.client) {
      throw new Error('Cliente de la sesión maestra no disponible');
    }
    
    const client = sessionData.client;
    
    // Normalizar el número de teléfono con código de país
    const { normalizePhoneWithCountryCode } = await import('../../../utils/validation/phoneValidator.js');
    phoneForPairing = await normalizePhoneWithCountryCode(phoneForPairing, 'AR', sessionId);
    
    logSession(sessionId, `📱 Número original del remitente: ${chatId}`);
    logSession(sessionId, `📱 Número para pairing: ${phoneForPairing}`);
    
    // Esperar a que el cliente esté completamente inicializado
    logSession(sessionId, `⏳ Esperando a que el cliente se inicialice completamente...`);
    const minWaitTime = 10000; // Esperar al menos 10 segundos
    const maxWaitTime = 60000; // Máximo 60 segundos
    const checkInterval = 2000; // Verificar cada 2 segundos
    let waited = 0;
    let clientReady = false;
    
    // Esperar mínimo 10 segundos para que el cliente se inicialice
    while (waited < minWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
      sessionData = sessionManager.getSession(testSessionName);
      logSession(sessionId, `⏳ Esperando inicialización... (${waited}ms / ${minWaitTime}ms)`);
    }
    
    // Ahora intentar generar pairing code, verificando estado
    logSession(sessionId, `🔐 Intentando generar pairing code...`);
    let pairingCode = null;
    let attempts = 0;
    const maxAttempts = 5; // Aumentar intentos
    
    while (waited < maxWaitTime && attempts < maxAttempts && !pairingCode) {
      attempts++;
      sessionData = sessionManager.getSession(testSessionName);
      
      if (!sessionData?.client) {
        logSession(sessionId, `⚠️ Cliente no disponible en intento ${attempts}`);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        waited += checkInterval;
        continue;
      }
      
      const client = sessionData.client;
      
      try {
        // Verificar estado del cliente
        const clientState = await client.getState().catch(() => null);
        logSession(sessionId, `📊 Intento ${attempts}/${maxAttempts} - Estado del cliente: ${clientState} (esperado: ${waited}ms)`);
        
        // Intentar generar pairing code incluso si está conectado
        // WhatsApp puede permitir generar pairing codes para vincular otros dispositivos
        logSession(sessionId, `🔐 Intentando generar pairing code para: ${phoneForPairing} (estado: ${clientState || 'null'})`);
        
        if (clientState === 'CONNECTED') {
          logSession(sessionId, `⚠️ Cliente está conectado, pero intentando generar pairing code de todas formas...`);
        }
        
        try {
          pairingCode = await client.requestPairingCode(phoneForPairing);
          logSession(sessionId, `✅ Pairing code generado exitosamente: ${pairingCode}`);
          break;
        } catch (pairingCodeError) {
          // Lanzar el error real para que el usuario vea qué está pasando
          const errorMessage = pairingCodeError?.message || pairingCodeError?.toString() || 'Error desconocido';
          logSession(sessionId, `❌ Error al generar pairing code: ${errorMessage}`);
          
          // Si el cliente está conectado, agregar información adicional
          if (clientState === 'CONNECTED') {
            throw new Error(`No se puede generar pairing code: La sesión está en estado CONNECTED. WhatsApp requiere que la sesión esté en estado UNPAIRED o PAIRING para generar pairing codes.\n\nError original: ${errorMessage}\n\nSolución: Usa una sesión no conectada o desvincular primero.`);
          }
          
          // Para otros errores, lanzar el error original
          throw pairingCodeError;
        }
        
      } catch (pairingError) {
        logSession(sessionId, `❌ Error en intento ${attempts}: ${pairingError?.message || pairingError}`);
        
        // Si el error indica que el cliente no está listo, esperar más
        if (pairingError?.message?.includes('not ready') || 
            pairingError?.message?.includes('not initialized') ||
            pairingError?.message?.includes('null') ||
            pairingError?.message?.includes('evaluate')) {
          logSession(sessionId, `⏳ Cliente no está listo aún, esperando más tiempo...`);
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waited += checkInterval;
        } else if (attempts < maxAttempts) {
          // Otro tipo de error, esperar un poco antes de reintentar
          logSession(sessionId, `⏳ Esperando 3 segundos antes de reintentar...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          waited += 3000;
        } else {
          throw new Error(`No se pudo generar pairing code después de ${maxAttempts} intentos: ${pairingError?.message || pairingError}`);
        }
      }
    }
    
    if (!pairingCode) {
      throw new Error('No se pudo generar pairing code');
    }
    
    if (!pairingCode) {
      throw new Error(`No se pudo generar pairing code después de ${maxWaitTime}ms y ${maxAttempts} intentos`);
    }
    
    // Enviar respuesta
    const responseMessage = `🧪 *Test de Pairing Code*

📱 *Número para pairing:* ${phoneForPairing}

🔐 *Código de vinculación:*

*${pairingCode}*

📱 *Cómo vincular:*
1. Abre WhatsApp en tu celular
2. Ve a *Configuración* → *Dispositivos vinculados*
3. Toca *Vincular con número*
4. Ingresa el código de arriba

⏰ *El código es válido por unos minutos.*`;

    await sendBotMessage(msg, sessionId, chatId, responseMessage);
    logSession(sessionId, `✅ Test de pairing code completado exitosamente`);
    
  } catch (testError) {
    logSession(sessionId, `❌ Error en test de pairing code: ${testError?.message || testError}`);
    logSession(sessionId, `❌ Stack: ${testError?.stack || 'N/A'}`);
    try {
      await sendBotMessage(msg, sessionId, chatId, `❌ *Error en test de pairing code*\n\n${testError?.message || 'Error desconocido'}\n\n📱 Tu número: ${chatId}`);
    } catch (err) {
      logSession(sessionId, `❌ Error enviando mensaje de error: ${err?.message || err}`);
    }
  }
}

/**
 * Maneja la opción 5 (prueba gratuita)
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 */
export async function handleOption5(msg, sessionId, chatId) {
  logSession(sessionId, `🎁 Usuario ${chatId} quiere iniciar prueba gratuita`);
  const { startTrialFlow } = await import('../../trialFlow/index.js');
  const { getGlobalSessionManager } = await import('../../sessionManager/global.js');
  const sessionManager = getGlobalSessionManager();
  
  // Pasar el mensaje para extraer el número real del contacto
  const startResult = await startTrialFlow(chatId, sessionId, sessionManager, msg);
  
  // Guardar el mensaje original del cliente (cuando escribió "5") para poder responder cuando se conecte
  // Esto garantiza que la confirmación llegue al número correcto del cliente
  if (startResult.sessionName) {
    const { storePendingConfirmationMessage } = await import('../../../services/sessionManager/connectionConfirmation.js');
    storePendingConfirmationMessage(startResult.sessionName, msg);
    logSession(sessionId, `💾 Mensaje original guardado (opción 5) para confirmación: ${startResult.sessionName}`);
  } else {
    // Si no hay sessionName aún (flujo nuevo), guardar el mensaje en la sesión de trial para usarlo después
    const { trialSessions } = await import('../../trialFlow/constants.js');
    const trialSession = trialSessions.get(chatId);
    if (trialSession) {
      trialSession.originalMessage = msg; // Guardar el mensaje en la sesión de trial
      logSession(sessionId, `💾 Mensaje original guardado en trialSession para confirmación futura`);
    }
  }
  
  try {
    // Usar sendBotMessage para consolidar el patrón
    const { sendBotMessage } = await import('../humanManager.js');
    await sendBotMessage(msg, sessionId, chatId, startResult.message);
    logSession(sessionId, '✅ Mensaje de inicio de prueba gratuita enviado');
    
    // Si hay una sesión pendiente y se generó el QR, enviarlo inmediatamente
    // PERO solo si NO es cliente existente (los clientes existentes ahora eligen a dónde enviar)
    if (startResult.hasPendingSession && startResult.qrDataURL && !startResult.isExistingClient) {
      logSession(sessionId, `📷 Enviando QR para sesión pendiente: ${startResult.sessionName}`);
      
      // Guardar el mensaje original para poder responder cuando la sesión se conecte
      if (startResult.sessionName) {
        const { storePendingConfirmationMessage } = await import('../../../services/sessionManager/connectionConfirmation.js');
        storePendingConfirmationMessage(startResult.sessionName, msg);
        logSession(sessionId, `💾 Mensaje original guardado para confirmación cuando se conecte: ${startResult.sessionName}`);
      }
      
      await sendQRImage(msg, sessionId, chatId, startResult.qrDataURL);
      logSession(sessionId, `✅ QR enviado para sesión pendiente`);
    } else if (startResult.hasPendingSession && startResult.sessionName && sessionManager && !startResult.isExistingClient) {
      // Si hay sesión pendiente pero no hay QR aún, esperar a que se genere
      logSession(sessionId, `⏳ Esperando generación de QR para sesión: ${startResult.sessionName}`);
      const maxWaitTime = 30000; // 30 segundos máximo
      const startTime = Date.now();
      let qrDataURL = null;
      
      while (!qrDataURL && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const sessionData = sessionManager.getSession(startResult.sessionName);
        if (sessionData?.lastQRDataURL) {
          qrDataURL = sessionData.lastQRDataURL;
          logSession(sessionId, `✅ QR generado para sesión: ${startResult.sessionName}`);
          break;
        }
        if (sessionData?.isReady) {
          logSession(sessionId, `⚠️ Sesión "${startResult.sessionName}" se conectó antes de generar QR`);
          break;
        }
      }
      
      if (qrDataURL) {
        logSession(sessionId, `📷 Enviando QR generado para sesión: ${startResult.sessionName}`);
        
        // Guardar el mensaje original para poder responder cuando la sesión se conecte
        const { storePendingConfirmationMessage } = await import('../../../services/sessionManager/connectionConfirmation.js');
        storePendingConfirmationMessage(startResult.sessionName, msg);
        logSession(sessionId, `💾 Mensaje original guardado para confirmación cuando se conecte: ${startResult.sessionName}`);
        
        await sendQRImage(msg, sessionId, chatId, qrDataURL);
        logSession(sessionId, `✅ QR enviado después de esperar`);
      } else {
        logSession(sessionId, `⚠️ QR no disponible después de esperar para sesión: ${startResult.sessionName}`);
      }
    }
  } catch (err) {
    logSession(sessionId, `❌ Error enviando mensaje de prueba gratuita: ${err?.message || err}`);
    logSession(sessionId, `❌ Stack: ${err?.stack || 'N/A'}`);
  }
}

/**
 * Maneja opciones estándar (1-4)
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} chatId - ID del chat
 * @param {string} textoLower - Texto del mensaje en minúsculas
 * @param {Object} responses - Objeto con las respuestas disponibles
 */
export async function handleStandardOption(msg, sessionId, chatId, textoLower, responses) {
  const responseText = responses[textoLower] || responses.default;
  const optionName = textoLower === '1' ? 'precios' : 
                    textoLower === '2' ? 'trabajos' : 
                    textoLower === '3' ? 'página web' : 
                    textoLower === '4' ? 'agente' : 
                    textoLower === '5' ? 'prueba gratuita' :
                    textoLower === 'configurar' || textoLower === 'config' || textoLower === '⚙️' ? 'configurar' :
                    'menú inicial';

  logSession(sessionId, `💬 Respondiendo: opción ${textoLower} (${optionName})`);
  
  try {
    // Usar sendBotMessage para consolidar el patrón
    const { sendBotMessage } = await import('../humanManager.js');
    await sendBotMessage(msg, sessionId, chatId, responseText);
    logSession(sessionId, '✅ Respuesta enviada exitosamente');
  } catch (replyError) {
    logSession(sessionId, `❌ Error al enviar respuesta (opción ${textoLower}):`, replyError?.message || replyError, replyError?.stack);
  }
}

