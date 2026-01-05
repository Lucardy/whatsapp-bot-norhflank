// Configuración y conexión a la base de datos
import { PrismaClient } from '@prisma/client';
import { log } from '../utils/logger/index.js';

// Singleton de Prisma Client
let prisma = null;

/**
 * Obtiene o crea la instancia de Prisma Client
 * @returns {PrismaClient}
 */
export function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });
    
    // Manejo de desconexión limpia
    process.on('beforeExit', async () => {
      await prisma.$disconnect();
    });
    
    log('✅ Prisma Client inicializado');
  }
  
  return prisma;
}

/**
 * Verifica la conexión a la base de datos con retry
 */
export async function testConnection() {
  try {
    const { retryWithBackoff } = await import('../utils/errorHandling/retry.js');
    
    return await retryWithBackoff(
      async () => {
        const db = getPrisma();
        await db.$queryRaw`SELECT 1`;
        log('✅ Conexión a base de datos exitosa');
        return true;
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        context: 'database-connection',
        shouldRetry: (error) => {
          // Reintentar solo en errores de conexión
          return error?.code === 'ECONNREFUSED' || 
                 error?.code === 'ETIMEDOUT' ||
                 error?.message?.includes('connect');
        }
      }
    );
  } catch (error) {
    log('❌ Error conectando a base de datos después de retries:', error?.message || error);
    return false;
  }
}

/**
 * Health check de la base de datos
 * @returns {Promise<Object>} Estado de la conexión
 */
export async function getDatabaseHealth() {
  try {
    const prisma = getPrisma();
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    
    return {
      status: 'healthy',
      latency,
      connected: true
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error?.message || 'Unknown error',
      connected: false
    };
  }
}

/**
 * Cierra la conexión a la base de datos
 */
export async function disconnect() {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    log('🔌 Desconectado de base de datos');
  }
}

