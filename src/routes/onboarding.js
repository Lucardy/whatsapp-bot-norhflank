// Rutas API para onboarding de clientes
import express from 'express';
import { log } from '../utils/logger/index.js';
import { createClientWithSession, getOnboardingInfo, activateClient } from '../services/onboardingService.js';
import { getSessionByName } from '../services/database/sessionService.js';
import { ValidationError } from '../utils/errors.js';
import { renderInvalidClientId, renderClientNotFound, renderError, renderOnboardingPanel } from './views/onboardingView.js';

/**
 * Configura las rutas de onboarding
 * @param {Express} app - Instancia de Express
 * @param {SessionManager} sessionManager - Gestor de sesiones
 */
export function setupOnboardingRoutes(app, sessionManager) {
  const router = express.Router();

  // POST /api/clients - Crear nuevo cliente
  router.post('/clients', async (req, res) => {
    try {
      const { name, contact_email, contact_phone, plan_id, session_name } = req.body;

      if (!name) {
        return res.status(400).json({
          ok: false,
          error: 'El nombre del cliente es requerido'
        });
      }

      log(`📝 Solicitud de creación de cliente: ${name}`);

      const result = await createClientWithSession(
        {
          name,
          contact_email,
          contact_phone,
          plan_id: plan_id ? parseInt(plan_id) : null
        },
        session_name
      );

      // Crear la sesión en el SessionManager para que esté disponible
      try {
        await sessionManager.createSession(result.session.session_name, true);
        log(`✅ Sesión ${result.session.session_name} creada en SessionManager`);
      } catch (sessionError) {
        log(`⚠️ Error creando sesión en SessionManager: ${sessionError?.message || sessionError}`);
        // Continuar aunque falle, la sesión ya está en la DB
      }

      res.json({
        ok: true,
        client_id: result.client.id,
        session_name: result.session.session_name,
        qrUrl: result.qrUrl,
        onboardingUrl: result.onboardingUrl,
        message: 'Cliente creado exitosamente'
      });
    } catch (error) {
      log(`❌ Error creando cliente: ${error?.message || error}`);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          ok: false,
          error: error.message
        });
      }

      res.status(500).json({
        ok: false,
        error: error?.message || 'Error interno del servidor'
      });
    }
  });

  // GET /api/clients/:id/qr - Obtener QR de la sesión del cliente
  router.get('/clients/:id/qr', async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      
      if (isNaN(clientId)) {
        return res.status(400).json({
          ok: false,
          error: 'ID de cliente inválido'
        });
      }

      const onboardingInfo = await getOnboardingInfo(clientId);
      
      if (!onboardingInfo || !onboardingInfo.session) {
        return res.status(404).json({
          ok: false,
          error: 'Cliente o sesión no encontrada'
        });
      }

      const sessionName = onboardingInfo.session.session_name;
      const sessionData = sessionManager.getSession(sessionName);

      if (!sessionData) {
        // Si la sesión no está en el SessionManager, intentar crearla
        try {
          await sessionManager.createSession(sessionName, true);
          // Esperar un poco para que se genere el QR
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (err) {
          log(`⚠️ Error creando sesión: ${err?.message || err}`);
        }
      }

      // Redirigir a la ruta de QR existente
      res.redirect(`/qr/${sessionName}`);
    } catch (error) {
      log(`❌ Error obteniendo QR: ${error?.message || error}`);
      res.status(500).json({
        ok: false,
        error: error?.message || 'Error interno del servidor'
      });
    }
  });

  // GET /api/clients/:id/status - Estado de la sesión del cliente
  router.get('/clients/:id/status', async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      
      if (isNaN(clientId)) {
        return res.status(400).json({
          ok: false,
          error: 'ID de cliente inválido'
        });
      }

      const onboardingInfo = await getOnboardingInfo(clientId);
      
      if (!onboardingInfo) {
        return res.status(404).json({
          ok: false,
          error: 'Cliente no encontrado'
        });
      }

      const sessionName = onboardingInfo.session?.session_name;
      let sessionState = null;
      let isReady = false;
      let hasQR = false;

      if (sessionName) {
        const sessionData = sessionManager.getSession(sessionName);
        if (sessionData?.client) {
          try {
            sessionState = await sessionData.client.getState?.().catch(() => 'NO_STATE');
          } catch {}
          isReady = sessionData.isReady || false;
          hasQR = !!sessionData.lastQRDataURL;
        }
      }

      res.json({
        ok: true,
        client: {
          id: onboardingInfo.client.id,
          name: onboardingInfo.client.name,
          status: onboardingInfo.client.status
        },
        session: onboardingInfo.session ? {
          session_name: onboardingInfo.session.session_name,
          status: onboardingInfo.session.status,
          phone_number: onboardingInfo.session.phone_number,
          last_activity: onboardingInfo.session.last_activity,
          isReady,
          hasQR,
          state: sessionState
        } : null,
        connected: isReady && sessionState === 'CONNECTED'
      });
    } catch (error) {
      log(`❌ Error obteniendo estado: ${error?.message || error}`);
      res.status(500).json({
        ok: false,
        error: error?.message || 'Error interno del servidor'
      });
    }
  });

  // POST /api/clients/:id/activate - Activar cliente manualmente (admin)
  router.post('/clients/:id/activate', async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      
      if (isNaN(clientId)) {
        return res.status(400).json({
          ok: false,
          error: 'ID de cliente inválido'
        });
      }

      const activated = await activateClient(clientId);
      
      if (!activated) {
        return res.status(500).json({
          ok: false,
          error: 'No se pudo activar el cliente'
        });
      }

      res.json({
        ok: true,
        message: 'Cliente activado exitosamente'
      });
    } catch (error) {
      log(`❌ Error activando cliente: ${error?.message || error}`);
      res.status(500).json({
        ok: false,
        error: error?.message || 'Error interno del servidor'
      });
    }
  });

  // GET /onboarding/:id - Panel de onboarding para un cliente
  router.get('/onboarding/:id', async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      
      if (isNaN(clientId)) {
        return res.status(400).send(renderInvalidClientId());
      }

      const onboardingInfo = await getOnboardingInfo(clientId);
      
      if (!onboardingInfo) {
        return res.status(404).send(renderClientNotFound(clientId));
      }

      const sessionName = onboardingInfo.session?.session_name;
      const sessionData = sessionName ? sessionManager.getSession(sessionName) : null;
      const isConnected = sessionData?.isReady || false;
      const hasQR = sessionData?.lastQRDataURL ? true : false;
      const qrImageUrl = hasQR ? `/qr/${sessionName}` : null;

      // Renderizar panel de onboarding usando template
      res.send(renderOnboardingPanel({
        clientName: onboardingInfo.client.name,
        clientId,
        isConnected,
        hasQR,
        qrImageUrl
      }));
    } catch (error) {
      log(`❌ Error mostrando panel de onboarding: ${error?.message || error}`);
      res.status(500).send(renderError(error?.message || 'Error interno del servidor'));
    }
  });

  // Montar el router en /api
  app.use('/api', router);
  app.use('/onboarding', router);
}

