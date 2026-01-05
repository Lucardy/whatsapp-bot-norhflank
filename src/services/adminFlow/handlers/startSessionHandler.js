// Handler para iniciar sesión desde WhatsApp admin
import { logSession } from '../../../utils/logger/index.js';
import { getGlobalSessionManager } from '../../sessionManager/global.js';
import { getQRUrl } from '../../../config/constants.js';
import { getPrisma } from '../../../config/database.js';

/**
 * Inicia una sesión desde el flujo de administración
 * @param {string} sessionName - Nombre de la sesión a iniciar
 * @param {string} masterSessionId - ID de la sesión master (para logging)
 * @returns {Promise<string>} Mensaje de resultado con QR URL
 */
export async function startSessionFromAdmin(sessionName, masterSessionId) {
  try {
    logSession(masterSessionId, `🚀 Iniciando sesión desde admin: ${sessionName}`);
    
    const sessionManager = getGlobalSessionManager();
    if (!sessionManager) {
      return `❌ El bot no está corriendo. Inicia el bot primero para poder generar QRs.`;
    }
    
    // Verificar si la sesión existe en la DB
    try {
      const db = getPrisma();
      const session = await db.whatsAppSession.findUnique({
        where: { session_name: sessionName }
      });
      
      if (!session) {
        return `❌ La sesión "${sessionName}" no existe en la base de datos.`;
      }
    } catch (dbError) {
      logSession(masterSessionId, `⚠️ Error verificando sesión en DB: ${dbError?.message || dbError}`);
    }
    
    // Obtener o crear la sesión en SessionManager
    let sessionData = sessionManager.getSession(sessionName);
    
    if (!sessionData) {
      // Crear la sesión si no existe
      try {
        await sessionManager.createSession(sessionName, true); // true = auto-inicializar
        sessionData = sessionManager.getSession(sessionName);
        logSession(masterSessionId, `✅ Sesión "${sessionName}" creada en SessionManager`);
      } catch (err) {
        logSession(masterSessionId, `❌ Error creando sesión: ${err?.message || err}`);
        return `❌ Error al crear sesión: ${err?.message || 'Error desconocido'}`;
      }
    } else {
      // Si ya existe, intentar iniciarla
      try {
        await sessionManager.startSession(sessionName);
        logSession(masterSessionId, `✅ Sesión "${sessionName}" iniciada`);
      } catch (err) {
        logSession(masterSessionId, `⚠️ Error iniciando sesión: ${err?.message || err}`);
      }
    }
    
    // Esperar un poco para que se genere el QR
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Obtener el QR URL
    const qrUrl = getQRUrl(sessionName);
    
    if (sessionData?.lastQRDataURL) {
      return `🚀 ✅ Sesión "${sessionName}" iniciada.\n\n📱 *Código QR disponible en:*\n${qrUrl}\n\n💡 Escanea el QR con WhatsApp para conectar la sesión.`;
    } else if (sessionData?.isReady) {
      return `✅ La sesión "${sessionName}" ya está conectada.\n\n💡 No es necesario escanear el QR.`;
    } else {
      return `⏳ Sesión "${sessionName}" en proceso de inicialización.\n\n📱 El QR estará disponible en:\n${qrUrl}\n\n💡 Espera unos segundos y recarga la página.`;
    }
  } catch (error) {
    logSession(masterSessionId, `❌ Error iniciando sesión: ${error?.message || error}`);
    return `❌ Error al iniciar sesión: ${error?.message || 'Error desconocido'}`;
  }
}

