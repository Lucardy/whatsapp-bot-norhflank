// Configuración de event listeners para el cliente WhatsApp
import path from 'path';
import { logSession } from '../../utils/logger/index.js';
import { handleMessage, setSessionReadyTime, markChatAsHumanManaged } from '../messageHandler/index.js';
import { captureAndSavePhoneNumber } from './phoneCapture.js';
import { markSessionReady, updateSessionState, SessionState, markSessionDisconnected } from './stateManager.js';
import { handleDisconnection } from './reconnectManager.js';
import { generateAndSaveQR } from './qrManager.js';

/**
 * Configura todos los event listeners para un cliente WhatsApp
 * @param {Object} client - Cliente de WhatsApp
 * @param {string} sessionId - ID de la sesión
 * @param {string} sessionPath - Ruta de la sesión
 * @param {Object} sessionData - Datos de la sesión
 * @param {Function} ensureInit - Función para reinicializar la sesión
 */
export async function setupEventListeners(client, sessionId, sessionPath, sessionData, ensureInit) {
  // Registrar listeners para limpieza posterior (opcional, para cleanup)
  let registerListener;
  try {
    const cleanupModule = await import('../../utils/resourceCleanup.js');
    registerListener = cleanupModule.registerListener;
  } catch (err) {
    // Si no está disponible, continuar sin registro
  }
  
  // Listener: authenticated
  client.once('authenticated', async () => {
    const s = await client.getState().catch(() => 'NO_STATE');
    logSession(sessionId, '🔐 authenticated, state =', s);
  });

  // Listener: ready (cuando la sesión está completamente conectada)
  client.once('ready', async () => {
    const readyTime = Date.now();
    markSessionReady(sessionData, sessionId, readyTime);
    setSessionReadyTime(sessionId, readyTime); // Registrar en messageHandler para filtrar mensajes antiguos
    
    // Capturar número de teléfono del WhatsApp conectado
    await captureAndSavePhoneNumber(client, sessionId, sessionData);
    
    // Si forceQR está activo, mantener el QR disponible por un tiempo
    // Esto permite que el usuario pueda escanearlo incluso si se conectó rápido
    if (!sessionData.forceQR) {
      sessionData.lastQRDataURL = null;
    }
    const s = await client.getState().catch(() => 'NO_STATE');
    logSession(sessionId, '✅ BOT IS READY | state =', s);
    logSession(sessionId, '🎯 Listener de mensajes registrado y activo');
    logSession(sessionId, '📬 El bot está listo para recibir mensajes');
    logSession(sessionId, `💾 Sesión guardada en: ${path.join(sessionPath, '.wwebjs_auth')}`);
    logSession(sessionId, '✅ La sesión quedará guardada permanentemente - no necesitarás escanear QR nuevamente');
    logSession(sessionId, `⏰ Ignorando mensajes anteriores a ${new Date(readyTime).toISOString()} para evitar respuestas a mensajes antiguos`);
    
    // Si forceQR está activo, limpiarlo después de 30 segundos (tiempo suficiente para escanear)
    if (sessionData.forceQR) {
      logSession(sessionId, '💡 QR forzado activo - disponible por 30 segundos para escanear');
      setTimeout(() => {
        if (sessionData.forceQR) {
          sessionData.forceQR = false;
          sessionData.lastQRDataURL = null;
          logSession(sessionId, '🔇 Flag forceQR desactivado');
        }
      }, 30000);
    }
    
    const listeners_create = client.listenerCount('message_create');
    const listeners_message = client.listenerCount('message');
    logSession(sessionId, `🔍 Listeners registrados - message_create: ${listeners_create}, message: ${listeners_message}`);
  });

  // Listener: change_state
  client.on('change_state', async (s) => {
    sessionData.isReady = (s === 'CONNECTED');
    const newState = s === 'CONNECTED' ? SessionState.CONNECTED : SessionState.DISCONNECTED;
    updateSessionState(sessionData, sessionId, newState);
  });

  // Listener: auth_failure
  client.on('auth_failure', (m) => logSession(sessionId, '❌ auth_failure:', m));

  // Listener: disconnected
  client.on('disconnected', async (reason) => {
    handleDisconnection(
      sessionData,
      sessionId,
      reason,
      ensureInit,
      markSessionDisconnected
    );
    
    // Destruir cliente
    try { await client.destroy(); } catch {}
    sessionData.client = null;
  });

  // Listener: qr (código QR para autenticación)
  client.on('qr', async (qr) => {
    // Si forceQR está activo, SIEMPRE mostrar el QR, incluso si está ready
    if (sessionData.isReady && !sessionData.forceQR) {
      logSession(sessionId, '🔇 QR ignorado (ya conectado)');
      return;
    }
    logSession(sessionId, '🟩 QR solicitado (cliente pidió autenticación)');
    logSession(sessionId, '📱 Escanea este QR con WhatsApp en tu celular');
    logSession(sessionId, '💾 Después de escanear, la sesión se guardará automáticamente');
    logSession(sessionId, `💾 Ubicación: ${path.join(sessionPath, '.wwebjs_auth')}`);
    logSession(sessionId, '✅ No necesitarás escanear el QR nuevamente en el futuro');
    
    // Usar qrManager para generar y guardar QR
    try {
      const { dataURL, filePath } = await generateAndSaveQR(qr, sessionId);
      sessionData.lastQRDataURL = dataURL;
      logSession(sessionId, '📷 QR generado y cacheado en memoria');
      if (filePath) {
        logSession(sessionId, `🌐 También disponible en: http://localhost:${process.env.PORT || 3000}/qr/${sessionId}`);
      }
    } catch (err) {
      logSession(sessionId, '❌ Error generando QR:', err?.message || err);
    }
  });

  // Listener: message_create (mensajes entrantes nuevos)
  logSession(sessionId, '📝 Registrando listener de mensajes...');
  logSession(sessionId, '🔔 Listener "message_create" será activado cuando el cliente esté ready');
  
  client.on('message_create', (msg) => handleMessage(msg, sessionId));
  
  // Listener: message (para detectar cuando el dueño envía mensajes)
  // Usar 'message' aquí porque necesitamos detectar TODOS los mensajes enviados, incluso los propios
  client.on('message', (msg) => {
    if (msg.fromMe) {
      // El dueño envió un mensaje, obtener el chat de destino
      // Cuando fromMe es true, msg.to contiene el destinatario (número del chat)
      // También puede estar en msg.from si es un mensaje de respuesta
      let chatId = '';
      if (msg.to) {
        chatId = msg.to.split('@')[0];
      } else if (msg.from && !msg.from.endsWith('@g.us') && msg.from !== 'status@broadcast') {
        // Si no hay msg.to, intentar con msg.from (puede ser el caso en algunos mensajes)
        chatId = msg.from.split('@')[0];
      }
      
      if (chatId && chatId.length > 0) {
        // markChatAsHumanManaged ahora verifica internamente si es un mensaje reciente del bot
        // y si está en modo administración (no pausa el bot en modo admin)
        markChatAsHumanManaged(sessionId, chatId).catch(err => {
          logSession(sessionId, `⚠️ Error marcando chat como manejado por humano: ${err?.message || err}`);
        });
      }
    }
  });
  
  // NO usar 'message' para procesar mensajes entrantes porque incluye mensajes antiguos sincronizados
  logSession(sessionId, '✅ Listener registrado en "message_create" (solo mensajes nuevos)');
  logSession(sessionId, '✅ Listener registrado en "message" para detectar mensajes del dueño');
}

