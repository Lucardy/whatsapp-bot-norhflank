// Servicio de pagos con Mercado Pago
import { logSession } from '../../utils/logger/index.js';
import { getClientById } from '../database/clientService.js';

// SDK de Mercado Pago (se instalará con npm install mercadopago)
let mercadopago = null;

/**
 * Inicializa el SDK de Mercado Pago
 * @returns {Promise<boolean>} true si se inicializó correctamente
 */
async function initializeMercadoPago() {
  try {
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      logSession('payments', '⚠️ MERCADOPAGO_ACCESS_TOKEN no configurado en variables de entorno');
      return false;
    }

    // Importar dinámicamente el SDK de Mercado Pago
    // Versión 2.12.0 usa: mercadopago.configurations.setAccessToken()
    const mpModule = await import('mercadopago');
    
    // Detectar qué sintaxis usar
    if (mpModule.default && typeof mpModule.default.configurations !== 'undefined') {
      // Versión 2.x con configurations.setAccessToken()
      mercadopago = mpModule.default;
      mercadopago.configurations.setAccessToken(process.env.MERCADOPAGO_ACCESS_TOKEN);
      logSession('payments', '✅ Mercado Pago SDK v2.x inicializado con configurations.setAccessToken()');
    } else if (mpModule.default && typeof mpModule.default.configure === 'function') {
      // Versión 1.x con configure()
      mercadopago = mpModule.default;
      mercadopago.configure({
        access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
      });
      logSession('payments', '✅ Mercado Pago SDK v1.x inicializado con configure()');
    } else if (mpModule.MercadoPagoConfig) {
      // Versión nueva con MercadoPagoConfig
      const { MercadoPagoConfig, Preference, Payment } = mpModule;
      const client = new MercadoPagoConfig({
        accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
      });
      
      mercadopago = {
        preferences: {
          create: async (preference) => {
            const preferenceApi = new Preference(client);
            const result = await preferenceApi.create({ body: preference });
            return { body: result || {} };
          }
        },
        payment: {
          findById: async (id) => {
            const paymentApi = new Payment(client);
            const result = await paymentApi.get({ id });
            return { body: result || {} };
          }
        }
      };
      logSession('payments', '✅ Mercado Pago SDK nueva versión inicializado con MercadoPagoConfig');
    } else {
      // Fallback: intentar usar directamente
      mercadopago = mpModule.default || mpModule;
      if (mercadopago && typeof mercadopago.configure === 'function') {
        mercadopago.configure({
          access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
        });
        logSession('payments', '✅ Mercado Pago SDK inicializado con fallback');
      } else {
        throw new Error('No se pudo inicializar Mercado Pago SDK. Verifica la versión instalada.');
      }
    }

    logSession('payments', '✅ Mercado Pago SDK inicializado');
    return true;
  } catch (error) {
    logSession('payments', `❌ Error inicializando Mercado Pago: ${error?.message || error}`);
    return false;
  }
}

/**
 * Genera un link de pago para un cliente
 * @param {number} clientId - ID del cliente
 * @param {number} planId - ID del plan (opcional, si no se proporciona usa el plan del cliente)
 * @param {string} sessionId - ID de sesión para logging
 * @returns {Promise<Object>} { success: boolean, paymentLink: string|null, error: string|null }
 */
