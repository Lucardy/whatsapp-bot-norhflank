// Lógica de inicio del flujo de prueba gratuita
import { logSession } from '../../utils/logger/index.js';
import { TrialStep, trialSessions } from './constants.js';
import { buildWelcomeMessage } from './messageBuilder.js';
import { findExistingClient, findPendingSession } from './clientDetection.js';

/**
 * Inicia el flujo de prueba gratuita
 * @param {string} phoneNumber - Número de teléfono del usuario (puede ser chatId)
 * @param {string} sessionId - ID de la sesión (master)
 * @param {Object} sessionManager - Instancia del SessionManager (opcional)
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js (opcional, para extraer número real)
 * @returns {Promise<Object>} { message: string, hasPendingSession: boolean, sessionName: string|null, qrDataURL: string|null, pairingCode: string|null }
 */
export async function startTrialFlow(phoneNumber, sessionId, sessionManager = null, msg = null) {
  logSession(sessionId, `🎁 Iniciando flujo de prueba gratuita para ${phoneNumber}`);
  
  // Intentar extraer el número real del contacto desde el mensaje
  // IMPORTANTE: Usar chat.name (mismo método que phoneCapture.js) - es la forma correcta
  // Si no se puede obtener el número real, NO usar el chatId (puede ser ID largo)
  let realPhoneNumber = null;
  if (msg) {
    try {
      // MÉTODO CORRECTO: Obtener el número desde chat.name (igual que phoneCapture.js)
      if (msg.getChat && typeof msg.getChat === 'function') {
        const chat = await msg.getChat();
        if (chat && chat.name) {
          // Extraer el número real desde chat.name (ej: "+54 9 2665 28-5510" -> "5492665285510")
          const phoneFromChat = chat.name.replace(/\D/g, ''); // Remover todo lo que no sea dígito
          
          // Validar que sea un número válido (8-15 dígitos)
          const { PHONE_VALIDATION_PATTERN } = await import('../../config/constants.js');
          if (PHONE_VALIDATION_PATTERN.test(phoneFromChat)) {
            realPhoneNumber = phoneFromChat;
            logSession(sessionId, `✅ Número real extraído desde chat.name: ${realPhoneNumber} (chatId: ${phoneNumber}, chat.name: ${chat.name})`);
          } else {
            logSession(sessionId, `⚠️ chat.name no contiene un número válido: ${chat.name}`);
          }
        } else {
          logSession(sessionId, `⚠️ No se pudo obtener chat o chat.name desde el mensaje`);
        }
      } else {
        logSession(sessionId, `⚠️ msg.getChat no está disponible`);
      }
    } catch (error) {
      logSession(sessionId, `⚠️ Error extrayendo número real desde chat.name: ${error?.message || error}`);
    }
  }
  
  // Si no hay número real, usar null (no usar el chatId que puede ser ID largo)
  // El número se guardará cuando el cliente envíe un mensaje a su sesión
  
  // PRIMERO: Verificar si el cliente ya existe por número de teléfono (solo si tenemos número real)
  if (realPhoneNumber) {
    // Verificar si el cliente existe (incluyendo suspendidos)
    const { findClientByPhone } = await import('./dbQueries.js');
    const existingClient = await findClientByPhone(realPhoneNumber);
    
      if (existingClient) {
      logSession(sessionId, `✅ Cliente existente encontrado: ${existingClient.name} (ID: ${existingClient.id}, status: ${existingClient.status})`);
      
      // Si el cliente está suspendido, mostrar mensaje especial pero permitir continuar
      // El cliente puede volver a registrarse para obtener un nuevo QR
      if (existingClient.status === 'suspended') {
        logSession(sessionId, `⚠️ Cliente suspendido detectado, permitiendo re-registro para obtener nuevo QR`);
      }
      
      // Pasar el chatId (phoneNumber) para que la sesión de trial se cree con la clave correcta
      // findExistingClient maneja clientes activos y en trial, pero no suspendidos
      // Si está suspendido, findExistingClient retornará null y continuaremos con el flujo manual
      const existingClientResult = await findExistingClient(realPhoneNumber, sessionId, sessionManager, phoneNumber);
      if (existingClientResult) {
        // Si el cliente está suspendido pero findExistingClient retornó algo, agregar mensaje especial
        if (existingClient.status === 'suspended') {
          const { buildExistingClientMessage } = await import('./messageBuilder.js');
          const baseMessage = buildExistingClientMessage(existingClient);
          return {
            ...existingClientResult,
            message: `⚠️ *Tu cuenta está suspendida*\n\n${baseMessage}\n\n💡 *Nota:* Al escanear el QR, podrás reactivar tu bot.`
          };
        }
        return existingClientResult;
      }
      
      // Verificar si el usuario ya tiene una sesión pendiente (solo para trial/active)
      if (existingClient.status !== 'suspended') {
        const pendingSessionResult = await findPendingSession(realPhoneNumber, sessionId, sessionManager);
        if (pendingSessionResult) {
          return pendingSessionResult;
        }
      }
      
      // Si el cliente existe (incluyendo suspendidos) pero no tiene sesión pendiente
      // Continuar desde el paso apropiado según los datos que tenga
      logSession(sessionId, `   Continuando desde el paso apropiado según datos disponibles`);
      
      // Determinar desde qué paso continuar según los datos disponibles
      let initialStep = TrialStep.NAME;
      let welcomeMessage = null;
      
      if (existingClient.name && existingClient.contact_email) {
        // Tiene nombre y email, continuar desde QR_PHONE
        initialStep = TrialStep.QR_PHONE;
        if (existingClient.status === 'suspended') {
          welcomeMessage = `⚠️ *¡Hola de nuevo, ${existingClient.name}!* 👋

Veo que tu cuenta está suspendida porque tu período de prueba finalizó.

Puedes obtener un nuevo código QR para reactivar tu bot.

📱 *¿A qué número quieres que te enviemos el código QR?*

Puede ser el número de un amigo, familiar, o cualquier otro teléfono donde puedas escanear el QR.

⚠️ *Importante:* El QR debe escanearse desde el WhatsApp donde quieres tener el bot (el número donde se activará tu bot).

💡 O escribe *"aquí"* para recibirlo en este mismo número

💡 Escribe "cancelar" si quieres salir.`;
        } else {
          welcomeMessage = `¡Hola de nuevo, *${existingClient.name}*! 👋

Veo que ya tienes tus datos guardados. Continuemos con el proceso.

📱 *¿A qué número quieres que te enviemos el código QR?*

Puede ser el número de un amigo, familiar, o cualquier otro teléfono donde puedas escanear el QR.

⚠️ *Importante:* El QR debe escanearse desde el WhatsApp donde quieres tener el bot (el número donde se activará tu bot).

💡 O escribe *"aquí"* para recibirlo en este mismo número

💡 Escribe "cancelar" si quieres salir.`;
        }
      } else if (existingClient.name) {
        // Tiene nombre pero no email, continuar desde EMAIL
        initialStep = TrialStep.EMAIL;
        if (existingClient.status === 'suspended') {
          welcomeMessage = `⚠️ *¡Hola de nuevo, ${existingClient.name}!* 👋

Veo que tu cuenta está suspendida porque tu período de prueba finalizó.

Puedes completar el registro para obtener un nuevo código QR y reactivar tu bot.

📧 *Tu email (opcional):*
Puedes saltar este paso escribiendo "saltar".

💡 Escribe "cancelar" si quieres salir.`;
        } else {
          welcomeMessage = `¡Hola de nuevo, *${existingClient.name}*! 👋

Veo que ya tienes tu nombre guardado. Continuemos con el proceso.

📧 *Tu email (opcional):*
Puedes saltar este paso escribiendo "saltar".

💡 Escribe "cancelar" si quieres salir.`;
        }
      } else {
        // No tiene nombre (raro pero posible), empezar desde NAME
        initialStep = TrialStep.NAME;
        if (existingClient.status === 'suspended') {
          welcomeMessage = `⚠️ *Cuenta suspendida detectada*

Veo que tienes una cuenta suspendida con nosotros.

Puedes volver a registrarte para obtener un nuevo código QR y reactivar tu bot.

📝 *Paso 1: Tu nombre*
Por favor, escribe tu nombre o el nombre de tu negocio.

💡 Ejemplo: "Juan" o "Mi Negocio"

💡 *Comandos disponibles:*
• "cancelar" - Salir del proceso
• "ayuda" - Ver ayuda contextual en cualquier momento`;
        } else {
          welcomeMessage = buildWelcomeMessage();
        }
      }
      
      // Crear sesión de trial con los datos del cliente existente
      // IMPORTANTE: Usar phoneNumber (chatId) como clave para que coincida con el chatId del mensaje
      trialSessions.set(phoneNumber, {
        step: initialStep,
        phoneNumber: realPhoneNumber,
        sessionId,
        data: {
          name: existingClient.name || null,
          email: existingClient.contact_email || null,
          qrPhoneNumber: null,
          originalMessage: null,
          clientId: existingClient.id, // Guardar el ID del cliente existente
          isExistingClient: true, // Flag para identificar que es cliente existente
          wasSuspended: existingClient.status === 'suspended' // Flag para saber si estaba suspendido
        },
        startedAt: Date.now()
      });
      
      // Verificar que la sesión se creó correctamente
      const createdSession = trialSessions.get(phoneNumber);
      logSession(sessionId, `📝 Trial session creada para cliente existente desde paso: ${initialStep} (status: ${existingClient.status})`);
      logSession(sessionId, `🔍 Verificación: sesión creada con clave "${phoneNumber}" - existe: ${!!createdSession}, paso: ${createdSession?.step || 'N/A'}`);
      
      return {
        message: welcomeMessage || buildWelcomeMessage(),
        hasPendingSession: false,
        sessionName: null,
        qrDataURL: null
      };
    }
  }
  
  // Si no hay cliente existente, iniciar el flujo normal desde NAME
  // Usar phoneNumber como clave (chatId) pero guardar realPhoneNumber en los datos (puede ser null)
  trialSessions.set(phoneNumber, {
    step: TrialStep.NAME,
    phoneNumber: realPhoneNumber || null, // Guardar el número real si está disponible, null si no
    sessionId,
    data: {
      name: null,
      email: null,
      qrPhoneNumber: null,
      originalMessage: null // Guardar el mensaje original para responder la confirmación
    },
    startedAt: Date.now()
  });
  
  if (realPhoneNumber) {
    logSession(sessionId, `📝 Trial session creada con número real: ${realPhoneNumber} (clave: ${phoneNumber})`);
  } else {
    logSession(sessionId, `📝 Trial session creada (número se obtendrá cuando el cliente envíe mensaje) (clave: ${phoneNumber})`);
  }
  
  return {
    message: buildWelcomeMessage(),
    hasPendingSession: false,
    sessionName: null,
    qrDataURL: null
  };
}

