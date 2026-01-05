// Re-exportar funciones del cache mejorado
// Este archivo mantiene compatibilidad hacia atrás mientras migramos
export {
  getCachedConfig,
  setCachedConfig,
  clearConfigCache,
  checkCooldown,
  getLastMessageTime
} from '../cache/index.js';

