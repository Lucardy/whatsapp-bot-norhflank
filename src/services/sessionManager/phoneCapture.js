// Captura y guardado del número de teléfono del WhatsApp conectado
// IMPORTANTE: client.info es NUESTRA cuenta de WhatsApp, NO la del cliente.
// El número del cliente solo se puede obtener desde un mensaje usando message.getContact()
import { logSession } from '../../utils/logger/index.js';
import { PHONE_VALIDATION_PATTERN } from '../../config/constants.js';

/**
 * Guarda el número de teléfono del cliente cuando se recibe un mensaje
 * FORMA CORRECTA: Usar chat.name que contiene el número formateado (ej: "+54 9 2665 28-5510")
 * 
 * IMPORTANTE: chat.name contiene el número real del cliente cuando envía un mensaje
 * 
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<void>}
 */
export async function savePhoneNumberFromMessage(msg, sessionId) {
  try {
    // MÉTODO CORRECTO: Obtener el número desde chat.name
    if (!msg.getChat || typeof msg.getChat !== 'function') {
      logSession(sessionId, `⚠️ msg.getChat no está disponible`);
      return;
    }

    const chat = await msg.getChat();
    if (!chat || !chat.name) {
      logSession(sessionId, `⚠️ No se pudo obtener chat o chat.name desde el mensaje`);
      return;
    }

    logSession(sessionId, `📱 Datos del chat obtenidos desde mensaje:`);
    logSession(sessionId, `   - chat.name: ${chat.name}`);
    logSession(sessionId, `   - chat.id: ${chat.id?._serialized || chat.id || 'N/A'}`);

    // Extraer el número real desde chat.name (ej: "+54 9 2665 28-5510" -> "5492665285510")
    const phoneNumber = chat.name.replace(/\D/g, ''); // Remover todo lo que no sea dígito
    
    // Validar que sea un número válido (8-15 dígitos)
    if (!PHONE_VALIDATION_PATTERN.test(phoneNumber)) {
      logSession(sessionId, `⚠️ chat.name no contiene un número válido: ${chat.name}`);
      return; // No guardar si no es válido
    }

    logSession(sessionId, `✅ Número real obtenido desde chat.name: ${phoneNumber}`);

    // Verificar si ya hay un número válido guardado (no sobrescribir si es válido)
    const { getSessionByName } = await import('../database/sessionService.js');
    const existingSession = await getSessionByName(sessionId);
    
    if (existingSession && existingSession.phone_number) {
      const existingPhone = existingSession.phone_number.replace(/[^0-9]/g, '');
      if (PHONE_VALIDATION_PATTERN.test(existingPhone)) {
        if (existingPhone === phoneNumber) {
          logSession(sessionId, `ℹ️ El número ya está guardado correctamente: ${phoneNumber}`);
          return; // Ya está guardado, no hacer nada
        } else {
          logSession(sessionId, `🔄 Actualizando número: ${existingPhone} -> ${phoneNumber}`);
        }
      } else {
        logSession(sessionId, `🔄 Reemplazando ID largo (${existingSession.phone_number}) con número real: ${phoneNumber}`);
      }
    }

    // Guardar en la base de datos
    try {
      const { updateSessionPhone } = await import('../database/sessionService.js');
      const { updateClientPhone } = await import('../database/clientService.js');
      
      await updateSessionPhone(sessionId, phoneNumber);
      
      // Si es una sesión de cliente (no maestro), también actualizar contact_phone del cliente
      if (existingSession && existingSession.session_type === 'client' && existingSession.client) {
        await updateClientPhone(existingSession.client.id, phoneNumber);
        logSession(sessionId, `✅ Número de teléfono guardado en cliente: ${existingSession.client.name}`);
      }
      
      logSession(sessionId, `✅ Número de teléfono guardado en la base de datos: ${phoneNumber}`);
    } catch (dbError) {
      logSession(sessionId, `⚠️ Error guardando número en DB: ${dbError?.message || dbError}`);
    }
  } catch (error) {
    logSession(sessionId, `⚠️ Error obteniendo número desde mensaje: ${error?.message || error}`);
  }
}

/**
 * Guarda el número de teléfono cuando un cliente envía un mensaje al MASTER
 * FORMA CORRECTA: Usar chat.name que contiene el número formateado (ej: "+54 9 2665 28-5510")
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} masterSessionId - ID de la sesión master
 * @returns {Promise<void>}
 */
