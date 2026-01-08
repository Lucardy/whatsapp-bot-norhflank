// Lógica de manejo de sesiones para el flujo de prueba gratuita
import { logSession } from '../../utils/logger/index.js';

/**
 * Verifica si una sesión necesita ser reseteada para un nuevo cliente
 * @param {Object} options - Opciones para verificar la sesión
 * @param {Object} options.sessionData - Datos de la sesión del SessionManager
 * @param {Object} options.dbSession - Sesión de la base de datos
 * @param {number} options.newClientId - ID del nuevo cliente
 * @param {string} options.newClientPhone - Teléfono del nuevo cliente
 * @param {string} options.sessionId - ID de la sesión para logging
 * @returns {Promise<{shouldReset: boolean, isReady: boolean}>} Resultado de la verificación
 */
export async function verifySessionForNewClient({ sessionData, dbSession, newClientId, newClientPhone, sessionId }) {
  let shouldReset = false;
  let isReady = false;
  
  if (!sessionData) {
    return { shouldReset: false, isReady: false };
  }
  
  logSession(sessionId, `ℹ️ Sesión "${dbSession?.session_name}" ya existe en SessionManager`);
  
  try {
    // Si la sesión en la DB pertenece al cliente que se acaba de crear
    const belongsToNewClient = dbSession?.client_id === newClientId;
    
    if (belongsToNewClient) {
      logSession(sessionId, `✅ Sesión "${dbSession.session_name}" pertenece al nuevo cliente (ID: ${newClientId})`);
      
      // Si está conectada, verificar si el número conectado coincide con el del nuevo cliente
      if (sessionData.isReady) {
        const connectedPhone = dbSession?.phone_number;
        const newClientPhoneNormalized = newClientPhone?.replace(/[^0-9]/g, '');
        const connectedPhoneNormalized = connectedPhone?.replace(/[^0-9]/g, '');
        
        if (connectedPhone && newClientPhone) {
          if (connectedPhoneNormalized === newClientPhoneNormalized) {
            logSession(sessionId, `✅ Sesión ya conectada con el número correcto del cliente`);
            isReady = true;
          } else {
            logSession(sessionId, `🔄 Sesión conectada con número diferente. Reseteando...`);
            shouldReset = true;
          }
        } else {
          logSession(sessionId, `🔄 Sesión conectada pero sin número verificado. Reseteando...`);
          shouldReset = true;
        }
      } else {
        // No está conectada, verificar si tiene QR guardado
        if (sessionData.lastQRDataURL) {
          logSession(sessionId, `✅ QR encontrado para sesión existente: ${dbSession.session_name}`);
          return { shouldReset: false, isReady: false, qrDataURL: sessionData.lastQRDataURL, needsStart: false };
        } else {
          logSession(sessionId, `🔄 Sesión existe pero no está conectada, iniciando...`);
          return { shouldReset: false, isReady: false, needsStart: true, qrDataURL: null };
        }
      }
    } else {
      // La sesión NO pertenece al nuevo cliente, siempre resetear
      logSession(sessionId, `🔄 Sesión "${dbSession.session_name}" pertenece a otro cliente. Reseteando para nuevo cliente...`);
      shouldReset = true;
    }
  } catch (dbErr) {
    logSession(sessionId, `⚠️ Error verificando sesión en DB: ${dbErr?.message || dbErr}`);
    // Si hay error, por seguridad resetear si está conectada
    if (sessionData.isReady) {
      logSession(sessionId, `🔄 Error en verificación, reseteando por seguridad...`);
      shouldReset = true;
    }
  }
  
  return { shouldReset, isReady };
}

/**
 * Prepara la sesión para un nuevo cliente (crear, resetear o iniciar según sea necesario)
 * @param {Object} options - Opciones para preparar la sesión
 * @param {Object} options.sessionManager - Instancia del SessionManager
 * @param {string} options.sessionName - Nombre de la sesión
 * @param {Object} options.verificationResult - Resultado de verifySessionForNewClient
 * @param {string} options.sessionId - ID de la sesión para logging
 * @returns {Promise<Object>} Datos de la sesión preparada
 */
