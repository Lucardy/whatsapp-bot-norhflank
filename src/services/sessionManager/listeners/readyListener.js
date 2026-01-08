// Listener para el evento 'ready' de WhatsApp
import path from 'path';
import { logSession } from '../../../utils/logger/index.js';
import { setSessionReadyTime } from '../../messageHandler/index.js';
import { captureAndSavePhoneNumber } from '../phoneCapture.js';
import { markSessionReady } from '../stateManager.js';

/**
 * Configura el listener para el evento 'ready'
 * @param {Object} client - Cliente de WhatsApp
 * @param {string} sessionId - ID de la sesión
 * @param {string} sessionPath - Ruta de la sesión
 * @param {Object} sessionData - Datos de la sesión
 */
export function setupReadyListener(client, sessionId, sessionPath, sessionData) {
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
    
    // Si es una sesión de cliente, enviar mensaje de confirmación desde el master
    try {
      const { getSessionType } = await import('../../../services/database/sessionService.js');
      const sessionType = await getSessionType(sessionId);
      
      if (sessionType === 'client') {
        logSession(sessionId, `📤 Enviando confirmación de conexión para cliente...`);
        // Esperar un poco para asegurar que el número se guardó en la DB
        setTimeout(async () => {
          try {
            const { sendConnectionConfirmation } = await import('../connectionConfirmation.js');
            await sendConnectionConfirmation(sessionId);
          } catch (confirmationError) {
            logSession(sessionId, `⚠️ Error enviando confirmación: ${confirmationError?.message || confirmationError}`);
          }
        }, 3000); // Esperar 3 segundos para que se complete el guardado del número
      }
    } catch (typeError) {
      logSession(sessionId, `⚠️ Error verificando tipo de sesión: ${typeError?.message || typeError}`);
    }
  });
}

