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
  const errorMessage = createError?.message || '';
  const isUniqueConstraint = errorMessage.includes('Unique constraint failed') || 
                             errorMessage.includes('already exists');
  
  if (!isUniqueConstraint) {
    return null;
  }
  
  logSession(sessionId, `ℹ️ Cliente duplicado detectado, buscando cliente existente...`);
  
  // Buscar cliente por teléfono primero (más confiable)
  let existingClient = null;
  if (phoneNumber) {
    const { getClientByPhone } = await import('../repositories/clientRepository.js');
    existingClient = await getClientByPhone(phoneNumber);
    if (existingClient) {
      logSession(sessionId, `✅ Cliente existente encontrado por teléfono: ${existingClient.name} (ID: ${existingClient.id})`);
    }
  }
  
  // Si no se encontró por teléfono, buscar por nombre
  if (!existingClient) {
    existingClient = await getClientByName(trialSession.data.name);
    if (existingClient) {
      logSession(sessionId, `✅ Cliente existente encontrado por nombre: ${existingClient.name} (ID: ${existingClient.id})`);
    }
  }
  
  if (!existingClient) {
    logSession(sessionId, `⚠️ Error de constraint único pero no se encontró cliente existente`);
    return null;
  }
  
  // Buscar si ya tiene una sesión
  let existingSession = await getSessionByClientId(existingClient.id, 'client');
  
  if (!existingSession) {
    // Crear sesión para el cliente existente
    const sessionName = existingClient.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    // Verificar que el nombre de sesión sea único
    const db = getPrisma();
    let finalSessionName = sessionName;
    let counter = 1;
    while (await db.whatsAppSession.findUnique({ where: { session_name: finalSessionName } })) {
      finalSessionName = `${sessionName}_${counter}`;
      counter++;
    }
    
    existingSession = await createSession({
      client_id: existingClient.id,
      session_name: finalSessionName,
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
  try {
    await db.client.update({
      where: { id: existingClient.id },
      data: {
        contact_phone: phoneNumber || existingClient.contact_phone,
        contact_email: trialSession.data.email || existingClient.contact_email,
        status: 'trial'
      }
    });
    logSession(sessionId, `✅ Datos del cliente actualizados`);
  } catch (updateError) {
    logSession(sessionId, `⚠️ Error actualizando cliente: ${updateError?.message || updateError}`);
  }
  
  // Actualizar también el phone_number de la sesión
  if (phoneNumber) {
    try {
      await db.whatsAppSession.update({
        where: { id: existingSession.id },
        data: {
          phone_number: phoneNumber
        }
      });
      logSession(sessionId, `✅ Número de teléfono actualizado en sesión: ${phoneNumber}`);
    } catch (updateError) {
      logSession(sessionId, `⚠️ Error actualizando número en sesión: ${updateError?.message || updateError}`);
    }
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
      contact_phone: phoneNumber || existingClient.contact_phone
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
  
  // Si el cliente ya fue creado cuando envió el nombre, reutilizarlo
  if (trialSession.data.clientId) {
    logSession(sessionId, `ℹ️ Cliente ya existe (creado cuando envió el nombre): ID ${trialSession.data.clientId}`);
    
    const { getClientById } = await import('../database/clientService.js');
    const existingClient = await getClientById(trialSession.data.clientId);
    
    if (existingClient) {
      logSession(sessionId, `✅ Cliente encontrado: ${existingClient.name} (ID: ${existingClient.id})`);
      
      // Actualizar email si se proporcionó
      if (trialSession.data.email) {
        const { updateClient } = await import('../../repositories/clientRepository.js');
        await updateClient(existingClient.id, {
          contact_email: trialSession.data.email,
          contact_phone: phoneNumber || existingClient.contact_phone
        });
        logSession(sessionId, `✅ Email actualizado: ${trialSession.data.email}`);
      } else if (phoneNumber && phoneNumber !== existingClient.contact_phone) {
        // Actualizar número si cambió
        const { updateClient } = await import('../../repositories/clientRepository.js');
        await updateClient(existingClient.id, {
          contact_phone: phoneNumber
        });
        logSession(sessionId, `✅ Número de teléfono actualizado: ${phoneNumber}`);
      }
      
      // Verificar si ya tiene una sesión
      const existingSession = await getSessionByClientId(existingClient.id, 'client');
      
      if (existingSession) {
        logSession(sessionId, `✅ Sesión existente encontrada: ${existingSession.session_name}`);
        return {
          client: existingClient,
          session: existingSession,
          qrUrl: null,
          onboardingUrl: null
        };
      }
      
      // Si no tiene sesión, crear una nueva
      const sessionName = existingClient.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      
      // Verificar que el nombre de sesión sea único
      const db = getPrisma();
      let finalSessionName = sessionName;
      let counter = 1;
      while (await db.whatsAppSession.findUnique({ where: { session_name: finalSessionName } })) {
        finalSessionName = `${sessionName}_${counter}`;
        counter++;
      }
      
      const newSession = await createSession({
        client_id: existingClient.id,
        session_name: finalSessionName,
        session_type: 'client',
        status: 'qr_pending',
        phone_number: phoneNumber || null
      });
      
      logSession(sessionId, `✅ Sesión creada para cliente existente: ${newSession.session_name}`);
      
      return {
        client: existingClient,
        session: newSession,
        qrUrl: null,
        onboardingUrl: null
      };
    } else {
      logSession(sessionId, `⚠️ Cliente con ID ${trialSession.data.clientId} no encontrado, creando nuevo`);
    }
  }
  
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

