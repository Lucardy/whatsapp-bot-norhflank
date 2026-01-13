// Middleware de rate limiting para endpoints HTTP
import rateLimit from 'express-rate-limit';
import { log } from '../utils/logger/index.js';
import {
  RATE_LIMIT_WINDOW_GENERAL,
  RATE_LIMIT_WINDOW_QR,
  RATE_LIMIT_WINDOW_HEALTH,
  RATE_LIMIT_MAX_GENERAL,
  RATE_LIMIT_MAX_STRICT,
  RATE_LIMIT_MAX_QR,
  RATE_LIMIT_MAX_HEALTH,
  MS_PER_MINUTE
} from '../config/constants.js';

/**
 * Rate limiter general para todos los endpoints
 * Límite: 100 requests por 15 minutos por IP
 */
export const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_GENERAL,
  max: RATE_LIMIT_MAX_GENERAL,
  message: {
    ok: false,
    error: 'Demasiadas solicitudes. Por favor, intenta nuevamente en unos minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // Retorna información de rate limit en headers `RateLimit-*`
  legacyHeaders: false, // Desactiva headers `X-RateLimit-*`
  handler: (req, res) => {
    log(`⚠️ Rate limit excedido para IP: ${req.ip}, path: ${req.path}`);
    res.status(429).json({
      ok: false,
      error: 'Demasiadas solicitudes. Por favor, intenta nuevamente en unos minutos.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) // Segundos hasta que se puede intentar de nuevo
    });
  }
});

/**
 * Rate limiter estricto para endpoints de creación/modificación
 * Límite: 10 requests por 15 minutos por IP
 */
export const strictLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_GENERAL,
  max: RATE_LIMIT_MAX_STRICT,
  message: {
    ok: false,
    error: 'Demasiadas solicitudes de modificación. Por favor, intenta nuevamente más tarde.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    log(`⚠️ Rate limit estricto excedido para IP: ${req.ip}, path: ${req.path}`);
    res.status(429).json({
      ok: false,
      error: 'Demasiadas solicitudes de modificación. Por favor, intenta nuevamente más tarde.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Rate limiter para endpoints de QR (más permisivo)
 * Límite: 50 requests por 5 minutos por IP
 */
export const qrLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_QR,
  max: RATE_LIMIT_MAX_QR,
  message: {
    ok: false,
    error: 'Demasiadas solicitudes de QR. Por favor, espera unos minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    log(`⚠️ Rate limit de QR excedido para IP: ${req.ip}, sessionId: ${req.params.sessionId}`);
    res.status(429).json({
      ok: false,
      error: 'Demasiadas solicitudes de QR. Por favor, espera unos minutos.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
    });
  }
});

/**
 * Rate limiter para endpoints de health check (muy permisivo)
 * Límite: 200 requests por minuto por IP
 */
export const healthLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_HEALTH,
  max: RATE_LIMIT_MAX_HEALTH,
  message: {
    ok: false,
    error: 'Demasiadas solicitudes de health check.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Permitir health checks sin límite en desarrollo
    return process.env.NODE_ENV === 'development';
  }
});

