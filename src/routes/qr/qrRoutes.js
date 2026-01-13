// Rutas relacionadas con códigos QR
import { log } from '../../utils/logger/index.js';
import { renderQRNotFound, renderQRConnected, renderQRLoading, renderQRPage } from '../views/qrView.js';
import { qrLimiter } from '../../middleware/rateLimit.js';

/**
 * Configura las rutas de QR
 * @param {Express} app - Instancia de Express
 * @param {SessionManager} sessionManager - Gestor de sesiones
 * @param {string[]} sessionsConfig - Lista de sesiones configuradas
 */
export function setupQRRoutes(app, sessionManager, sessionsConfig) {
  // QR de una sesión específica (con rate limiting específico para QR)
  app.get('/qr/:sessionId', qrLimiter, async (req, res) => {
    try {
      const { sessionId } = req.params;
      log(`🔍 Solicitud de QR para sesión: "${sessionId}"`);
      let sessionData = sessionManager.getSession(sessionId);
      
      // Si la sesión no existe o existe pero no está inicializada, inicializarla
      if (!sessionData) {
        // Primero verificar si está en la configuración en memoria
        if (sessionsConfig.includes(sessionId)) {
          try {
            log(`🔄 Sesión "${sessionId}" no existe, creándola automáticamente...`);
            await sessionManager.createSession(sessionId, true); // Auto-inicializar cuando se accede al QR
            sessionData = sessionManager.getSession(sessionId);
            log(`✅ Sesión "${sessionId}" creada automáticamente`);
          } catch (err) {
            log(`❌ Error creando sesión "${sessionId}":`, err?.message || err);
          }
        } else {
          // Si no está en la configuración, verificar en la base de datos
          try {
            const { getPrisma } = await import('../../config/database.js');
            const db = getPrisma();
            const dbSession = await db.whatsAppSession.findUnique({
              where: { session_name: sessionId }
            });
            
            if (dbSession) {
              log(`🔄 Sesión "${sessionId}" encontrada en DB, creándola en SessionManager...`);
              await sessionManager.createSession(sessionId, true); // Auto-inicializar cuando se accede al QR
              sessionData = sessionManager.getSession(sessionId);
              log(`✅ Sesión "${sessionId}" creada desde DB`);
            }
          } catch (err) {
            log(`⚠️ Error verificando sesión en DB: ${err?.message || err}`);
          }
        }
      } else if (sessionData && !sessionData.isReady && !sessionData.initInProgress) {
        // Si la sesión existe pero no está inicializada, inicializarla ahora
        try {
          log(`🔄 Sesión "${sessionId}" existe pero no está inicializada, iniciándola ahora...`);
          await sessionManager.startSession(sessionId);
          sessionData = sessionManager.getSession(sessionId);
          log(`✅ Sesión "${sessionId}" iniciada automáticamente`);
        } catch (err) {
          log(`❌ Error iniciando sesión "${sessionId}":`, err?.message || err);
        }
      }
    
    if (!sessionData) {
      // Si no hay sesión, mostrar página HTML con error
      return res.status(404).send(renderQRNotFound(sessionId));
    }
    
    // Verificar si la sesión está autenticada/conectada
    // Si está ready o el cliente tiene estado CONNECTED, mostrar página de conectado
    let isConnected = sessionData.isReady;
    if (!isConnected && sessionData.client) {
      try {
        const clientState = await sessionData.client.getState().catch(() => null);
        isConnected = clientState === 'CONNECTED';
      } catch (err) {
        // Ignorar errores al verificar estado
      }
    }
    
    // Si está conectado y NO tiene forceQR activo, mostrar mensaje de conectado (sin auto-refresh)
    if (isConnected && !sessionData.forceQR) {
      log(`✅ Sesión "${sessionId}" está conectada, mostrando página de conectado`);
      return res.send(renderQRConnected(sessionId));
    }
    
    // Si forceQR está activo pero no hay QR aún, mostrar página de espera
    if (!sessionData.lastQRDataURL) {
      // Si el QR aún no está generado, mostrar página con auto-refresh
      log(`⏳ QR aún no generado para sesión "${sessionId}", mostrando página de carga...`);
      return res.send(renderQRLoading(sessionId));
    }
    
    log(`✅ QR encontrado para sesión "${sessionId}", procesando...`);
    
    // Validar formato del QR DataURL
    if (!sessionData.lastQRDataURL.startsWith('data:image/')) {
      log(`⚠️ QR DataURL con formato inválido para sesión "${sessionId}": ${sessionData.lastQRDataURL?.substring(0, 50) || 'null'}...`);
      return res.status(500).send(renderQRLoading(sessionId));
    }
    
    try {
      // Si hay QR, mostrar la imagen
      const qrParts = sessionData.lastQRDataURL.split(',');
      if (qrParts.length < 2) {
        log(`⚠️ QR DataURL mal formateado para sesión "${sessionId}"`);
        return res.status(500).send(renderQRLoading(sessionId));
      }
      
      const img = Buffer.from(qrParts[1], 'base64');
      
      // Si el cliente acepta HTML, mostrar página con la imagen
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.send(renderQRPage(sessionId, sessionData.lastQRDataURL));
      }
      
      // Si solo pide la imagen, devolver la imagen directamente
      res.set('Content-Type', 'image/png');
      res.send(img);
    } catch (error) {
      log(`❌ Error procesando QR para sesión "${sessionId}":`, error?.message || error);
      return res.status(500).send(renderQRLoading(sessionId));
    }
    } catch (error) {
      // Capturar cualquier error no manejado
      log(`❌ Error inesperado en ruta QR para sesión "${sessionId}":`, error?.message || error);
      return res.status(500).send(renderQRLoading(sessionId));
    }
  });

  // QR de la primera sesión (compatibilidad hacia atrás)
  app.get('/qr', (req, res) => {
    if (sessionsConfig.length === 0) {
      return res.status(503).send('⚠️ No hay sesiones configuradas');
    }
    res.redirect(`/qr/${sessionsConfig[0]}`);
  });
}

