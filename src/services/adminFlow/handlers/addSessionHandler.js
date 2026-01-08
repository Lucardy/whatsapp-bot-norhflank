// Handler para agregar sesión desde WhatsApp admin
import { logSession } from '../../../utils/logger/index.js';
import { loadSessions, saveSessions } from '../../../utils/menu/sessionHelpers.js';
import { getGlobalSessionManager } from '../../sessionManager/global.js';
import { validateSessionName } from '../../../utils/validation.js';
import { getPrisma } from '../../../config/database.js';
import { getQRUrl } from '../../../config/constants.js';

/**
 * Agrega una nueva sesión desde el flujo de administración
 * @param {string} sessionName - Nombre de la sesión
 * @param {string} sessionType - Tipo de sesión ('master' o 'client')
 * @param {string} masterSessionId - ID de la sesión master (para logging)
 * @returns {Promise<string>} Mensaje de resultado
 */
export async function addSessionFromAdmin(sessionName, sessionType, masterSessionId) {
  try {
    logSession(masterSessionId, `➕ Agregando sesión desde admin: ${sessionName} (${sessionType})`);
    
    // Validar nombre
    validateSessionName(sessionName);
    
    // Verificar si ya existe
    const currentSessions = await loadSessions();
    if (currentSessions.includes(sessionName)) {
      return `❌ Ya existe una sesión con el nombre "${sessionName}".`;
    }
    
    const isMaster = sessionType === 'master';
    const typeEmoji = isMaster ? '📞' : '👤';
    const typeText = isMaster ? 'número maestro' : 'cliente';
    
    // Crear en SessionManager si está disponible
    const sessionManager = getGlobalSessionManager();
    if (sessionManager) {
      try {
        await sessionManager.createSession(sessionName, false); // false = no auto-inicializar
        logSession(masterSessionId, `✅ Sesión "${sessionName}" creada en SessionManager`);
      } catch (err) {
        logSession(masterSessionId, `⚠️ Error creando sesión en SessionManager: ${err?.message || err}`);
      }
    }
    
    // Crear en base de datos
    try {
      const db = getPrisma();
      
      // Para sesiones maestro, crear o usar cliente especial
      let client;
      if (isMaster) {
        client = await db.client.findFirst({
          where: { name: 'MASTER' }
        });
        
        if (!client) {
          client = await db.client.create({
            data: {
              name: 'MASTER',
              status: 'active',
              contact_email: null,
              contact_phone: null
            }
          });
        }
      } else {
        // Para clientes, verificar si ya existe antes de crear
        client = await db.client.findFirst({
          where: { name: sessionName }
        });
        
        if (!client) {
          client = await db.client.create({
            data: {
              name: sessionName,
              status: 'trial',
              contact_email: null,
              contact_phone: null
            }
          });
        }
      }
      
      // Verificar si la sesión ya existe
      const existingSession = await db.whatsAppSession.findUnique({
        where: { session_name: sessionName }
      });
      
      // Si no existe, crear la sesión con el tipo correspondiente
      if (!existingSession) {
        await db.whatsAppSession.create({
          data: {
            session_name: sessionName,
            session_type: sessionType,
            client_id: client.id,
            phone_number: null,
            status: 'qr_pending'
          }
        });
        logSession(masterSessionId, `✅ Sesión "${sessionName}" creada en base de datos (tipo: ${sessionType})`);
      } else {
        // Si ya existe, actualizar el tipo si es diferente
        if (existingSession.session_type !== sessionType) {
          await db.whatsAppSession.update({
            where: { session_name: sessionName },
            data: { session_type: sessionType }
          });
          logSession(masterSessionId, `✅ Tipo de sesión "${sessionName}" actualizado a ${sessionType}`);
        }
      }
      
      logSession(masterSessionId, `✅ Sesión "${sessionName}" creada en base de datos`);
    } catch (dbError) {
      logSession(masterSessionId, `⚠️ Error creando en DB: ${dbError?.message || dbError}`);
      // Continuar aunque falle la DB
    }
    
    // Agregar a la lista de sesiones
    const updatedSessions = [...currentSessions, sessionName];
    await saveSessions(updatedSessions);
    
    return `${typeEmoji} ✅ ${typeText.charAt(0).toUpperCase() + typeText.slice(1)} "${sessionName}" creado exitosamente.\n\n💡 Para iniciar la sesión y generar el QR, usa la opción "3️⃣ Iniciar sesión de un cliente" del menú.`;
  } catch (error) {
    logSession(masterSessionId, `❌ Error agregando sesión: ${error?.message || error}`);
    return `❌ Error al agregar sesión: ${error?.message || 'Error desconocido'}`;
  }
}

