// Listener para el evento 'ready' de WhatsApp
import path from 'path';
import { logSession } from '../../../utils/logger/index.js';

/**
 * Configura el listener para el evento 'ready'
 * @param {Object} client - Cliente de WhatsApp
 * @param {string} sessionId - ID de la sesión
 * @param {string} sessionPath - Ruta de la sesión
 * @param {Object} sessionData - Datos de la sesión
 */
export function setupReadyListener(client, sessionId, sessionPath, sessionData) {
  logSession(sessionId, '📝 Listener de "ready" registrado');
  client.once('ready', async () => {
    logSession(sessionId, '🎉 EVENTO READY RECIBIDO - Sesión completamente conectada');
    
    // Si forceQR está activo, mantener el QR disponible por un tiempo
    // Esto permite que el usuario pueda escanearlo incluso si se conectó rápido
    const clearQR = !sessionData.forceQR;
    
    const readyTime = Date.now();
    const { markSessionAsReady } = await import('../stateManager.js');
    await markSessionAsReady(client, sessionData, sessionId, readyTime, {
      clearQR,
      context: 'ready'
    });
    
    const s = await client.getState().catch(() => 'NO_STATE');
    logSession(sessionId, '✅ BOT IS READY | state =', s);
    logSession(sessionId, `⏰ Ignorando mensajes anteriores a ${new Date(readyTime).toISOString()} para evitar respuestas a mensajes antiguos`);
    
    // Verificar que la sesión se haya guardado correctamente
    // LocalAuth guarda la sesión de forma asíncrona después del evento 'ready'
    // Puede tardar varios segundos, así que verificamos múltiples veces
    const checkSessionSaved = async (attempt = 1, maxAttempts = 3) => {
      const authPath = path.join(sessionPath, '.wwebjs_auth');
      const fs = await import('fs');
      
      // Verificar si existe el directorio .wwebjs_auth
      let sessionSaved = fs.existsSync(authPath);
      
      // Si no existe como directorio, verificar si hay archivos de sesión en subdirectorios
      if (!sessionSaved && fs.existsSync(sessionPath)) {
        try {
          const files = fs.readdirSync(sessionPath, { withFileTypes: true });
          // Buscar cualquier carpeta que contenga "auth" o "wwebjs" (case insensitive)
          sessionSaved = files.some(file => {
            const name = file.name.toLowerCase();
            return file.isDirectory() && (name.includes('auth') || name.includes('wwebjs'));
          });
        } catch (err) {
          // Ignorar errores de lectura
        }
      }
      
      if (sessionSaved) {
        logSession(sessionId, `✅ Sesión guardada correctamente en: ${authPath}`);
        logSession(sessionId, '✅ La sesión quedará guardada permanentemente - no necesitarás escanear QR nuevamente');
      } else if (attempt < maxAttempts) {
        // Reintentar después de más tiempo (5, 10, 15 segundos)
        const delay = attempt * 5000;
        setTimeout(() => checkSessionSaved(attempt + 1, maxAttempts), delay);
      } else {
        // Después de todos los intentos, asumir que la sesión se guardó si el cliente está conectado
        // LocalAuth puede guardar la sesión de forma interna y no crear la carpeta inmediatamente
        logSession(sessionId, `💡 Verificación de carpeta .wwebjs_auth completada`);
        logSession(sessionId, `   La sesión se guarda automáticamente por LocalAuth`);
        logSession(sessionId, `   Si el bot se reconecta automáticamente al reiniciar (sin pedir QR), la sesión está guardada correctamente`);
        logSession(sessionId, `   Ubicación esperada: ${authPath}`);
      }
    };
    
    // Empezar a verificar después de 5 segundos (dar más tiempo a LocalAuth)
    setTimeout(() => checkSessionSaved(1, 3), 5000);
    
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

