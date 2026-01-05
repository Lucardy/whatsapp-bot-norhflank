// Tests para manejo de errores y retry logic
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { retryWithBackoff, CircuitBreaker } from '../../src/utils/errorHandling/retry.js';

describe('Retry con Exponential Backoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('debe ejecutar función exitosa sin retry', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    
    const result = await retryWithBackoff(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('debe hacer retry en caso de error', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'))
      .mockResolvedValue('success');
    
    const promise = retryWithBackoff(fn, { maxRetries: 2, initialDelay: 100 });
    
    // Avanzar timers
    jest.advanceTimersByTime(100);
    jest.advanceTimersByTime(200);
    
    const result = await promise;
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test('debe lanzar error después de max retries', async () => {
    const error = new Error('Persistent error');
    const fn = jest.fn().mockRejectedValue(error);
    
    const promise = retryWithBackoff(fn, { maxRetries: 2, initialDelay: 100 });
    
    jest.advanceTimersByTime(1000);
    
    await expect(promise).rejects.toThrow('Persistent error');
    expect(fn).toHaveBeenCalledTimes(3); // 1 inicial + 2 retries
  });
});

describe('Circuit Breaker', () => {
  test('debe ejecutar función cuando está CLOSED', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });
    const fn = jest.fn().mockResolvedValue('success');
    
    const result = await breaker.execute(fn);
    
    expect(result).toBe('success');
    expect(breaker.getState().state).toBe('CLOSED');
  });

  test('debe abrir circuit después de muchos fallos', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 2 });
    const error = new Error('Test error');
    const fn = jest.fn().mockRejectedValue(error);
    
    // Primer fallo
    await expect(breaker.execute(fn)).rejects.toThrow();
    expect(breaker.getState().state).toBe('CLOSED');
    
    // Segundo fallo (debe abrir)
    await expect(breaker.execute(fn)).rejects.toThrow();
    expect(breaker.getState().state).toBe('OPEN');
    
    // Tercer intento debe fallar inmediatamente
    await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is OPEN');
  });
});

