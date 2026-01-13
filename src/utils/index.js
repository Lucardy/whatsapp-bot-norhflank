// Re-export de utilidades principales para reducir imports profundos
// Este archivo permite importar utilidades sin usar rutas relativas profundas (../../../)

// Logger
export { log, logSession } from './logger/index.js';

// Validation
export * from './validation/index.js';
export { validatePhoneNumber } from './validation/phoneValidator.js';
export { validateEmail } from './validation/emailValidator.js';
export { normalizePhoneNumber, normalizePhoneWithCountryCode } from './validation/phoneNormalizer.js';

// Error Handling
export { handleError } from './errorHandler.js';
export { AppError, ValidationError } from './errors.js';
export { retryWithBackoff, CircuitBreaker } from './errorHandling/retry.js';
export { asyncWrapper } from './errorHandling/asyncWrapper.js';

// Resource Cleanup
export { cleanupAllResources, cleanupSessionResources, registerInterval } from './resourceCleanup.js';
