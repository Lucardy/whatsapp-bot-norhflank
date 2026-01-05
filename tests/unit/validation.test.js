// Tests unitarios para validación de datos
import { describe, test, expect } from '@jest/globals';
import { 
  validateSessionName, 
  validatePhoneNumber, 
  validateBotMessage,
  validateClientName,
  validateMenuOptions,
  validateClientConfig
} from '../../src/utils/validation/index.js';
import { ValidationError } from '../../src/utils/errors.js';

describe('Validación de Datos', () => {
  describe('validateSessionName', () => {
    test('debe aceptar nombres válidos', () => {
      expect(() => validateSessionName('test_session')).not.toThrow();
      expect(() => validateSessionName('test123')).not.toThrow();
      expect(() => validateSessionName('test-session')).not.toThrow();
    });

    test('debe rechazar nombres vacíos', () => {
      expect(() => validateSessionName('')).toThrow(ValidationError);
      expect(() => validateSessionName('   ')).toThrow(ValidationError);
    });

    test('debe rechazar nombres con caracteres inválidos', () => {
      expect(() => validateSessionName('test session')).toThrow(ValidationError);
      expect(() => validateSessionName('test@session')).toThrow(ValidationError);
      expect(() => validateSessionName('test.session')).toThrow(ValidationError);
    });

    test('debe rechazar nombres muy largos', () => {
      const longName = 'a'.repeat(51);
      expect(() => validateSessionName(longName)).toThrow(ValidationError);
    });

    test('debe rechazar nombres muy cortos', () => {
      expect(() => validateSessionName('a')).toThrow(ValidationError);
    });
  });

  describe('validatePhoneNumber', () => {
    test('debe aceptar números válidos', () => {
      expect(() => validatePhoneNumber('5492664617732')).not.toThrow();
      expect(() => validatePhoneNumber('+5492664617732')).not.toThrow();
      expect(() => validatePhoneNumber('1234567890')).not.toThrow();
    });

    test('debe rechazar números inválidos', () => {
      expect(() => validatePhoneNumber('123')).toThrow(ValidationError);
      expect(() => validatePhoneNumber('abc123')).toThrow(ValidationError);
      expect(() => validatePhoneNumber('1234567890123456')).toThrow(ValidationError); // Muy largo
    });

    test('debe permitir números opcionales', () => {
      expect(() => validatePhoneNumber('', { required: false })).not.toThrow();
      expect(() => validatePhoneNumber(null, { required: false })).not.toThrow();
    });
  });

  describe('validateBotMessage', () => {
    test('debe aceptar mensajes válidos', () => {
      expect(() => validateBotMessage('Hola, este es un mensaje válido')).not.toThrow();
      expect(() => validateBotMessage('123')).not.toThrow(); // Mínimo
    });

    test('debe rechazar mensajes vacíos', () => {
      expect(() => validateBotMessage('')).toThrow(ValidationError);
      expect(() => validateBotMessage('   ')).toThrow(ValidationError);
    });

    test('debe rechazar mensajes muy cortos', () => {
      expect(() => validateBotMessage('ab')).toThrow(ValidationError);
    });

    test('debe rechazar mensajes muy largos', () => {
      const longMessage = 'a'.repeat(2001);
      expect(() => validateBotMessage(longMessage)).toThrow(ValidationError);
    });
  });

  describe('validateClientName', () => {
    test('debe aceptar nombres válidos', () => {
      expect(() => validateClientName('Cliente Test')).not.toThrow();
      expect(() => validateClientName('Cliente123')).not.toThrow();
    });

    test('debe rechazar nombres vacíos', () => {
      expect(() => validateClientName('')).toThrow(ValidationError);
    });
  });

  describe('validateMenuOptions', () => {
    test('debe aceptar opciones válidas', () => {
      const validOptions = [
        { key: '1', label: 'Opción 1', response: 'Respuesta 1' },
        { key: '2', label: 'Opción 2', response: 'Respuesta 2' }
      ];
      expect(() => validateMenuOptions(validOptions)).not.toThrow();
    });

    test('debe rechazar opciones vacías', () => {
      expect(() => validateMenuOptions([])).toThrow(ValidationError);
    });

    test('debe rechazar opciones con keys duplicadas', () => {
      const invalidOptions = [
        { key: '1', label: 'Opción 1', response: 'Respuesta 1' },
        { key: '1', label: 'Opción 2', response: 'Respuesta 2' }
      ];
      expect(() => validateMenuOptions(invalidOptions)).toThrow(ValidationError);
    });

    test('debe rechazar más de 10 opciones', () => {
      const manyOptions = Array.from({ length: 11 }, (_, i) => ({
        key: String(i + 1),
        label: `Opción ${i + 1}`,
        response: `Respuesta ${i + 1}`
      }));
      expect(() => validateMenuOptions(manyOptions)).toThrow(ValidationError);
    });
  });
});

