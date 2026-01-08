// Lógica de detección de cliente existente para el flujo de prueba gratuita
import { logSession } from '../../utils/logger/index.js';
import { findClientByPhone, findPendingSessionByPhone } from './dbQueries.js';
import { ensureSessionForClient } from './sessionHelpers.js';

/**
 * Busca un cliente existente por número de teléfono y obtiene su QR si está disponible
 * @param {string} phoneNumber - Número de teléfono
 * @param {string} sessionId - ID de la sesión para logging
 * @param {Object} sessionManager - Instancia del SessionManager (opcional)
 * @returns {Promise<Object|null>} { message: string, hasPendingSession: boolean, sessionName: string|null, qrDataURL: string|null } o null
 */
export async function findExistingClient(phoneNumber, sessionId, sessionManager = null) {
  const existingClient = await findClientByPhone(phoneNumber);
  
  if (!existingClient) {
    return null;
  }
  
  logSession(sessionId, `✅ Cliente existente encontrado: ${existingClient.name} (ID: ${existingClient.id})`);
  
  // Buscar o crear sesión para este cliente
  const session = await ensureSessionForClient(existingClient, sessionId);
  
  // Intentar obtener el QR de la sesión existente
  let qrDataURL = null;
  if (sessionManager) {
    try {
      let sessionData = sessionManager.getSession(session.session_name);
      
      // Si la sesión no existe en el SessionManager, crearla e iniciarla
      if (!sessionData) {
        logSession(sessionId, `🔄 Sesión "${session.session_name}" no existe en SessionManager, creándola...`);
        
        // Eliminar autenticación guardada si existe para forzar nuevo QR
        // Esto evita conflictos con sesiones anteriores que puedan causar LOGOUT inmediato
        try {
          const path = await import('path');
          const fs = await import('fs');
          
          if (sessionManager && sessionManager.sessionBaseDir) {
            const sessionPath = path.join(sessionManager.sessionBaseDir, session.session_name);
            const authPath = path.join(sessionPath, '.wwebjs_auth');
            
            if (fs.existsSync(authPath)) {
              logSession(sessionId, `🗑️ Eliminando autenticación guardada para forzar nuevo QR: ${session.session_name}`);
              try {
                fs.rmSync(authPath, { recursive: true, force: true });
                logSession(sessionId, `✅ Autenticación eliminada: ${session.session_name}`);
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
        
        await sessionManager.createSession(session.session_name, true); // Auto-inicializar
        sessionData = sessionManager.getSession(session.session_name);
        
        if (sessionData) {
          logSession(sessionId, `✅ Sesión "${session.session_name}" creada en SessionManager`);
          
          // Esperar a que se genere el QR (máximo 30 segundos)
          const maxWaitTime = 30000;
          const startTime = Date.now();
          while (!qrDataURL && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (sessionData.lastQRDataURL) {
              qrDataURL = sessionData.lastQRDataURL;
              logSession(sessionId, `✅ QR generado para cliente existente: ${session.session_name}`);
              break;
            }
            // Actualizar referencia a sessionData por si cambió
            sessionData = sessionManager.getSession(session.session_name);
          }
          
          if (!qrDataURL) {
            logSession(sessionId, `⚠️ QR no generado después de ${maxWaitTime}ms para sesión: ${session.session_name}`);
          }
        }
      } else if (sessionData?.lastQRDataURL) {
        // Si la sesión existe y tiene QR, usarlo
        qrDataURL = sessionData.lastQRDataURL;
        logSession(sessionId, `✅ QR encontrado para cliente existente: ${session.session_name}`);
      } else if (!sessionData.isReady) {
        // Si la sesión existe pero no está lista y no tiene QR, resetearla para forzar nuevo QR
        if (!sessionData.lastQRDataURL) {
          logSession(sessionId, `🔄 Sesión "${session.session_name}" existe pero no tiene QR, reseteando para generar nuevo QR...`);
          try {
            await sessionManager.resetSession(session.session_name);
            logSession(sessionId, `✅ Sesión "${session.session_name}" reseteada`);
            
            // Esperar un poco para que se reinicie
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Obtener la nueva sesión después del reset
            sessionData = sessionManager.getSession(session.session_name);
          } catch (resetError) {
            logSession(sessionId, `❌ Error reseteando sesión "${session.session_name}": ${resetError?.message || resetError}`);
          }
        }
        
        // Esperar a que se genere el QR (máximo 30 segundos)
        logSession(sessionId, `⏳ Esperando generación de QR para sesión "${session.session_name}"...`);
        const maxWaitTime = 30000;
        const startTime = Date.now();
        while (!qrDataURL && (Date.now() - startTime) < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (sessionData?.lastQRDataURL) {
            qrDataURL = sessionData.lastQRDataURL;
            logSession(sessionId, `✅ QR generado para cliente existente: ${session.session_name}`);
            break;
          }
          // Actualizar referencia a sessionData
          sessionData = sessionManager.getSession(session.session_name);
          if (sessionData?.isReady) {
            logSession(sessionId, `⚠️ Sesión "${session.session_name}" se conectó antes de generar QR`);
            break;
          }
        }
        
        if (!qrDataURL) {
          logSession(sessionId, `⚠️ QR no generado después de ${maxWaitTime}ms para sesión: ${session.session_name}`);
        }
      } else if (sessionData.isReady) {
        // Si la sesión ya está conectada, resetearla para forzar nuevo QR
        logSession(sessionId, `🔄 Sesión "${session.session_name}" ya está conectada, reseteando para generar nuevo QR...`);
        try {
          await sessionManager.resetSession(session.session_name);
          logSession(sessionId, `✅ Sesión "${session.session_name}" reseteada`);
          
          // Esperar un poco para que se reinicie
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Obtener la nueva sesión después del reset
          sessionData = sessionManager.getSession(session.session_name);
          
          if (sessionData) {
            // Esperar a que se genere el QR (máximo 30 segundos)
            const maxWaitTime = 30000;
            const startTime = Date.now();
            while (!qrDataURL && (Date.now() - startTime) < maxWaitTime) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              if (sessionData.lastQRDataURL) {
                qrDataURL = sessionData.lastQRDataURL;
                logSession(sessionId, `✅ QR generado después de reset para cliente existente: ${session.session_name}`);
                break;
              }
              // Actualizar referencia a sessionData
              sessionData = sessionManager.getSession(session.session_name);
              if (sessionData?.isReady && !sessionData.forceQR) {
                logSession(sessionId, `⚠️ Sesión "${session.session_name}" se reconectó antes de generar QR`);
                break;
              }
            }
            
            if (!qrDataURL) {
              logSession(sessionId, `⚠️ QR no generado después de reset y ${maxWaitTime}ms para sesión: ${session.session_name}`);
            }
          }
        } catch (resetError) {
          logSession(sessionId, `❌ Error reseteando sesión "${session.session_name}": ${resetError?.message || resetError}`);
        }
      } else {
        logSession(sessionId, `ℹ️ Cliente existente sin QR disponible (estado desconocido): ${session.session_name}`);
      }
    } catch (err) {
      logSession(sessionId, `⚠️ Error obteniendo QR de cliente existente: ${err?.message || err}`);
    }
  }
  
  const { buildExistingClientMessage } = await import('./messageBuilder.js');
  
  return {
    message: buildExistingClientMessage(existingClient, null), // No usar pairing code, usar QR
    hasPendingSession: true,
    sessionName: session?.session_name || null,
    qrDataURL: qrDataURL,
    pairingCode: null
  };
}

/**
 * Busca una sesión pendiente por número de teléfono y obtiene su QR si está disponible
 * @param {string} phoneNumber - Número de teléfono
 * @param {string} sessionId - ID de la sesión para logging
 * @param {Object} sessionManager - Instancia del SessionManager (opcional)
 * @returns {Promise<Object|null>} { message: string, hasPendingSession: boolean, sessionName: string|null, qrDataURL: string|null } o null
 */
export async function findPendingSession(phoneNumber, sessionId, sessionManager = null) {
  const pendingSession = await findPendingSessionByPhone(phoneNumber);
  
  if (!pendingSession) {
    return null;
  }
  
  logSession(sessionId, `✅ Sesión pendiente encontrada para ${phoneNumber}: ${pendingSession.session.session_name}`);
  
  // Intentar obtener el QR de la sesión existente
  let qrDataURL = null;
  if (sessionManager) {
    try {
      let sessionData = sessionManager.getSession(pendingSession.session.session_name);
      
      // Si la sesión no existe en el SessionManager, crearla e iniciarla
      if (!sessionData) {
        logSession(sessionId, `🔄 Sesión pendiente "${pendingSession.session.session_name}" no existe en SessionManager, creándola...`);
        
        // Eliminar autenticación guardada si existe para forzar nuevo QR
        // Esto evita conflictos con sesiones anteriores que puedan causar LOGOUT inmediato
        try {
          const path = await import('path');
          const fs = await import('fs');
          
          if (sessionManager && sessionManager.sessionBaseDir) {
            const sessionPath = path.join(sessionManager.sessionBaseDir, pendingSession.session.session_name);
            const authPath = path.join(sessionPath, '.wwebjs_auth');
            
            if (fs.existsSync(authPath)) {
              logSession(sessionId, `🗑️ Eliminando autenticación guardada para forzar nuevo QR: ${pendingSession.session.session_name}`);
              try {
                fs.rmSync(authPath, { recursive: true, force: true });
                logSession(sessionId, `✅ Autenticación eliminada: ${pendingSession.session.session_name}`);
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
        
        await sessionManager.createSession(pendingSession.session.session_name, true); // Auto-inicializar
        sessionData = sessionManager.getSession(pendingSession.session.session_name);
        
        if (sessionData) {
          logSession(sessionId, `✅ Sesión pendiente "${pendingSession.session.session_name}" creada en SessionManager`);
          
          // Esperar a que se genere el QR (máximo 30 segundos)
          const maxWaitTime = 30000;
          const startTime = Date.now();
          while (!qrDataURL && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (sessionData.lastQRDataURL) {
              qrDataURL = sessionData.lastQRDataURL;
              logSession(sessionId, `✅ QR generado para sesión pendiente: ${pendingSession.session.session_name}`);
              break;
            }
            // Actualizar referencia a sessionData por si cambió
            sessionData = sessionManager.getSession(pendingSession.session.session_name);
          }
          
          if (!qrDataURL) {
            logSession(sessionId, `⚠️ QR no generado después de ${maxWaitTime}ms para sesión pendiente: ${pendingSession.session.session_name}`);
          }
        }
      } else if (sessionData?.lastQRDataURL) {
        // Si la sesión existe y tiene QR, usarlo
        qrDataURL = sessionData.lastQRDataURL;
        logSession(sessionId, `✅ QR encontrado para sesión pendiente: ${pendingSession.session.session_name}`);
      } else if (!sessionData.isReady) {
        // Si la sesión existe pero no está lista y no tiene QR, resetearla para forzar nuevo QR
        if (!sessionData.lastQRDataURL) {
          logSession(sessionId, `🔄 Sesión pendiente "${pendingSession.session.session_name}" existe pero no tiene QR, reseteando para generar nuevo QR...`);
          try {
            await sessionManager.resetSession(pendingSession.session.session_name);
            logSession(sessionId, `✅ Sesión pendiente "${pendingSession.session.session_name}" reseteada`);
            
            // Esperar un poco para que se reinicie
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Obtener la nueva sesión después del reset
            sessionData = sessionManager.getSession(pendingSession.session.session_name);
          } catch (resetError) {
            logSession(sessionId, `❌ Error reseteando sesión pendiente "${pendingSession.session.session_name}": ${resetError?.message || resetError}`);
          }
        }
        
        // Esperar a que se genere el QR (máximo 30 segundos)
        logSession(sessionId, `⏳ Esperando generación de QR para sesión pendiente "${pendingSession.session.session_name}"...`);
        const maxWaitTime = 30000;
        const startTime = Date.now();
        while (!qrDataURL && (Date.now() - startTime) < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (sessionData?.lastQRDataURL) {
            qrDataURL = sessionData.lastQRDataURL;
            logSession(sessionId, `✅ QR generado para sesión pendiente: ${pendingSession.session.session_name}`);
            break;
          }
          // Actualizar referencia a sessionData
          sessionData = sessionManager.getSession(pendingSession.session.session_name);
          if (sessionData?.isReady) {
            logSession(sessionId, `⚠️ Sesión pendiente "${pendingSession.session.session_name}" se conectó antes de generar QR`);
            break;
          }
        }
        
        if (!qrDataURL) {
          logSession(sessionId, `⚠️ QR no generado después de ${maxWaitTime}ms para sesión pendiente: ${pendingSession.session.session_name}`);
        }
      } else if (sessionData.isReady) {
        // Si la sesión ya está conectada, resetearla para forzar nuevo QR
        logSession(sessionId, `🔄 Sesión pendiente "${pendingSession.session.session_name}" ya está conectada, reseteando para generar nuevo QR...`);
        try {
          await sessionManager.resetSession(pendingSession.session.session_name);
          logSession(sessionId, `✅ Sesión pendiente "${pendingSession.session.session_name}" reseteada`);
          
          // Esperar un poco para que se reinicie
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Obtener la nueva sesión después del reset
          sessionData = sessionManager.getSession(pendingSession.session.session_name);
          
          if (sessionData) {
            // Esperar a que se genere el QR (máximo 30 segundos)
            const maxWaitTime = 30000;
            const startTime = Date.now();
            while (!qrDataURL && (Date.now() - startTime) < maxWaitTime) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              if (sessionData.lastQRDataURL) {
                qrDataURL = sessionData.lastQRDataURL;
                logSession(sessionId, `✅ QR generado después de reset para sesión pendiente: ${pendingSession.session.session_name}`);
                break;
              }
              // Actualizar referencia a sessionData
              sessionData = sessionManager.getSession(pendingSession.session.session_name);
              if (sessionData?.isReady && !sessionData.forceQR) {
                logSession(sessionId, `⚠️ Sesión pendiente "${pendingSession.session.session_name}" se reconectó antes de generar QR`);
                break;
              }
            }
            
            if (!qrDataURL) {
              logSession(sessionId, `⚠️ QR no generado después de reset y ${maxWaitTime}ms para sesión pendiente: ${pendingSession.session.session_name}`);
            }
          }
        } catch (resetError) {
          logSession(sessionId, `❌ Error reseteando sesión pendiente "${pendingSession.session.session_name}": ${resetError?.message || resetError}`);
        }
      } else {
        logSession(sessionId, `ℹ️ Sesión pendiente sin QR disponible (estado desconocido): ${pendingSession.session.session_name}`);
      }
    } catch (err) {
      logSession(sessionId, `⚠️ Error obteniendo QR de sesión existente: ${err?.message || err}`);
    }
  }
  
  const { buildPendingSessionMessage } = await import('./messageBuilder.js');
  
  return {
    message: buildPendingSessionMessage(pendingSession, null), // No usar pairing code, usar QR
    hasPendingSession: true,
    sessionName: pendingSession.session.session_name,
    qrDataURL: qrDataURL,
    pairingCode: null
  };
}

