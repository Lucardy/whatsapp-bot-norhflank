// Scheduler para verificación diaria de expiración de trials y suscripciones
import { log } from '../../utils/logger/index.js';
import { checkTrialExpiration, checkActiveSubscriptionExpiration } from './subscriptionService.js';

let schedulerInterval = null;
let isRunning = false;

/**
 * Inicia el scheduler de verificación de suscripciones
 * Ejecuta la verificación diariamente a las 00:00 (medianoche)
 * @param {boolean} runImmediately - Si true, ejecuta la verificación inmediatamente
 */
export function startSubscriptionScheduler(runImmediately = false) {
  if (isRunning) {
    log('⚠️ Subscription scheduler ya está corriendo');
    return;
  }

  log('🚀 Iniciando scheduler de verificación de suscripciones...');

  // Ejecutar inmediatamente si se solicita
  if (runImmediately) {
    log('🔍 Ejecutando verificación inicial de trials y suscripciones...');
    checkTrialExpiration().catch(err => {
      log(`❌ Error en verificación inicial de trials: ${err?.message || err}`);
    });
    checkActiveSubscriptionExpiration().catch(err => {
      log(`❌ Error en verificación inicial de suscripciones: ${err?.message || err}`);
    });
  }

  // Calcular tiempo hasta la próxima medianoche
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0); // Próxima medianoche
  const msUntilMidnight = midnight - now;

  log(`⏰ Próxima verificación programada para: ${midnight.toLocaleString()}`);

  // Programar primera ejecución a medianoche
  setTimeout(() => {
    log('🔍 Ejecutando verificación diaria de trials y suscripciones...');
    checkTrialExpiration().catch(err => {
      log(`❌ Error en verificación diaria de trials: ${err?.message || err}`);
    });
    checkActiveSubscriptionExpiration().catch(err => {
      log(`❌ Error en verificación diaria de suscripciones: ${err?.message || err}`);
    });

    // Configurar intervalo diario (24 horas)
    schedulerInterval = setInterval(() => {
      log('🔍 Ejecutando verificación diaria de trials y suscripciones...');
      checkTrialExpiration().catch(err => {
        log(`❌ Error en verificación diaria de trials: ${err?.message || err}`);
      });
      checkActiveSubscriptionExpiration().catch(err => {
        log(`❌ Error en verificación diaria de suscripciones: ${err?.message || err}`);
      });
    }, 24 * 60 * 60 * 1000); // 24 horas en milisegundos

    isRunning = true;
    log('✅ Scheduler de suscripciones iniciado (verificación diaria a medianoche)');
  }, msUntilMidnight);
}

/**
 * Detiene el scheduler de verificación de suscripciones
 */
export function stopSubscriptionScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    isRunning = false;
    log('🛑 Scheduler de suscripciones detenido');
  }
}

/**
 * Ejecuta una verificación manual (útil para testing)
 * @returns {Promise<Object>} Resumen de la verificación
 */
export async function runManualCheck() {
  log('🔍 Ejecutando verificación manual de trials y suscripciones...');
  const trialResult = await checkTrialExpiration();
  const subscriptionResult = await checkActiveSubscriptionExpiration();
  return {
    trials: trialResult,
    subscriptions: subscriptionResult
  };
}
