// Lógica de creación de cliente para el flujo de prueba gratuita
import { logSession } from '../../utils/logger/index.js';
import { createClientWithSession } from '../onboardingService.js';
import { getClientByName } from '../database/clientService.js';
import { getSessionByClientId, createSession } from '../database/sessionService.js';
import { getPrisma } from '../../config/database.js';

/**
 * Maneja el error de cliente duplicado, buscando y reutilizando el cliente existente
 * @param {Error} createError - Error de creación
 * @param {Object} trialSession - Sesión de prueba
 * @param {string} phoneNumber - Número de teléfono
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<Object|null>} Resultado con cliente y sesión o null
 */
export async function handleDuplicateClientError(createError, trialSession, phoneNumber, sessionId) {
  if (!createError?.message?.includes('Unique constraint failed') && 
      !createError?.message?.includes('already exists')) {
    return null;
  }
  
  logSession(sessionId, `ℹ️ Cliente "${trialSession.data.name}" ya existe, buscando cliente existente...`);
  
  const existingClient = await getClientByName(trialSession.data.name);
  
  if (!existingClient) {
    return null;
  }
  
  logSession(sessionId, `✅ Cliente existente encontrado: ${existingClient.name} (ID: ${existingClient.id})`);
  
  // Buscar si ya tiene una sesión
  let existingSession = await getSessionByClientId(existingClient.id);
  
  if (!existingSession) {
    // Crear sesión para el cliente existente
    const sessionName = existingClient.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    existingSession = await createSession({
      client_id: existingClient.id,
      session_name: sessionName,
      session_type: 'client',
      status: 'qr_pending',
      phone_number: phoneNumber || null // Guardar el número real del cliente
    });
    
    logSession(sessionId, `✅ Sesión creada para cliente existente: ${existingSession.session_name}`);
  } else {
    logSession(sessionId, `ℹ️ Cliente ya tiene sesión: ${existingSession.session_name}`);
  }
  
  // Actualizar datos del cliente si es necesario
  const db = getPrisma();
  await db.client.update({
    where: { id: existingClient.id },
    data: {
      contact_phone: phoneNumber,
      contact_email: trialSession.data.email || existingClient.contact_email,
      status: 'trial'
    }
  });
  
  // Actualizar también el phone_number de la sesión
  if (phoneNumber) {
    await db.whatsAppSession.update({
      where: { id: existingSession.id },
      data: {
        phone_number: phoneNumber
      }
    });
    logSession(sessionId, `✅ Número de teléfono actualizado en sesión: ${phoneNumber}`);
  }
  
  // Recargar la sesión para obtener los datos actualizados
  const updatedSession = await db.whatsAppSession.findUnique({
    where: { id: existingSession.id }
  });
  
  return {
    client: {
      id: existingClient.id,
      name: existingClient.name,
      status: 'trial',
      contact_email: trialSession.data.email || existingClient.contact_email,
      contact_phone: phoneNumber
    },
    session: {
      id: updatedSession.id,
      session_name: updatedSession.session_name,
      status: updatedSession.status,
      phone_number: updatedSession.phone_number
    },
    qrUrl: null,
    onboardingUrl: null
  };
}

/**
 * Crea un nuevo cliente y sesión para el flujo de prueba gratuita
 * @param {Object} trialSession - Sesión de prueba
 * @param {string} phoneNumber - Número de teléfono
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<Object>} Resultado con cliente y sesión
 */
export async function createClientForTrial(trialSession, phoneNumber, sessionId) {
  logSession(sessionId, `📝 Creando cliente para prueba gratuita: ${trialSession.data.name}`);
  
  // Validar datos antes de crear
  const { validateClientData } = await import('../../utils/validation/clientValidator.js');
  try {
    validateClientData({
      name: trialSession.data.name,
      contact_email: trialSession.data.email || null,
      contact_phone: phoneNumber,
      status: 'trial'
    }, { requirePhone: false, requireEmail: false });
  } catch (validationError) {
    logSession(sessionId, `❌ Error de validación: ${validationError?.message || validationError}`);
    throw validationError;
  }
  
  // Crear cliente y sesión usando el servicio de onboarding
  try {
    const result = await createClientWithSession({
      name: trialSession.data.name,
      contact_email: trialSession.data.email || null,
      contact_phone: phoneNumber,
      status: 'trial'
    });
    
    logSession(sessionId, `✅ Cliente creado: ${result.client.name} (ID: ${result.client.id})`);
    logSession(sessionId, `✅ Sesión creada: ${result.session.session_name}`);
    
    return result;
  } catch (createError) {
    // Si el cliente ya existe, buscar y reutilizar
    const duplicateResult = await handleDuplicateClientError(createError, trialSession, phoneNumber, sessionId);
    if (duplicateResult) {
      return duplicateResult;
    }
    throw createError;
  }
}

