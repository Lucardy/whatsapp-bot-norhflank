// Tests para el middleware de rate limiting
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Rate Limiting Middleware', () => {
  // Nota: Estos tests son básicos ya que express-rate-limit requiere un servidor Express real
  // Para tests más completos, se necesitaría usar supertest o similar
  
  it('debe exportar los limiters correctamente', async () => {
    const { generalLimiter, strictLimiter, qrLimiter, healthLimiter } = await import('../../src/middleware/rateLimit.js');
    
    expect(generalLimiter).toBeDefined();
    expect(strictLimiter).toBeDefined();
    expect(qrLimiter).toBeDefined();
    expect(healthLimiter).toBeDefined();
  });
  
  it('debe tener configuraciones de ventana de tiempo correctas', async () => {
    const { generalLimiter, strictLimiter, qrLimiter, healthLimiter } = await import('../../src/middleware/rateLimit.js');
    
    // Verificar que los limiters tienen las propiedades esperadas
    expect(generalLimiter).toHaveProperty('windowMs');
    expect(strictLimiter).toHaveProperty('windowMs');
    expect(qrLimiter).toHaveProperty('windowMs');
    expect(healthLimiter).toHaveProperty('windowMs');
  });
});

