// Servicio de gestión de suscripciones y expiración de trials
import { logSession } from '../../utils/logger/index.js';
import { getPrisma } from '../../config/database.js';
import * as clientRepository from '../../repositories/clientRepository.js';
import { getSessionByClientId } from '../database/sessionService.js';
import { sendSuspendedNotification, sendTrialExpiringNotification } from './notificationService.js';

const TRIAL_DAYS = 7;

/**
 * Obtiene todos los clientes en trial que necesitan ser verificados
 * @returns {Promise<Array>} Lista de clientes en trial
 */
export async function getTrialClients() {
  try {
    const db = getPrisma();
    return await db.client.findMany({
      where: {
        status: 'trial'
      },
      include: {
        sessions: {
          where: {
            session_type: 'client'
          }
        },
        config: true
      }
    });
  } catch (error) {
    logSession('subscription', `⚠️ Error obteniendo clientes en trial: ${error?.message || error}`);
    return [];
  }
}

/**
 * Calcula los días desde la creación del cliente
 * @param {Date} createdAt - Fecha de creación
 * @returns {number} Días transcurridos
 */
export function getDaysSinceCreation(createdAt) {
  const now = new Date();
  const created = new Date(createdAt);
  const diffTime = now - created;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Calcula los días restantes de prueba
 * @param {Date} createdAt - Fecha de creación
 * @returns {number} Días restantes (puede ser negativo si ya expiró)
 */
export function getTrialDaysRemaining(createdAt) {
  return TRIAL_DAYS - getDaysSinceCreation(createdAt);
}

/**
 * Suspende un cliente (cambia status a 'suspended')
 * IMPORTANTE: NO desconecta la sesión, solo cambia el status
 * @param {number} clientId - ID del cliente
 * @returns {Promise<boolean>} true si se suspendió correctamente
 */
export async function suspendClient(clientId) {
  try {
    const client = await clientRepository.getClientById(clientId);
    if (!client) {
      logSession('subscription', `⚠️ Cliente ${clientId} no encontrado para suspender`);
      return false;
    }

    if (client.status === 'suspended') {
      logSession('subscription', `ℹ️ Cliente ${clientId} ya está suspendido`);
      return true; // Ya está suspendido, no hacer nada
    }

    // Actualizar status a suspended
    await clientRepository.updateClient(clientId, {
      status: 'suspended'
    });

    logSession('subscription', `✅ Cliente ${clientId} (${client.name}) suspendido`);

    // Enviar notificación al cliente
    await sendSuspendedNotification(clientId);

    return true;
  } catch (error) {
    logSession('subscription', `❌ Error suspendiendo cliente ${clientId}: ${error?.message || error}`);
    return false;
  }
}

/**
 * Verifica y procesa la expiración de trials
 * - Envía notificación si quedan 1 día
 * - Suspende si ya expiró (más de 7 días)
 * @returns {Promise<Object>} Resumen de acciones realizadas
 */
export async function checkTrialExpiration() {
  const summary = {
    checked: 0,
    expiring: 0,
    suspended: 0,
    errors: 0
  };

  try {
    const trialClients = await getTrialClients();
    summary.checked = trialClients.length;

    logSession('subscription', `🔍 Verificando ${trialClients.length} cliente(s) en trial...`);

    for (const client of trialClients) {
      try {
        const daysRemaining = getTrialDaysRemaining(client.created_at);

        // Si quedan 1 día, enviar notificación
        if (daysRemaining === 1) {
          logSession('subscription', `⏰ Cliente ${client.id} (${client.name}) - Queda 1 día de prueba`);
          await sendTrialExpiringNotification(client.id);
          summary.expiring++;
        }
        // Si ya expiró (0 o menos días), suspender
        else if (daysRemaining <= 0) {
          logSession('subscription', `⏰ Cliente ${client.id} (${client.name}) - Trial expirado (${getDaysSinceCreation(client.created_at)} días)`);
          const suspended = await suspendClient(client.id);
          if (suspended) {
            summary.suspended++;
          } else {
            summary.errors++;
          }
        }
      } catch (error) {
        logSession('subscription', `❌ Error procesando cliente ${client.id}: ${error?.message || error}`);
        summary.errors++;
      }
    }

    logSession('subscription', `✅ Verificación completada: ${summary.checked} revisados, ${summary.expiring} notificados, ${summary.suspended} suspendidos, ${summary.errors} errores`);
    return summary;
  } catch (error) {
    logSession('subscription', `❌ Error en verificación de trials: ${error?.message || error}`);
    summary.errors++;
    return summary;
  }
}

/**
 * Verifica y procesa la expiración de suscripciones activas
 * - Suspende clientes activos cuya fecha de vencimiento (expires_at) ya pasó
 * @returns {Promise<Object>} Resumen de acciones realizadas
 */
export async function checkActiveSubscriptionExpiration() {
  const summary = {
    checked: 0,
    suspended: 0,
    errors: 0
  };

  try {
    const db = getPrisma();
    const now = new Date();
    
    // Buscar clientes activos con fecha de vencimiento pasada
    const expiredClients = await db.client.findMany({
      where: {
        status: 'active',
        expires_at: {
          lt: now // expires_at < now (ya venció)
        }
      },
      include: {
        config: true
      }
    });

    summary.checked = expiredClients.length;
    logSession('subscription', `🔍 Verificando ${expiredClients.length} cliente(s) activo(s) con suscripción vencida...`);

    for (const client of expiredClients) {
      try {
        logSession('subscription', `⏰ Cliente ${client.id} (${client.name}) - Suscripción vencida (venció: ${client.expires_at?.toLocaleDateString() || 'N/A'})`);
        
        // Suspender el cliente
        await clientRepository.updateClient(client.id, {
          status: 'suspended'
        });

        // Enviar notificación de suspensión (con link de pago)
        await sendSuspendedNotification(client.id);
        summary.suspended++;
      } catch (error) {
        logSession('subscription', `❌ Error procesando cliente ${client.id}: ${error?.message || error}`);
        summary.errors++;
      }
    }

    logSession('subscription', `✅ Verificación de suscripciones completada: ${summary.checked} revisados, ${summary.suspended} suspendidos, ${summary.errors} errores`);
    return summary;
  } catch (error) {
    logSession('subscription', `❌ Error en verificación de suscripciones: ${error?.message || error}`);
    summary.errors++;
    return summary;
  }
}

/**
 * Verifica si un cliente está suspendido
 * @param {number} clientId - ID del cliente
 * @returns {Promise<boolean>} true si está suspendido
 */
export async function isClientSuspended(clientId) {
  try {
    const client = await clientRepository.getClientById(clientId);
    return client?.status === 'suspended';
  } catch (error) {
    logSession('subscription', `⚠️ Error verificando status de cliente ${clientId}: ${error?.message || error}`);
    return false;
  }
}

/**
 * Reactiva un cliente (cambia status de 'suspended' a 'active')
 * @param {number} clientId - ID del cliente
 * @param {number} planId - ID del plan (opcional)
 * @returns {Promise<boolean>} true si se reactivó correctamente
 */
export async function reactivateClient(clientId, planId = null) {
  try {
    const client = await clientRepository.getClientById(clientId);
    if (!client) {
      logSession('subscription', `⚠️ Cliente ${clientId} no encontrado para reactivar`);
      return false;
    }

    const updateData = {
      status: 'active'
    };

    if (planId) {
      updateData.plan_id = planId;
    }

    await clientRepository.updateClient(clientId, updateData);
    logSession('subscription', `✅ Cliente ${clientId} (${client.name}) reactivado`);
    return true;
  } catch (error) {
    logSession('subscription', `❌ Error reactivando cliente ${clientId}: ${error?.message || error}`);
    return false;
  }
}
