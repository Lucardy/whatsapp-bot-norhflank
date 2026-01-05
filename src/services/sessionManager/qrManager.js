// Gestión de códigos QR
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';
import { logSession } from '../../utils/logger/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Genera un QR code como DataURL
 * @param {string} qr - String del QR
 * @returns {Promise<string>} DataURL del QR
 */
export async function generateQRDataURL(qr) {
  try {
    return await QRCode.toDataURL(qr);
  } catch (err) {
    throw new Error(`Error generando QR DataURL: ${err?.message || err}`);
  }
}

/**
 * Guarda un QR code como archivo PNG
 * @param {string} qr - String del QR
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<string>} Ruta del archivo guardado
 */
export async function saveQRFile(qr, sessionId) {
  try {
    const projectRoot = path.resolve(__dirname, '../../..');
    const qrPath = path.join(projectRoot, `qr_${sessionId}.png`);
    await QRCode.toFile(qrPath, qr);
    logSession(sessionId, `💾 QR guardado como qr_${sessionId}.png`);
    return qrPath;
  } catch (err) {
    logSession(sessionId, `⚠️ No se pudo escribir qr_${sessionId}.png: ${err?.message || err}`);
    throw err;
  }
}

/**
 * Genera y guarda un QR code completo
 * @param {string} qr - String del QR
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<{dataURL: string, filePath: string}>} QR generado
 */
export async function generateAndSaveQR(qr, sessionId) {
  const dataURL = await generateQRDataURL(qr);
  let filePath = null;
  
  try {
    filePath = await saveQRFile(qr, sessionId);
  } catch (err) {
    // No crítico si no se puede guardar el archivo
    logSession(sessionId, `⚠️ QR generado pero no se pudo guardar como archivo`);
  }
  
  return { dataURL, filePath };
}

