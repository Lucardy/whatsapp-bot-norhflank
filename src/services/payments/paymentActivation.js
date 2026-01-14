// Servicio para activar/reactivar clientes después del pago
import { logSession } from '../../utils/logger/index.js';
import { getClientById } from '../database/clientService.js';
import * as clientRepository from '../../repositories/clientRepository.js';

/**
 * Activa o reactiva un cliente después de un pago exitoso
 * @param {number} clientId - ID del cliente
 * @param {string} paymentId - ID del pago de Mercado Pago
 * @param {number} months - Cantidad de meses pagados (default: 1)
 * @param {string} sessionId - ID de sesión para logging
 * @returns {Promise<Object>} { success: boolean, client: Object|null, error: string|null }
 */
export async function activateClientAfterPayment(clientId, paymentId, months = 1, sessionId = 'payments') {
  try {
    const client = await getClientById(clientId);
    if (!client) {
      logSession(sessionId, `⚠️ Cliente ${clientId} no encontrado para activar`);
      return {
        success: false,
        client: null,
        error: 'Cliente no encontrado'
      };
    }

    // Calcular fecha de vencimiento (meses desde ahora)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    // Actualizar cliente
    await clientRepository.updateClient(clientId, {
      status: 'active',
      expires_at: expiresAt,
      mp_payment_id: paymentId,
      last_payment_date: new Date()
    });

    logSession(sessionId, `✅ Cliente ${clientId} (${client.name}) activado después del pago. Vence: ${expiresAt.toLocaleDateString()}`);

    // Obtener cliente actualizado
    const updatedClient = await getClientById(clientId);

    return {
      success: true,
      client: updatedClient,
      error: null
    };
  } catch (error) {
    logSession(sessionId, `❌ Error activando cliente ${clientId}: ${error?.message || error}`);
    return {
      success: false,
      client: null,
      error: error?.message || 'Error desconocido'
    };
  }
}

/**
 * Verifica si un cliente necesita pagar (está suspendido o vencido)
 * @param {number} clientId - ID del cliente
 * @returns {Promise<boolean>} true si necesita pagar
 */
export async function clientNeedsPayment(clientId) {
  try {
    const client = await getClientById(clientId);
    if (!client) {
      return false;
    }

    // Si está suspendido, necesita pagar
    if (client.status === 'suspended') {
      return true;
    }

    // Si tiene fecha de vencimiento y ya venció, necesita pagar
    if (client.expires_at) {
      const now = new Date();
      const expiresAt = new Date(client.expires_at);
      if (expiresAt < now) {
        return true;
      }
    }

    return false;
  } catch (error) {
    logSession('payments', `❌ Error verificando si cliente necesita pago: ${error?.message || error}`);
    return false;
  }
}
