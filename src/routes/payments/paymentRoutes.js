// Rutas para pagos y webhooks de Mercado Pago
import express from 'express';
import { logSession } from '../../utils/logger/index.js';
import { generatePaymentLink, verifyPayment } from '../../services/payments/mercadopagoService.js';
import { activateClientAfterPayment } from '../../services/payments/paymentActivation.js';

/**
 * Configura las rutas de pagos
 * @param {Express} app - Instancia de Express
 */
export function setupPaymentRoutes(app) {
  const router = express.Router();

  // Middleware para parsear JSON (necesario para webhooks)
  router.use(express.json());
  router.use(express.urlencoded({ extended: true }));

  /**
   * Webhook de Mercado Pago
   * POST /webhooks/mercadopago
   * 
   * Mercado Pago envía notificaciones aquí cuando hay cambios en un pago
   */
  router.post('/webhooks/mercadopago', async (req, res) => {
    try {
      logSession('payments', `📥 Webhook recibido de Mercado Pago: ${JSON.stringify(req.body)}`);

      // Mercado Pago envía notificaciones en formato: { type: "payment", data: { id: "123" } }
      const notificationType = req.body?.type;
      const notificationData = req.body?.data;

      if (notificationType === 'payment' && notificationData?.id) {
        const paymentId = notificationData.id;

        // Verificar el pago en Mercado Pago
        const paymentResult = await verifyPayment(paymentId, 'payments');
        
        if (!paymentResult.success || !paymentResult.payment) {
          logSession('payments', `⚠️ No se pudo verificar el pago ${paymentId}`);
          return res.status(200).send('OK'); // Responder 200 para que MP no reintente
        }

        const payment = paymentResult.payment;
        const clientId = payment.external_reference ? parseInt(payment.external_reference) : null;

        if (!clientId) {
          logSession('payments', `⚠️ Pago ${paymentId} no tiene external_reference (clientId)`);
          return res.status(200).send('OK');
        }

        logSession('payments', `🔍 Procesando pago ${paymentId} para cliente ${clientId}. Estado: ${payment.status}`);

        // Solo procesar si el pago está aprobado
        if (payment.status === 'approved') {
          logSession('payments', `✅ Pago ${paymentId} aprobado para cliente ${clientId}`);

          // Activar el cliente
          const activationResult = await activateClientAfterPayment(
            clientId,
            paymentId,
            1, // 1 mes por defecto (puedes ajustar según el plan)
            'payments'
          );

          if (activationResult.success) {
            logSession('payments', `✅ Cliente ${clientId} activado exitosamente después del pago`);
          } else {
            logSession('payments', `❌ Error activando cliente ${clientId}: ${activationResult.error}`);
          }
        } else if (payment.status === 'pending') {
          logSession('payments', `⏳ Pago ${paymentId} pendiente para cliente ${clientId}`);
        } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
          logSession('payments', `❌ Pago ${paymentId} rechazado/cancelado para cliente ${clientId}`);
        } else {
          logSession('payments', `ℹ️ Pago ${paymentId} tiene estado: ${payment.status}`);
        }
      } else {
        logSession('payments', `⚠️ Tipo de notificación no reconocido: ${notificationType}`);
      }

      // Siempre responder 200 para que Mercado Pago no reintente
      res.status(200).send('OK');
    } catch (error) {
      logSession('payments', `❌ Error procesando webhook: ${error?.message || error}`);
      // Responder 200 para que MP no reintente en caso de error
      res.status(200).send('OK');
    }
  });

  /**
   * Generar link de pago para un cliente
   * GET /payments/generate/:clientId
   * 
   * Genera un link de pago de Mercado Pago para un cliente específico
   */
  router.get('/generate/:clientId', async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const planId = req.query.planId ? parseInt(req.query.planId) : null;

      if (isNaN(clientId)) {
        return res.status(400).json({
          success: false,
          error: 'ID de cliente inválido'
        });
      }

      const result = await generatePaymentLink(clientId, planId, 'payments');

      if (result.success) {
        res.json({
          success: true,
          paymentLink: result.paymentLink,
          preferenceId: result.preferenceId
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      logSession('payments', `❌ Error generando link de pago: ${error?.message || error}`);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  });

  app.use('/payments', router);
  app.use('/webhooks', router); // También disponible en /webhooks/mercadopago
}