export async function prepareSessionForClient({ sessionManager, sessionName, verificationResult, sessionId }) {
  let sessionData = sessionManager.getSession(sessionName);
  
  // Si la sesión no existe, crearla
  if (!sessionData) {
    logSession(sessionId, `🆕 Creando nueva sesión: ${sessionName}`);
    
    // Eliminar autenticación guardada si existe para evitar LOGOUT inmediato
    // Esto es crítico para nuevas sesiones que pueden tener autenticación previa
    try {
      const path = await import('path');
      const fs = await import('fs');
      
      if (sessionManager && sessionManager.sessionBaseDir) {
        const sessionPath = path.join(sessionManager.sessionBaseDir, sessionName);
        const authPath = path.join(sessionPath, '.wwebjs_auth');
        
        if (fs.existsSync(authPath)) {
          logSession(sessionId, `🗑️ Eliminando autenticación guardada para nueva sesión: ${sessionName}`);
          try {
            fs.rmSync(authPath, { recursive: true, force: true });
            logSession(sessionId, `✅ Autenticación eliminada: ${sessionName}`);
            // Esperar un poco para asegurar que se eliminó
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (authError) {
            logSession(sessionId, `⚠️ Error eliminando autenticación (continuando): ${authError?.message || authError}`);
          }
        }
      }
    } catch (cleanupError) {
      logSession(sessionId, `⚠️ Error verificando autenticación (continuando): ${cleanupError?.message || cleanupError}`);
    }
    
    await sessionManager.createSession(sessionName, true); // Auto-inicializar
    sessionData = sessionManager.getSession(sessionName);
  }
  
  // Si necesita resetear, hacerlo
  if (verificationResult.shouldReset) {
    try {
      logSession(sessionId, `🔄 Reseteando sesión "${sessionName}"...`);
      
      // Eliminar autenticación guardada antes de resetear para evitar LOGOUT inmediato
      try {
        const path = await import('path');
        const fs = await import('fs');
        
        if (sessionManager && sessionManager.sessionBaseDir) {
          const sessionPath = path.join(sessionManager.sessionBaseDir, sessionName);
          const authPath = path.join(sessionPath, '.wwebjs_auth');
          
          if (fs.existsSync(authPath)) {
            logSession(sessionId, `🗑️ Eliminando autenticación guardada antes de resetear: ${sessionName}`);
            try {
              fs.rmSync(authPath, { recursive: true, force: true });
              logSession(sessionId, `✅ Autenticación eliminada: ${sessionName}`);
              // Esperar un poco para asegurar que se eliminó
              await new Promise(resolve => setTimeout(resolve, 500));
            } catch (authError) {
              logSession(sessionId, `⚠️ Error eliminando autenticación (continuando): ${authError?.message || authError}`);
            }
          }
        }
      } catch (cleanupError) {
        logSession(sessionId, `⚠️ Error verificando autenticación (continuando): ${cleanupError?.message || cleanupError}`);
      }
      
      await sessionManager.resetSession(sessionName);
      logSession(sessionId, `✅ Sesión reseteada, esperando nuevo QR...`);
      // Esperar un poco para que se recree la sesión
      await new Promise(resolve => setTimeout(resolve, 2000));
      sessionData = sessionManager.getSession(sessionName);
    } catch (resetErr) {
      logSession(sessionId, `⚠️ Error reseteando sesión: ${resetErr?.message || resetErr}`);
    }
  }
  
  // Si necesita iniciar, hacerlo
  if (verificationResult.needsStart) {
    try {
      logSession(sessionId, `🚀 Iniciando sesión: ${sessionName}`);
      await sessionManager.startSession(sessionName);
      sessionData = sessionManager.getSession(sessionName);
    } catch (startErr) {
      logSession(sessionId, `⚠️ Error iniciando sesión: ${startErr?.message || startErr}`);
    }
  }
  
  return sessionData;
}

