// Servicio para operaciones con planes
import { getPrisma } from '../../config/database.js';
import { logSession } from '../../utils/logger/index.js';

/**
 * Obtiene un plan por su ID
 * @param {number} planId - ID del plan
 * @returns {Promise<Object|null>} Plan o null si no existe
 */
export async function getPlanById(planId) {
  try {
    const db = getPrisma();
    return await db.plan.findUnique({
      where: { id: planId }
    });
  } catch (error) {
    logSession('plan', `⚠️ Error obteniendo plan ${planId}: ${error?.message || error}`);
    return null;
  }
}

/**
 * Obtiene un plan por su nombre
 * @param {string} planName - Nombre del plan (ej: "básico", "pro", "premium")
 * @returns {Promise<Object|null>} Plan o null si no existe
 */
export async function getPlanByName(planName) {
  try {
    const db = getPrisma();
    return await db.plan.findUnique({
      where: { name: planName }
    });
  } catch (error) {
    logSession('plan', `⚠️ Error obteniendo plan ${planName}: ${error?.message || error}`);
    return null;
  }
}

/**
 * Obtiene todos los planes disponibles
 * @returns {Promise<Array>} Lista de planes
 */
export async function getAllPlans() {
  try {
    const db = getPrisma();
    return await db.plan.findMany({
      orderBy: {
        price_monthly: 'asc'
      }
    });
  } catch (error) {
    logSession('plan', `⚠️ Error obteniendo planes: ${error?.message || error}`);
    return [];
  }
}
