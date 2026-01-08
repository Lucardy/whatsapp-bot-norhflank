// Listener para el evento 'qr' de WhatsApp
import path from 'path';
import { logSession } from '../../../utils/logger/index.js';
import { generateAndSaveQR } from '../qrManager.js';

/**
 * Configura el listener para el evento 'qr'
 * @param {Object} client - Cliente de WhatsApp
 * @param {string} sessionId - ID de la sesión
 * @param {string} sessionPath - Ruta de la sesión
 * @param {Object} sessionData - Datos de la sesión
 */
export function setupQRListener(client, sessionId, sessionPath, sessionData) {
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
}

