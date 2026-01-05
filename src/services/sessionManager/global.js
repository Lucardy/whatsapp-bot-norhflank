// Módulo para almacenar el SessionManager globalmente
// Esto permite que otros módulos accedan al sessionManager sin pasarlo como parámetro

let globalSessionManager = null;

/**
 * Establece el SessionManager global
 * @param {SessionManager} sessionManager - Instancia del SessionManager
 */
export function setGlobalSessionManager(sessionManager) {
  globalSessionManager = sessionManager;
}

/**
 * Obtiene el SessionManager global
 * @returns {SessionManager|null} Instancia del SessionManager o null si no está establecido
 */
export function getGlobalSessionManager() {
  return globalSessionManager;
}

