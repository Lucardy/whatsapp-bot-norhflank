// Módulo principal del flujo de prueba gratuita
// Exporta todas las funciones públicas del flujo

export { TrialStep } from './constants.js';
export { startTrialFlow } from './startFlow.js';
export { handleTrialStep } from './stepHandler.js';
export { completeTrialFlow } from './completeFlow.js';
export { isInTrialFlow, getTrialStep, cancelTrialFlow, getTrialSession } from './utils.js';

