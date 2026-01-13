// Tests para el validador de números de teléfono
import { describe, it, expect } from '@jest/globals';
import { normalizePhoneNumber } from '../../src/utils/validation/phoneValidator.js';

describe('Phone Validator', () => {
  describe('normalizePhoneNumber', () => {
    it('debe normalizar números con código de país', () => {
      expect(normalizePhoneNumber('+54 9 11 6995-6253')).toBe('5491169956253');
      expect(normalizePhoneNumber('5491169956253')).toBe('5491169956253');
    });
    
    it('debe normalizar números sin código de país', () => {
      expect(normalizePhoneNumber('11 6995-6253')).toBe('1169956253');
      expect(normalizePhoneNumber('1169956253')).toBe('1169956253');
    });
    
    it('debe eliminar espacios y guiones', () => {
      expect(normalizePhoneNumber('+54 9 11 6995-6253')).toBe('5491169956253');
      expect(normalizePhoneNumber('11-6995-6253')).toBe('1169956253');
    });
    
    it('debe manejar números con formato internacional', () => {
      expect(normalizePhoneNumber('+5491169956253')).toBe('5491169956253');
      expect(normalizePhoneNumber('005491169956253')).toBe('5491169956253');
    });
    
    it('debe lanzar error para números inválidos', () => {
      expect(() => normalizePhoneNumber('')).toThrow();
      expect(() => normalizePhoneNumber('abc')).toThrow();
      expect(() => normalizePhoneNumber('123')).toThrow(); // Muy corto
    });
  });
});

