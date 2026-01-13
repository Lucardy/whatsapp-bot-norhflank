// Exportar todos los validadores desde un solo lugar
// NO re-exportar desde validation.js para evitar ciclos
export * from './phoneNormalizer.js';
export * from './phoneValidator.js';
export * from './emailValidator.js';
export * from './messageValidator.js';
export * from './configValidator.js';
export * from './clientValidator.js';

// Exportar funciones específicas de validation.js
export { validateSessionName, validateSessionType, validateSessionStatus } from '../validation.js';

