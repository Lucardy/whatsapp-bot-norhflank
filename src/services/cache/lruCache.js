// Implementación de LRU Cache para limitar el tamaño del caché
import { log } from '../../utils/logger/index.js';

/**
 * Nodo de la lista doblemente enlazada para LRU Cache
 */
class CacheNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
    this.timestamp = Date.now();
  }
}

/**
 * LRU Cache con TTL (Time To Live)
 */
export class LRUCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.ttl = options.ttl || null; // null = sin expiración
    this.cache = new Map(); // key -> CacheNode
    this.head = null; // Nodo más reciente
    this.tail = null; // Nodo menos reciente
  }
  
  /**
   * Obtiene un valor del caché
   * @param {string} key - Clave
   * @returns {any|null} Valor o null si no existe o expiró
   */
  get(key) {
    const node = this.cache.get(key);
    
    if (!node) {
      return null;
    }
    
    // Verificar TTL
    if (this.ttl && (Date.now() - node.timestamp) > this.ttl) {
      this.delete(key);
      return null;
    }
    
    // Mover al inicio (más reciente)
    this.moveToHead(node);
    
    return node.value;
  }
  
  /**
   * Establece un valor en el caché
   * @param {string} key - Clave
   * @param {any} value - Valor
   */
  set(key, value) {
    let node = this.cache.get(key);
    
    if (node) {
      // Actualizar valor existente
      node.value = value;
      node.timestamp = Date.now();
      this.moveToHead(node);
    } else {
      // Crear nuevo nodo
      node = new CacheNode(key, value);
      
      // Si el caché está lleno, eliminar el menos reciente
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }
      
      this.cache.set(key, node);
      this.addToHead(node);
    }
  }
  
  /**
   * Elimina un valor del caché
   * @param {string} key - Clave
   */
  delete(key) {
    const node = this.cache.get(key);
    if (!node) {
      return;
    }
    
    this.removeNode(node);
    this.cache.delete(key);
  }
  
  /**
   * Limpia todo el caché
   */
  clear() {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }
  
  /**
   * Obtiene el tamaño actual del caché
   * @returns {number} Tamaño
   */
  size() {
    return this.cache.size;
  }
  
  /**
   * Mueve un nodo al inicio (más reciente)
   * @param {CacheNode} node - Nodo a mover
   */
  moveToHead(node) {
    if (node === this.head) {
      return;
    }
    
    this.removeNode(node);
    this.addToHead(node);
  }
  
  /**
   * Agrega un nodo al inicio
   * @param {CacheNode} node - Nodo a agregar
   */
  addToHead(node) {
    node.prev = null;
    node.next = this.head;
    
    if (this.head) {
      this.head.prev = node;
    }
    
    this.head = node;
    
    if (!this.tail) {
      this.tail = node;
    }
  }
  
  /**
   * Remueve un nodo de la lista
   * @param {CacheNode} node - Nodo a remover
   */
  removeNode(node) {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }
  
  /**
   * Elimina el nodo menos reciente (LRU)
   */
  evictLRU() {
    if (!this.tail) {
      return;
    }
    
    const lruKey = this.tail.key;
    this.delete(lruKey);
    log(`🧹 LRU Cache: Evicting key "${lruKey}" (cache full)`);
  }
  
  /**
   * Limpia entradas expiradas
   * @returns {number} Número de entradas eliminadas
   */
  cleanupExpired() {
    if (!this.ttl) {
      return 0;
    }
    
    let cleaned = 0;
    const now = Date.now();
    
    for (const [key, node] of this.cache.entries()) {
      if ((now - node.timestamp) > this.ttl) {
        this.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      log(`🧹 LRU Cache: Cleaned ${cleaned} expired entries`);
    }
    
    return cleaned;
  }
  
  /**
   * Obtiene estadísticas del caché
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
      oldestKey: this.tail?.key || null,
      newestKey: this.head?.key || null
    };
  }
}

