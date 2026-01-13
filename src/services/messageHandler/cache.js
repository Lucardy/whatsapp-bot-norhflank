// Re-exportar funciones del cache mejorado
// Este archivo mantiene compatibilidad hacia atrás mientras migramos
export {
  getCachedConfig,
  setCachedConfig,
  clearCachedConfig as clearConfigCache,
  checkCooldown,
  getLastMessageTime,
  updateLastMessageTime
} from '../cache/index.js';
