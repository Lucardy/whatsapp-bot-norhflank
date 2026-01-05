// Exportar todas las funciones del menú
export { showInitialMenu } from './initialMenu.js';
export { showSessionManagementMenu } from './mainMenu.js';
export { loadSessions, sessionExists, saveSessions } from './sessionHelpers.js';

// Re-exportar para compatibilidad
export { showInitialMenu as default } from './initialMenu.js';

