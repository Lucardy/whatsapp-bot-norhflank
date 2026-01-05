// Utilidades de retry con exponential backoff
import { log, logSession } from '../logger/index.js';

/**
 * Ejecuta una función con retry y exponential backoff
 * @param {Function} fn - Función async a ejecutar
 * @param {Object} options - Opciones de retry
 * @param {number} options.maxRetries - Número máximo de intentos (default: 3)
 * @param {number} options.initialDelay - Delay inicial en ms (default: 1000)
 * @param {number} options.maxDelay - Delay máximo en ms (default: 10000)
 * @param {number} options.multiplier - Multiplicador para exponential backoff (default: 2)
 * @param {Function} options.shouldRetry - Función que determina si se debe reintentar (default: siempre true)
 * @param {string} options.context - Contexto para logging (default: 'retry')
 * @param {string} options.sessionId - ID de sesión para logging (opcional)
 * @returns {Promise<any>} Resultado de la función
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    multiplier = 2,
    shouldRetry = () => true,
    context = 'retry',
    sessionId = null
  } = options;
  
  let lastError;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Si no debemos reintentar, lanzar el error
      if (!shouldRetry(error, attempt)) {
        throw error;
      }
      
      // Si es el último intento, lanzar el error
      if (attempt === maxRetries) {
        const logger = sessionId ? (msg, ...args) => logSession(sessionId, msg, ...args) : log;
        logger(`❌ [${context}] Falló después de ${maxRetries + 1} intentos: ${error?.message || error}`);
        throw error;
      }
      
      // Log del intento
      const logger = sessionId ? (msg, ...args) => logSession(sessionId, msg, ...args) : log;
      logger(`⚠️ [${context}] Intento ${attempt + 1}/${maxRetries + 1} falló, reintentando en ${delay}ms...`);
      
      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Calcular siguiente delay (exponential backoff)
      delay = Math.min(delay * multiplier, maxDelay);
    }
  }
  
  throw lastError;
}

/**
 * Circuit breaker para operaciones que pueden fallar frecuentemente
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minuto
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }
  
  /**
   * Ejecuta una función a través del circuit breaker
   * @param {Function} fn - Función async a ejecutar
   * @returns {Promise<any>} Resultado de la función
   */
  async execute(fn) {
    // Verificar si debemos intentar resetear
    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextAttemptTime) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN. Too many failures.');
      }
    }
    
    try {
      const result = await fn();
      
      // Si tuvimos éxito, resetear contador
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
      } else if (this.state === 'CLOSED') {
        this.failureCount = 0;
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      // Si superamos el threshold, abrir el circuit
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
        this.nextAttemptTime = Date.now() + this.resetTimeout;
      }
      
      throw error;
    }
  }
  
  /**
   * Resetea el circuit breaker manualmente
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }
  
  /**
   * Obtiene el estado actual del circuit breaker
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }
}

