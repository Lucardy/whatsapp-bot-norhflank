// Handler para regenerar QR desde WhatsApp admin
import { logSession } from '../../../utils/logger/index.js';
import { getGlobalSessionManager } from '../../sessionManager/global.js';
import { getQRUrl } from '../../../config/constants.js';

/**
 * Regenera el QR de una sesión desde el flujo de administración
 * @param {string} sessionName - Nombre de la sesión
 * @param {string} masterSessionId - ID de la sesión master (para logging)
 * @returns {Promise<string>} Mensaje de resultado con QR URL
 */
export async function regenerateQRFromAdmin(sessionName, masterSessionId) {
  try {
    logSession(masterSessionId, `🔄 Regenerando QR desde admin: ${sessionName}`);
    
    const sessionManager = getGlobalSessionManager();
    if (!sessionManager) {
      return `❌ El bot no está corriendo. Inicia el bot primero para poder regenerar QRs.`;
    }
    
    const sessionData = sessionManager.getSession(sessionName);
    if (!sessionData) {
      return `❌ La sesión "${sessionName}" no existe. Crea la sesión primero.`;
    }
    
    // Resetear la sesión (esto generará un nuevo QR)
    try {
      await sessionManager.resetSession(sessionName);
      logSession(masterSessionId, `✅ Sesión "${sessionName}" reseteada`);
    } catch (err) {
      logSession(masterSessionId, `❌ Error reseteando sesión: ${err?.message || err}`);
      return `❌ Error al resetear sesión: ${err?.message || 'Error desconocido'}`;
    }
    
    // Esperar un poco para que se genere el QR
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const qrUrl = getQRUrl(sessionName);
    
    return `🔄 ✅ QR regenerado para "${sessionName}".\n\n📱 *Nuevo código QR disponible en:*\n${qrUrl}\n\n💡 Escanea el nuevo QR con WhatsApp para conectar.`;
  } catch (error) {
    logSession(masterSessionId, `❌ Error regenerando QR: ${error?.message || error}`);
    return `❌ Error al regenerar QR: ${error?.message || 'Error desconocido'}`;
  }
}

