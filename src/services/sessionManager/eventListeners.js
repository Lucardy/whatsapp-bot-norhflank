// Configuración de event listeners para el cliente WhatsApp
import { logSession } from '../../utils/logger/index.js';
import { setupReadyListener } from './listeners/readyListener.js';
import { setupQRListener } from './listeners/qrListener.js';
import { setupMessageListeners } from './listeners/messageListeners.js';
import { setupAuthListeners } from './listeners/authListeners.js';

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
  
  // Configurar listeners por tipo
  setupAuthListeners(client, sessionId, sessionData, ensureInit, sessionPath);
  setupReadyListener(client, sessionId, sessionPath, sessionData);
  setupQRListener(client, sessionId, sessionPath, sessionData);
  setupMessageListeners(client, sessionId);
}

