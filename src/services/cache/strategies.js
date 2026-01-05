// Estrategias de cache (TTL, LRU)
import { log } from '../../utils/logger/index.js';

/**
 * Cache con TTL (Time To Live)
 */
export class TTLCache {
  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutos por defecto
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Obtiene un valor del cache
   * @param {string} key - Clave
   * @returns {any|null} Valor o null si expiró/no existe
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Verificar si expiró
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Guarda un valor en el cache
   * @param {string} key - Clave
   * @param {any} value - Valor
   * @param {number} ttl - TTL en milisegundos (opcional, usa defaultTTL si no se especifica)
   */
  set(key, value, ttl = null) {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });
  }

  /**
   * Elimina una entrada del cache
   * @param {string} key - Clave
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Limpia todo el cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Limpia entradas expiradas
   * @returns {number} Número de entradas eliminadas
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * Obtiene el tamaño del cache
   * @returns {number} Número de entradas
   */
  size() {
    return this.cache.size;
  }
}

/**
 * Cache LRU (Least Recently Used)
 */
export class LRUCache {
  constructor(maxSize = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Obtiene un valor del cache
   * @param {string} key - Clave
   * @returns {any|null} Valor o null si no existe
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    // Mover al final (más reciente)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    
    return value;
  }

  /**
   * Guarda un valor en el cache
   * @param {string} key - Clave
   * @param {any} value - Valor
   */
  set(key, value) {
    // Si ya existe, actualizar y mover al final
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Eliminar el más antiguo (primero en el Map)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }

  /**
   * Elimina una entrada del cache
   * @param {string} key - Clave
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Limpia todo el cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Obtiene el tamaño del cache
   * @returns {number} Número de entradas
   */
  size() {
    return this.cache.size;
  }
}

