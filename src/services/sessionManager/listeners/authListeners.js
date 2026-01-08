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
 */
export function setupAuthListeners(client, sessionId, sessionData, ensureInit) {
  // Listener: authenticated
  client.once('authenticated', async () => {
    const s = await client.getState().catch(() => 'NO_STATE');
    logSession(sessionId, '🔐 authenticated, state =', s);
  });

  // Listener: change_state
  client.on('change_state', async (s) => {
    sessionData.isReady = (s === 'CONNECTED');
    const newState = s === 'CONNECTED' ? SessionState.CONNECTED : SessionState.DISCONNECTED;
    updateSessionState(sessionData, sessionId, newState);
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

