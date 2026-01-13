// Handler para el paso NAME del flujo de prueba gratuita
// Responsabilidad única: Procesar y validar el nombre del cliente

import { logSession } from '../../../utils/logger/index.js';
import { TrialStep } from '../constants.js';
import { PHONE_VALIDATION_PATTERN } from '../../../config/constants.js';

/**
 * Extrae el teléfono desde el mensaje original si está disponible
 * @param {Object} trialSession - Sesión de trial
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<void>}
 */
async function extractPhoneFromMessage(trialSession, sessionId) {
  const originalMsg = trialSession.data?.originalMessage || trialSession.originalMessage;
  if (originalMsg) {
    try {
      if (originalMsg.getChat && typeof originalMsg.getChat === 'function') {
        const chat = await originalMsg.getChat();
        if (chat && chat.name) {
          // Extraer el número desde chat.name (ej: "+54 9 2665 28-5510" -> "5492665285510")
          const phoneFromChat = chat.name.replace(/\D/g, '');
          if (PHONE_VALIDATION_PATTERN.test(phoneFromChat)) {
            trialSession.phoneNumber = phoneFromChat;
            logSession(sessionId, `✅ Teléfono obtenido desde chat.name: ${phoneFromChat} (chat.name: ${chat.name})`);
          } else {
            logSession(sessionId, `⚠️ chat.name no contiene número válido: ${chat.name}`);
          }
        } else {
          logSession(sessionId, `⚠️ No se pudo obtener chat.name del mensaje`);
        }
      }
    } catch (error) {
      logSession(sessionId, `⚠️ Error obteniendo teléfono desde chat: ${error?.message || error}`);
    }
  } else {
    logSession(sessionId, `⚠️ No hay mensaje original disponible para obtener teléfono desde chat.name`);
  }
}

/**
 * Crea o actualiza el cliente inmediatamente con el nombre y número
 * @param {Object} trialSession - Sesión de trial
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<void>}
 */
async function createOrUpdateClient(trialSession, sessionId) {
  try {
    const { getClientByPhone } = await import('../../../repositories/clientRepository.js');
    const { createClient } = await import('../../../repositories/clientRepository.js');
    const { updateClient } = await import('../../../repositories/clientRepository.js');
    
    const clientName = trialSession.data.name.trim();
    const clientPhone = trialSession.phoneNumber || null;
    
    let existingClient = null;
    
    // Buscar cliente existente por número de teléfono (si tenemos número)
    if (clientPhone) {
      existingClient = await getClientByPhone(clientPhone);
      if (existingClient) {
        logSession(sessionId, `✅ Cliente existente encontrado por teléfono: ${existingClient.name} (ID: ${existingClient.id})`);
      }
    }
    
    if (existingClient) {
      // Cliente existe: actualizar nombre si es diferente
      if (existingClient.name !== clientName) {
        await updateClient(existingClient.id, { name: clientName });
        logSession(sessionId, `✅ Nombre del cliente actualizado: ${clientName}`);
      }
      trialSession.data.clientId = existingClient.id;
      logSession(sessionId, `✅ Cliente existente reutilizado: ${existingClient.name} (ID: ${existingClient.id})`);
    } else {
      // Cliente no existe: crear nuevo cliente
      const newClient = await createClient({
        name: clientName,
        contact_phone: clientPhone,
        contact_email: null, // Se actualizará después si proporciona email
        status: 'trial' // Cliente inactivo hasta que complete el proceso
      });
      trialSession.data.clientId = newClient.id;
      logSession(sessionId, `✅ Cliente creado inmediatamente: ${newClient.name} (ID: ${newClient.id}) con teléfono: ${clientPhone || 'pendiente'}`);
    }
  } catch (error) {
    logSession(sessionId, `⚠️ Error creando/actualizando cliente: ${error?.message || error}`);
    // Continuar con el flujo aunque haya error al crear el cliente
    // El cliente se creará más tarde en completeFlow si es necesario
  }
}


