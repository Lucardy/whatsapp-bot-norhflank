// Listeners para eventos de autenticación de WhatsApp
import { logSession } from '../../../utils/logger/index.js';
import { updateSessionState, SessionState, markSessionDisconnected } from '../stateManager.js';
import { handleDisconnection } from '../reconnectManager.js';

/**
 * Configura los listeners para eventos de autenticación
 * @param {Object} client - Cliente de WhatsApp
 * @param {string} sessionId - ID de la sesión
 * @param {Object} sessionData - Datos de la sesión
 * @param {Function} ensureInit - Función para reinicializar la sesión
 * @param {string} sessionPath - Ruta donde se guarda la sesión
 */
export function setupAuthListeners(client, sessionId, sessionData, ensureInit, sessionPath) {
  // Listener: authenticated
  client.once('authenticated', async () => {
    const s = await client.getState().catch(() => 'NO_STATE');
    logSession(sessionId, '🔐 EVENTO AUTHENTICATED RECIBIDO - state =', s);
    
    // Una vez autenticado, la sesión ya está guardada por LocalAuth
    // No necesitamos esperar el evento 'ready' - marcamos como ready inmediatamente
    if (!sessionData.isReady) {
      logSession(sessionId, '✅ QR escaneado - Sesión autenticada y guardada');
      logSession(sessionId, '🔄 Marcando sesión como ready...');
      
      // Esperar un poco y verificar el estado nuevamente antes de marcar como ready
      setTimeout(async () => {
        try {
          const currentState = await client.getState().catch(() => null);
          logSession(sessionId, `📊 Estado después de authenticated (2 segundos): ${currentState || 'null'}`);
        } catch (err) {
          logSession(sessionId, `⚠️ Error verificando estado después de authenticated: ${err?.message || err}`);
        }
      }, 2000);
      
      const { markSessionAsReady } = await import('../stateManager.js');
      await markSessionAsReady(client, sessionData, sessionId, null, {
        clearQR: true,
        context: 'authenticated'
      });
      
      // Verificación periódica del estado después de authenticated (por si los eventos no se disparan)
      let checkCount = 0;
      const maxChecks = 10; // Verificar durante 20 segundos (10 checks * 2 segundos)
      const stateCheckInterval = setInterval(async () => {
        checkCount++;
        try {
          const currentState = await client.getState().catch(() => null);
          logSession(sessionId, `🔍 Verificación periódica #${checkCount}: estado = ${currentState || 'null'}`);
          
          if (currentState === 'CONNECTED' && !sessionData.isReady) {
            logSession(sessionId, '✅ Estado CONNECTED detectado en verificación periódica, marcando como ready...');
            const { markSessionAsReady } = await import('../stateManager.js');
            await markSessionAsReady(client, sessionData, sessionId, null, {
              clearQR: true,
              context: 'periodic_check'
            });
            clearInterval(stateCheckInterval);
          } else if (sessionData.isReady) {
            logSession(sessionId, '✅ Sesión ya está marcada como ready, deteniendo verificación periódica');
            clearInterval(stateCheckInterval);
          } else if (checkCount >= maxChecks) {
            logSession(sessionId, `⚠️ Verificación periódica completada (${maxChecks} checks), estado aún no es CONNECTED`);
            clearInterval(stateCheckInterval);
          }
        } catch (err) {
          logSession(sessionId, `⚠️ Error en verificación periódica: ${err?.message || err}`);
          if (checkCount >= maxChecks) {
            clearInterval(stateCheckInterval);
          }
        }
      }, 2000); // Verificar cada 2 segundos
      
      // Si es una sesión de cliente, enviar mensaje de confirmación desde el master
      try {
        const { getSessionType } = await import('../../../services/database/sessionService.js');
        const sessionType = await getSessionType(sessionId);
        
        if (sessionType === 'client') {
          logSession(sessionId, `📤 Enviando confirmación de conexión para cliente...`);
          // Esperar un poco para asegurar que el número se guardó en la DB
          setTimeout(async () => {
            try {
              const { sendConnectionConfirmation } = await import('../connectionConfirmation.js');
              await sendConnectionConfirmation(sessionId);
            } catch (confirmationError) {
              logSession(sessionId, `⚠️ Error enviando confirmación: ${confirmationError?.message || confirmationError}`);
            }
          }, 3000); // Esperar 3 segundos para que se complete el guardado del número
        }
      } catch (typeError) {
        logSession(sessionId, `⚠️ Error verificando tipo de sesión: ${typeError?.message || typeError}`);
      }
    }
    
    // Verificar que la sesión se esté guardando
    if (sessionPath) {
      try {
        const path = await import('path');
        const fs = await import('fs');
        const authPath = path.join(sessionPath, '.wwebjs_auth');
        logSession(sessionId, `🔍 Verificando guardado de sesión en: ${authPath}`);
        // Verificar que la sesión se haya guardado (LocalAuth guarda automáticamente después de authenticated)
        setTimeout(() => {
          const exists = fs.existsSync(authPath);
          if (exists) {
            logSession(sessionId, `✅ Sesión guardada correctamente en: ${authPath}`);
          } else {
            logSession(sessionId, `💡 La sesión se guarda automáticamente por LocalAuth`);
            logSession(sessionId, `   Si el bot se reconecta automáticamente al reiniciar, la sesión está guardada correctamente`);
          }
        }, 3000);
      } catch (authCheckError) {
        logSession(sessionId, `⚠️ Error verificando guardado de sesión: ${authCheckError?.message || authCheckError}`);
      }
    }
  });

  // Listener: change_state
  client.on('change_state', async (s) => {
    const previousState = sessionData.state || 'unknown';
    logSession(sessionId, `🔄 EVENTO CHANGE_STATE RECIBIDO: ${previousState} → ${s}`);
    const newState = s === 'CONNECTED' ? SessionState.CONNECTED : SessionState.DISCONNECTED;
    updateSessionState(sessionData, sessionId, newState);
    
    // Verificar también el estado real del cliente
    try {
      const actualState = await client.getState().catch(() => null);
      logSession(sessionId, `📊 Estado real del cliente (getState()): ${actualState || 'null'}`);
    } catch (err) {
      logSession(sessionId, `⚠️ Error obteniendo estado real: ${err?.message || err}`);
    }
    
    // Si el estado cambió a CONNECTED y aún no está marcado como ready, ejecutar la lógica de ready
    if (s === 'CONNECTED' && !sessionData.isReady) {
      logSession(sessionId, '✅ Estado CONNECTED detectado en change_state, ejecutando lógica de ready...');
      
      try {
        const { markSessionAsReady } = await import('../stateManager.js');
        await markSessionAsReady(client, sessionData, sessionId, null, {
          clearQR: true,
          context: 'change_state'
        });
        
        // Si es una sesión de cliente, enviar mensaje de confirmación desde el master
        try {
          const { getSessionType } = await import('../../../services/database/sessionService.js');
          const sessionType = await getSessionType(sessionId);
          
          if (sessionType === 'client') {
            logSession(sessionId, `📤 Enviando confirmación de conexión para cliente...`);
            // Esperar un poco para asegurar que el número se guardó en la DB
            setTimeout(async () => {
              try {
                const { sendConnectionConfirmation } = await import('../connectionConfirmation.js');
                await sendConnectionConfirmation(sessionId);
              } catch (confirmationError) {
                logSession(sessionId, `⚠️ Error enviando confirmación: ${confirmationError?.message || confirmationError}`);
              }
            }, 3000); // Esperar 3 segundos para que se complete el guardado del número
          }
        } catch (typeError) {
          logSession(sessionId, `⚠️ Error verificando tipo de sesión: ${typeError?.message || typeError}`);
        }
      } catch (readyError) {
        logSession(sessionId, `⚠️ Error ejecutando lógica de ready desde change_state: ${readyError?.message || readyError}`);
      }
    } else if (s === 'CONNECTED') {
      sessionData.isReady = true;
    } else {
      sessionData.isReady = false;
    }
  });

  // Listener: auth_failure
  client.on('auth_failure', (m) => logSession(sessionId, '❌ auth_failure:', m));

  // Listener: disconnected
  client.on('disconnected', async (reason) => {
    handleDisconnection(
      sessionData,
      sessionId,
      reason,
      ensureInit,
      markSessionDisconnected
    );
    
    // Destruir cliente
    try { await client.destroy(); } catch {}
    sessionData.client = null;
  });
}

