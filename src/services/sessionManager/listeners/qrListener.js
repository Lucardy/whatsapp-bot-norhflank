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
  logSession(sessionId, '📡 Listener de QR registrado - esperando evento "qr"');
  
  client.on('qr', async (qr) => {
    logSession(sessionId, '🟢 EVENTO QR RECIBIDO - Generando QR...');
    
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
      logSession(sessionId, `💾 QR guardado como qr_${sessionId}.png`);
      logSession(sessionId, '📷 QR generado y cacheado en memoria');
      logSession(sessionId, `🌐 También disponible en: http://localhost:${process.env.PORT || 3000}/qr/${sessionId}`);
    } catch (err) {
      logSession(sessionId, '❌ Error generando QR:', err?.message || err);
      logSession(sessionId, `   Stack: ${err?.stack || 'N/A'}`);
    }
  });
  
  // También escuchar errores de conexión que pueden impedir la generación del QR
  client.on('disconnected', (reason) => {
    logSession(sessionId, `⚠️ Cliente desconectado, motivo: ${reason}`);
    if (reason === 'NAVIGATION') {
      logSession(sessionId, `   Error de navegación - puede ser problema de conexión`);
      logSession(sessionId, `   El QR puede generarse cuando se restablezca la conexión`);
    }
  });
  
  // Escuchar el evento 'loading_screen' que indica que está cargando WhatsApp Web
  client.on('loading_screen', (percent, message) => {
    logSession(sessionId, `📱 Cargando WhatsApp Web: ${percent}% - ${message || 'N/A'}`);
  });
  
  // Escuchar errores que pueden impedir la generación del QR
  client.on('error', (error) => {
    logSession(sessionId, `❌ Error en cliente WhatsApp: ${error?.message || error}`);
    if (error?.message?.includes('Navigation') || error?.message?.includes('timeout')) {
      logSession(sessionId, `   Este error puede impedir la generación del QR`);
    }
  });
}