export async function savePhoneNumberFromMasterMessage(msg, masterSessionId) {
  try {
    // MÉTODO CORRECTO: Obtener el número desde chat.name
    if (!msg.getChat || typeof msg.getChat !== 'function') {
      logSession(masterSessionId, `⚠️ msg.getChat no está disponible`);
      return;
    }

    const chat = await msg.getChat();
    if (!chat || !chat.name) {
      logSession(masterSessionId, `⚠️ No se pudo obtener chat o chat.name desde el mensaje`);
      return;
    }

    logSession(masterSessionId, `📱 [MASTER] Datos del chat obtenidos desde mensaje:`);
    logSession(masterSessionId, `   - chat.name: ${chat.name}`);
    logSession(masterSessionId, `   - chat.id: ${chat.id?._serialized || chat.id || 'N/A'}`);

    // Extraer el número real desde chat.name (ej: "+54 9 2665 28-5510" -> "5492665285510")
    const phoneNumber = chat.name.replace(/\D/g, ''); // Remover todo lo que no sea dígito
    
    // Validar que sea un número válido (8-15 dígitos)
    if (!PHONE_VALIDATION_PATTERN.test(phoneNumber)) {
      logSession(masterSessionId, `⚠️ [MASTER] chat.name no contiene un número válido: ${chat.name}`);
      return; // No guardar si no es válido
    }

    logSession(masterSessionId, `✅ [MASTER] Número real obtenido desde chat.name: ${phoneNumber}`);

    // Buscar el cliente por número de teléfono
    const { updateClientPhone } = await import('../database/clientService.js');
    const { getClientByPhone } = await import('../../repositories/clientRepository.js');
    const { updateSessionPhone, getSessionByClientId } = await import('../database/sessionService.js');
    
    // Buscar cliente por número (puede estar en contact_phone)
    const client = await getClientByPhone(phoneNumber);
    
    if (client) {
      logSession(masterSessionId, `📱 [MASTER] Cliente encontrado: ${client.name} (ID: ${client.id})`);
      
      // Actualizar contact_phone del cliente si es necesario
      if (!client.contact_phone || client.contact_phone.replace(/[^0-9]/g, '') !== phoneNumber) {
        await updateClientPhone(client.id, phoneNumber);
        logSession(masterSessionId, `✅ [MASTER] Número actualizado en cliente: ${client.name} (${phoneNumber})`);
      }
      
      // Buscar la sesión del cliente
      const clientSession = await getSessionByClientId(client.id, 'client');
      
      if (clientSession) {
        logSession(masterSessionId, `📱 [MASTER] Sesión del cliente encontrada: ${clientSession.session_name}`);
        
        // Verificar si ya tiene el número correcto
        if (clientSession.phone_number) {
          const existingPhone = clientSession.phone_number.replace(/[^0-9]/g, '');
          if (PHONE_VALIDATION_PATTERN.test(existingPhone)) {
            if (existingPhone === phoneNumber) {
              logSession(masterSessionId, `ℹ️ [MASTER] El número ya está guardado correctamente en la sesión: ${phoneNumber}`);
            } else {
              logSession(masterSessionId, `🔄 [MASTER] Actualizando número en sesión: ${existingPhone} -> ${phoneNumber}`);
              await updateSessionPhone(clientSession.session_name, phoneNumber);
            }
          } else {
            logSession(masterSessionId, `🔄 [MASTER] Reemplazando ID largo (${clientSession.phone_number}) con número real: ${phoneNumber}`);
            await updateSessionPhone(clientSession.session_name, phoneNumber);
          }
        } else {
          logSession(masterSessionId, `✅ [MASTER] Guardando número en sesión: ${phoneNumber}`);
          await updateSessionPhone(clientSession.session_name, phoneNumber);
        }
      } else {
        logSession(masterSessionId, `⚠️ [MASTER] Cliente encontrado pero no tiene sesión asociada`);
      }
    } else {
      logSession(masterSessionId, `⚠️ [MASTER] No se encontró cliente para el número: ${phoneNumber}`);
      logSession(masterSessionId, `   El número se guardará cuando el cliente complete el flujo de prueba`);
    }
  } catch (error) {
    logSession(masterSessionId, `⚠️ [MASTER] Error obteniendo número desde mensaje: ${error?.message || error}`);
  }
}

/**
 * Captura el número de teléfono del cliente WhatsApp cuando se conecta después de escanear el QR
 * 
 * IMPORTANTE: La ÚNICA forma de obtener el número real es cuando el cliente envía un mensaje:
 *   const contact = await message.getContact();
 *   const phone = contact.id?.user;
 * 
 * NO se puede obtener desde client.info (solo retorna IDs largos o información del bot).
 * El número se guardará automáticamente cuando el cliente envíe el primer mensaje.
 * 
 * @param {Object} client - Cliente de WhatsApp
 * @param {string} sessionId - ID de la sesión
 * @param {Object} sessionData - Datos de la sesión
 */
export async function captureAndSavePhoneNumber(client, sessionId, sessionData) {
  logSession(sessionId, `✅ Sesión conectada después de escanear QR`);
  logSession(sessionId, `📱 El número de teléfono se guardará cuando el cliente envíe un mensaje`);
  logSession(sessionId, `   (Usando: const contact = await message.getContact(); const phone = contact.id?.user;)`);
  
  try {
    // Verificar si ya hay un número válido guardado (del flujo de prueba, por ejemplo)
    const { getSessionByName } = await import('../database/sessionService.js');
    const existingSession = await getSessionByName(sessionId);
    
    if (existingSession && existingSession.phone_number) {
      const existingPhone = existingSession.phone_number.replace(/[^0-9]/g, '');
      if (PHONE_VALIDATION_PATTERN.test(existingPhone)) {
        logSession(sessionId, `✅ Número ya guardado previamente: ${existingPhone}`);
        sessionData.phoneNumber = existingPhone;
      } else {
        logSession(sessionId, `⚠️ Número guardado es inválido (ID largo), se actualizará cuando llegue un mensaje`);
      }
    }
  } catch (error) {
    logSession(sessionId, `⚠️ Error verificando número existente: ${error?.message || error}`);
  }
}

