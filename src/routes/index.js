// Rutas HTTP del servidor - Orquestador principal
import express from 'express';
import { setupOnboardingRoutes } from './onboarding.js';
import { setupQRRoutes } from './qr/qrRoutes.js';
import { setupSessionRoutes } from './sessions/sessionRoutes.js';
import { setupHealthRoutes } from './health/healthRoutes.js';
import { generalLimiter, strictLimiter, qrLimiter, healthLimiter } from '../middleware/rateLimit.js';
import { securityHeaders, inputValidation } from '../middleware/security.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configura todas las rutas HTTP del servidor
 * @param {Express} app - Instancia de Express
 * @param {SessionManager} sessionManager - Gestor de sesiones
 * @param {string[]} sessionsConfig - Lista de sesiones configuradas
 */
export function setupRoutes(app, sessionManager, sessionsConfig) {
  // Aplicar middleware de seguridad globalmente
  app.use(securityHeaders);
  app.use(inputValidation);
  
  // Aplicar rate limiting general a todas las rutas
  app.use(generalLimiter);
  
  // Configurar rutas de onboarding (con rate limiting estricto para POST)
  setupOnboardingRoutes(app, sessionManager);
  
  // Servir archivos estáticos (panel de onboarding)
  app.use(express.static(path.join(__dirname, '../../public')));
  
  // Ruta para el formulario de registro
  app.get('/register', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../public/onboarding.html'));
  });

  // Configurar rutas modulares con rate limiting específico
  setupHealthRoutes(app, sessionManager);
  setupQRRoutes(app, sessionManager, sessionsConfig);
  setupSessionRoutes(app, sessionManager, sessionsConfig);
}