export async function generatePaymentLink(clientId, planId = null, sessionId = 'payments') {
  try {
    // Inicializar SDK si no está inicializado
    if (!mercadopago) {
      const initialized = await initializeMercadoPago();
      if (!initialized) {
        return {
          success: false,
          paymentLink: null,
          error: 'Mercado Pago no está configurado correctamente'
        };
      }
    }

    // Obtener información del cliente
    const client = await getClientById(clientId);
    if (!client) {
      logSession(sessionId, `⚠️ Cliente ${clientId} no encontrado para generar link de pago`);
      return {
        success: false,
        paymentLink: null,
        error: 'Cliente no encontrado'
      };
    }

    // Obtener información del plan
    let plan = null;
    if (planId) {
      const { getPlanById } = await import('../database/planService.js');
      plan = await getPlanById(planId);
    } else if (client.plan_id) {
      const { getPlanById } = await import('../database/planService.js');
      plan = await getPlanById(client.plan_id);
    }

    // Si no hay plan, usar valores por defecto
    const planName = plan?.name || 'Plan Básico';
    const planPrice = plan?.price_monthly || 5000; // Precio por defecto si no hay plan

    // Obtener URL base del servidor para el webhook
    const webhookUrl = process.env.WEBHOOK_URL || `http://localhost:${process.env.PORT || 3000}/webhooks/mercadopago`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Crear preferencia de pago
    const preference = {
      items: [
        {
          title: `Bot WhatsApp - ${planName}`,
          quantity: 1,
          unit_price: parseFloat(planPrice),
          currency_id: 'ARS' // Moneda: Pesos Argentinos (ajusta según tu país)
        }
      ],
      external_reference: clientId.toString(), // CLAVE: ID del cliente para identificar el pago
      notification_url: webhookUrl, // URL del webhook
      back_urls: {
        success: `${frontendUrl}/payment/success`,
        failure: `${frontendUrl}/payment/failure`,
        pending: `${frontendUrl}/payment/pending`
      },
      statement_descriptor: 'Bot WhatsApp' // Descripción que aparece en el resumen de tarjeta
    };
    
    // auto_return solo funciona si back_urls.success está definido y es una URL válida
    // Solo agregarlo si FRONTEND_URL está configurado (no localhost en producción)
    if (frontendUrl && !frontendUrl.includes('localhost')) {
      preference.auto_return = 'approved'; // Redirigir automáticamente si el pago es aprobado
    }

    logSession(sessionId, `🔍 Intentando crear preferencia de pago para cliente ${clientId}...`);
    const response = await mercadopago.preferences.create(preference);
    
    logSession(sessionId, `📦 Respuesta de Mercado Pago: ${JSON.stringify(response?.body || response)}`);
    
    // Verificar diferentes formatos de respuesta según la versión del SDK
    let initPoint = null;
    let preferenceId = null;
    
    if (response) {
      // Formato antiguo: response.body.init_point
      if (response.body && response.body.init_point) {
        initPoint = response.body.init_point;
        preferenceId = response.body.id;
      }
      // Formato nuevo: response.init_point (directo)
      else if (response.init_point) {
        initPoint = response.init_point;
        preferenceId = response.id;
      }
      // Formato alternativo: response directamente
      else if (typeof response === 'object' && 'init_point' in response) {
        initPoint = response.init_point;
        preferenceId = response.id;
      }
    }
    
    if (initPoint) {
      logSession(sessionId, `✅ Link de pago generado para cliente ${clientId} (${client.name}): ${initPoint}`);
      return {
        success: true,
        paymentLink: initPoint,
        preferenceId: preferenceId,
        error: null
      };
    } else {
      logSession(sessionId, `❌ Error: respuesta de Mercado Pago no tiene init_point. Respuesta completa: ${JSON.stringify(response)}`);
      return {
        success: false,
        paymentLink: null,
        error: `Error al generar link de pago: respuesta inválida`
      };
    }
  } catch (error) {
    logSession(sessionId, `❌ Error generando link de pago: ${error?.message || error}`);
    return {
      success: false,
      paymentLink: null,
      error: error?.message || 'Error desconocido'
    };
  }
}

/**
 * Verifica el estado de un pago en Mercado Pago
 * @param {string} paymentId - ID del pago en Mercado Pago
 * @param {string} sessionId - ID de sesión para logging
 * @returns {Promise<Object>} { success: boolean, payment: Object|null, error: string|null }
 */
export async function verifyPayment(paymentId, sessionId = 'payments') {
  try {
    // Inicializar SDK si no está inicializado
    if (!mercadopago) {
      const initialized = await initializeMercadoPago();
      if (!initialized) {
        return {
          success: false,
          payment: null,
          error: 'Mercado Pago no está configurado correctamente'
        };
      }
    }

    const payment = await mercadopago.payment.findById(paymentId);
    
    if (payment && payment.body) {
      return {
        success: true,
        payment: payment.body,
        error: null
      };
    } else {
      return {
        success: false,
        payment: null,
        error: 'Pago no encontrado'
      };
    }
  } catch (error) {
    logSession(sessionId, `❌ Error verificando pago ${paymentId}: ${error?.message || error}`);
    return {
      success: false,
      payment: null,
      error: error?.message || 'Error desconocido'
    };
  }
}
