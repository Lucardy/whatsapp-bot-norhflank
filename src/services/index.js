// Re-export de servicios principales para reducir imports profundos
// Este archivo permite importar servicios sin usar rutas relativas profundas (../../../)

// Session Manager
export { SessionManager } from './sessionManager/index.js';
export { getGlobalSessionManager, setGlobalSessionManager } from './sessionManager/global.js';
export { markSessionAsReady, markSessionReady, markSessionDisconnected, SessionState } from './sessionManager/stateManager.js';

// Message Handler
export { handleMessage, setSessionReadyTime, getSessionReadyTime } from './messageHandler/index.js';
export { sendBotMessage, sendBotMessageWithMedia, markBotSentMessage, isChatHumanManaged } from './messageHandler/humanManager.js';

// Database Services
export * from './database/index.js';

// Trial Flow
export { startTrialFlow } from './trialFlow/index.js';

// Admin Flow
export * from './adminFlow/index.js';

// Configuration Flow
export * from './configurationFlow/index.js';
