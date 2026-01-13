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
    logSession(sessionId, '🔐 authenticated, state =', s);
    
    // Una vez autenticado, la sesión ya está guardada por LocalAuth
    // No necesitamos esperar el evento 'ready' - marcamos como ready inmediatamente
    if (!sessionData.isReady) {
      logSession(sessionId, '✅ QR escaneado - Sesión autenticada y guardada');
      logSession(sessionId, '🔄 Marcando sesión como ready...');
      
      const { markSessionAsReady } = await import('../stateManager.js');
      await markSessionAsReady(client, sessionData, sessionId, null, {
        clearQR: true,
        context: 'authenticated'
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
    logSession(sessionId, `🔄 Estado cambiado: ${sessionData.state || 'unknown'} → ${s}`);
    const newState = s === 'CONNECTED' ? SessionState.CONNECTED : SessionState.DISCONNECTED;
    updateSessionState(sessionData, sessionId, newState);
    
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

