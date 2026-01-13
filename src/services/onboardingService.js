// Servicio para manejar el onboarding de nuevos clientes
import { log } from '../utils/logger/index.js';
import { getPrisma } from '../config/database.js';
import { createClient, getClientById } from './database/clientService.js';
import { createSession, getSessionByClientId } from './database/sessionService.js';
import { validateSessionName, validatePhoneNumber } from '../utils/validation.js';
import { ValidationError } from '../utils/errors.js';

/**
 * Crea un nuevo cliente y su sesión de WhatsApp
 * @param {Object} clientData - Datos del cliente
 * @param {string} clientData.name - Nombre del cliente/negocio
 * @param {string} [clientData.contact_email] - Email de contacto
 * @param {string} [clientData.contact_phone] - Teléfono de contacto
 * @param {number} [clientData.plan_id] - ID del plan (opcional)
 * @param {string} [sessionName] - Nombre de la sesión (opcional, se genera automáticamente si no se proporciona)
 * @returns {Promise<Object>} { client, session, qrUrl }
 */
export async function createClientWithSession(clientData, sessionName = null) {
  try {
    // Validar datos del cliente usando validadores robustos
    const { validateClientData } = await import('../utils/validation/clientValidator.js');
    try {
      validateClientData(clientData, {
        requirePhone: false,
        requireEmail: false
      });
    } catch (validationError) {
      if (validationError instanceof ValidationError) {
        throw validationError;
      }
      throw new ValidationError(`Error de validación: ${validationError?.message || validationError}`, 'clientData');
    }

    // Generar nombre de sesión si no se proporciona
    if (!sessionName) {
      // Generar nombre de sesión basado en el nombre del cliente (sanitizado)
      sessionName = clientData.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      
      // Asegurar que sea único agregando timestamp si es necesario
      const db = getPrisma();
      const existing = await db.whatsAppSession.findUnique({
        where: { session_name: sessionName }
      });
      
      if (existing) {
        sessionName = `${sessionName}_${Date.now()}`;
      }
    } else {
      // Validar nombre de sesión si se proporciona
      validateSessionName(sessionName);
      
      // Verificar que no exista
      const db = getPrisma();
      const existing = await db.whatsAppSession.findUnique({
        where: { session_name: sessionName }
      });
      
      if (existing) {
        throw new ValidationError(`La sesión "${sessionName}" ya existe`, 'sessionName');
      }
    }

    // La validación de teléfono ya se hizo en validateClientData

    log(`📝 Creando nuevo cliente: ${clientData.name}`);

    // Verificar si el cliente ya existe por teléfono antes de crear
    if (clientData.contact_phone) {
      const { getClientByPhone } = await import('../repositories/clientRepository.js');
      const existingClient = await getClientByPhone(clientData.contact_phone);
      if (existingClient) {
        log(`ℹ️ Cliente con teléfono ${clientData.contact_phone} ya existe: ${existingClient.name} (ID: ${existingClient.id})`);
        throw new Error(`Unique constraint failed on the fields: (contact_phone)`);
      }
    }

    // Crear cliente en la base de datos
    const client = await createClient({
      name: clientData.name.trim(),
      contact_email: clientData.contact_email?.trim() || null,
      contact_phone: clientData.contact_phone?.trim() || null,
      status: 'trial', // Por defecto en período de prueba
      plan_id: clientData.plan_id || null
    });

    if (!client) {
      throw new Error('Error al crear cliente: createClient retornó null');
    }

    log(`✅ Cliente creado con ID: ${client.id}`);

    // Crear sesión de WhatsApp para el cliente
    const session = await createSession({
      client_id: client.id,
      session_name: sessionName,
      session_type: 'client', // Es una sesión de cliente
      status: 'qr_pending', // Esperando escaneo de QR
      phone_number: clientData.contact_phone || null // Guardar el número real del cliente
    });

    log(`✅ Sesión creada: ${session.session_name}`);

    // Crear configuración inicial del cliente con bot desactivado por defecto
    const db = getPrisma();
    try {
      await db.clientConfig.upsert({
        where: { client_id: client.id },
        update: {}, // No actualizar si ya existe
        create: {
          client_id: client.id,
          bot_enabled: false // Bot desactivado por defecto - el cliente debe activarlo manualmente
        }
      });
      log(`✅ Configuración inicial creada para cliente ${client.id} (bot desactivado)`);
    } catch (configError) {
      log(`⚠️ Error creando configuración inicial (puede que ya exista): ${configError?.message || configError}`);
    }

    // Construir URL del QR
    const port = process.env.PORT || 3000;
    const qrUrl = `http://localhost:${port}/api/clients/${client.id}/qr`;

    return {
      client: {
        id: client.id,
        name: client.name,
        status: client.status,
        contact_email: client.contact_email,
        contact_phone: client.contact_phone
      },
      session: {
        id: session.id,
        session_name: session.session_name,
        status: session.status
      },
      qrUrl,
      onboardingUrl: `http://localhost:${port}/onboarding/${client.id}`
    };
  } catch (error) {
    log(`❌ Error creando cliente y sesión: ${error?.message || error}`);
    throw error;
  }
}

/**
 * Obtiene la información de onboarding de un cliente
 * @param {number} clientId - ID del cliente
 * @returns {Promise<Object|null>} Información de onboarding o null
 */
export async function getOnboardingInfo(clientId) {
  try {
    const db = getPrisma();
    
    const client = await db.client.findUnique({
      where: { id: clientId },
      include: {
        sessions: {
          where: { session_type: 'client' },
          take: 1
        },
        plan: true
      }
    });

    if (!client) {
      return null;
    }

    const session = client.sessions[0] || null;
    
    const port = process.env.PORT || 3000;
    
    return {
      client: {
        id: client.id,
        name: client.name,
        status: client.status,
        contact_email: client.contact_email,
        contact_phone: client.contact_phone,
        created_at: client.created_at
      },
      session: session ? {
        id: session.id,
        session_name: session.session_name,
        status: session.status,
        phone_number: session.phone_number,
        last_activity: session.last_activity
      } : null,
      plan: client.plan ? {
        id: client.plan.id,
        name: client.plan.name,
        price_monthly: client.plan.price_monthly
      } : null,
      qrUrl: session ? `http://localhost:${port}/api/clients/${clientId}/qr` : null,
      statusUrl: `http://localhost:${port}/api/clients/${clientId}/status`
    };
  } catch (error) {
    log(`❌ Error obteniendo información de onboarding: ${error?.message || error}`);
    return null;
  }
}

/**
 * Activa un cliente manualmente (admin)
 * @param {number} clientId - ID del cliente
 * @returns {Promise<boolean>} true si se activó correctamente
 */
export async function activateClient(clientId) {
  try {
    const db = getPrisma();
    
    await db.client.update({
      where: { id: clientId },
      data: { 
        status: 'active',
        updated_at: new Date()
      }
    });

    log(`✅ Cliente ${clientId} activado`);
    return true;
  } catch (error) {
    log(`❌ Error activando cliente: ${error?.message || error}`);
    return false;
  }
}

