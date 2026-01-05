// Handler para eliminar sesión desde WhatsApp admin
import { logSession } from '../../../utils/logger/index.js';
import { loadSessions, saveSessions } from '../../../utils/menu/sessionHelpers.js';
import { getGlobalSessionManager } from '../../sessionManager/global.js';
import { getPrisma } from '../../../config/database.js';
import fs from 'fs';

/**
 * Elimina una sesión desde el flujo de administración
 * @param {string} sessionName - Nombre de la sesión a eliminar
 * @param {string} masterSessionId - ID de la sesión master (para logging)
 * @returns {Promise<string>} Mensaje de resultado
 */
export async function removeSessionFromAdmin(sessionName, masterSessionId) {
  try {
    logSession(masterSessionId, `🗑️ Eliminando sesión desde admin: ${sessionName}`);
    
    const sessionManager = getGlobalSessionManager();
    
    // Destruir sesión en SessionManager si existe
    if (sessionManager) {
      try {
        await sessionManager.destroySession(sessionName, true); // true = eliminar autenticación
        logSession(masterSessionId, `✅ Sesión "${sessionName}" destruida en SessionManager`);
      } catch (err) {
        logSession(masterSessionId, `⚠️ Error destruyendo sesión: ${err?.message || err}`);
      }
    }
    
    // Eliminar de base de datos
    try {
      const db = getPrisma();
      
      // Obtener la sesión con su cliente
      const session = await db.whatsAppSession.findUnique({
        where: { session_name: sessionName },
        include: { client: true }
      });
      
      if (session) {
        // Eliminar sesión
        await db.whatsAppSession.delete({
          where: { session_name: sessionName }
        });
        
        // Si el cliente no es MASTER y no tiene más sesiones, eliminar cliente
        if (session.client && session.client.name !== 'MASTER') {
          const remainingSessions = await db.whatsAppSession.count({
            where: { client_id: session.client.id }
          });
          
          if (remainingSessions === 0) {
            await db.client.delete({
              where: { id: session.client.id }
            });
            logSession(masterSessionId, `✅ Cliente "${session.client.name}" eliminado (no tenía más sesiones)`);
          }
        }
        
        logSession(masterSessionId, `✅ Sesión "${sessionName}" eliminada de base de datos`);
      }
    } catch (dbError) {
      logSession(masterSessionId, `⚠️ Error eliminando de DB: ${dbError?.message || dbError}`);
    }
    
    // Eliminar de la lista de sesiones
    const currentSessions = await loadSessions();
    const updatedSessions = currentSessions.filter(s => s !== sessionName);
    await saveSessions(updatedSessions);
    
    // Intentar eliminar carpeta física (con retry)
    const { getSessionPath } = await import('../../../utils/menu/sessionHelpers.js');
    const sessionPath = getSessionPath(sessionName);
    
    if (fs.existsSync(sessionPath)) {
      let retries = 3;
      while (retries > 0) {
        try {
          fs.rmSync(sessionPath, { recursive: true, force: true });
          logSession(masterSessionId, `✅ Carpeta física eliminada: ${sessionPath}`);
          break;
        } catch (fsError) {
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            logSession(masterSessionId, `⚠️ No se pudo eliminar carpeta física: ${fsError?.message || fsError}`);
          }
        }
      }
    }
    
    return `🗑️ ✅ Sesión "${sessionName}" eliminada exitosamente.`;
  } catch (error) {
    logSession(masterSessionId, `❌ Error eliminando sesión: ${error?.message || error}`);
    return `❌ Error al eliminar sesión: ${error?.message || 'Error desconocido'}`;
  }
}