/**
 * Procesa el paso NAME del flujo de prueba gratuita
 * @param {string} message - Mensaje del usuario (nombre)
 * @param {Object} trialSession - Sesión de trial
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<Object>} Respuesta del paso
 */
export async function handleNameStep(message, trialSession, phoneNumber, sessionId) {
  // Validar el nombre usando la función de validación mejorada
  try {
    const { validateClientName } = await import('../../../utils/validation/messageValidator.js');
    validateClientName(message, { maxLength: 100, minLength: 2 });
    trialSession.data.name = message.trim();
  } catch (validationError) {
    // Manejar diferentes tipos de errores de validación con mensajes amigables
    let errorMessage = '❌ Nombre inválido.';
    
    if (validationError.message.includes('al menos 2 letras')) {
      errorMessage = '❌ El nombre debe contener al menos 2 letras.\n\nNo se permiten solo números o símbolos.\n\n💡 Ejemplos válidos: "Juan", "María", "Mi Negocio"';
    } else if (validationError.message.includes('solo números')) {
      errorMessage = '❌ El nombre no puede ser solo números.\n\nPor favor, ingresa un nombre real.\n\n💡 Ejemplos válidos: "Juan", "María", "Mi Negocio"';
    } else if (validationError.message.includes('solo símbolos')) {
      errorMessage = '❌ El nombre no puede ser solo símbolos.\n\nPor favor, ingresa un nombre real.\n\n💡 Ejemplos válidos: "Juan", "María", "Mi Negocio"';
    } else if (validationError.message.includes('caracteres no permitidos')) {
      errorMessage = '❌ El nombre contiene caracteres no permitidos.\n\nSolo se permiten letras, números, espacios, guiones, apostrofes y puntos.\n\n💡 Ejemplos válidos: "Juan", "María José", "O\'Connor"';
    } else if (validationError.message.includes('múltiples espacios')) {
      errorMessage = '❌ El nombre no puede tener múltiples espacios consecutivos.\n\nPor favor, corrige el nombre.\n\n💡 Ejemplo válido: "María José"';
    } else if (validationError.message.includes('más de')) {
      errorMessage = '❌ El nombre es demasiado largo.\n\nPor favor, envía un nombre más corto (máximo 100 caracteres).';
    } else if (validationError.message.includes('al menos') && validationError.message.includes('caracteres')) {
      errorMessage = '❌ El nombre es demasiado corto.\n\nDebe tener al menos 2 caracteres.\n\n💡 Ejemplos válidos: "Juan", "María", "Mi Negocio"';
    } else {
      errorMessage = `❌ ${validationError.message}\n\n💡 Ejemplos válidos: "Juan", "María", "Mi Negocio"`;
    }
    
    return {
      response: errorMessage,
      completed: false,
      cancelled: false,
      clientId: null,
      qrUrl: null
    };
  }
  
  // Extraer teléfono desde el mensaje original si está disponible
  await extractPhoneFromMessage(trialSession, sessionId);
  
  // Crear o actualizar cliente inmediatamente
  await createOrUpdateClient(trialSession, sessionId);
  
  // Avanzar al siguiente paso
  trialSession.step = TrialStep.EMAIL;
  
  // Resetear cooldown al avanzar de paso
  const { resetErrorCooldown } = await import('../../messageHandler/utils/errorMessageCooldown.js');
  resetErrorCooldown(sessionId, phoneNumber, 'trial', TrialStep.NAME);
  
  logSession(sessionId, `✅ Nombre recopilado: ${trialSession.data.name}`);
  
  return {
    response: `✅ ¡Perfecto, *${trialSession.data.name}*! 

📧 Tu email (opcional):
Puedes saltar este paso escribiendo "saltar".

💡 *Comandos disponibles:*
• "saltar" - Omitir este paso
• "cancelar" - Salir del proceso
• "ayuda" - Ver ayuda contextual`,
    completed: false,
    cancelled: false,
    clientId: trialSession.data.clientId || null,
    qrUrl: null
  };
}
