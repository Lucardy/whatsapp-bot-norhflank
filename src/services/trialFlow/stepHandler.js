// Manejo de pasos del flujo de prueba gratuita
import { logSession } from '../../utils/logger/index.js';
import { TrialStep, trialSessions } from './constants.js';

/**
 * Procesa un paso del flujo de prueba gratuita
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @param {string} message - Mensaje del usuario
 * @param {string} sessionId - ID de la sesión (master)
 * @param {Object} sessionManager - Instancia del SessionManager (opcional)
 * @returns {Promise<Object>} { response: string, completed: boolean, cancelled: boolean, clientId: number|null, qrUrl: string|null, qrDataURL: string|null }
 */
export async function handleTrialStep(phoneNumber, message, sessionId, sessionManager = null) {
  const trialSession = trialSessions.get(phoneNumber);
  
  if (!trialSession) {
    return { response: null, completed: false, cancelled: false, clientId: null, qrUrl: null };
  }
  
  const messageLower = message.toLowerCase().trim();
  
  // Comando cancelar
  if (messageLower === 'cancelar' || messageLower === 'cancel') {
    trialSessions.delete(phoneNumber);
    logSession(sessionId, `❌ Prueba gratuita cancelada por ${phoneNumber}`);
    return {
      response: '❌ Proceso cancelado.\n\n💡 Puedes volver a solicitar una prueba gratuita escribiendo "5".',
      completed: false,
      cancelled: true,
      clientId: null,
      qrUrl: null
    };
  }
  
  // Paso 1: Recopilar nombre
  if (trialSession.step === TrialStep.NAME) {
    if (!message || message.trim().length < 2) {
      return {
        response: '❌ Por favor, envía un nombre válido (mínimo 2 caracteres).\n\nEjemplo: "Juan" o "Mi Negocio"',
        completed: false,
        cancelled: false,
        clientId: null,
        qrUrl: null
      };
    }
    
    if (message.trim().length > 100) {
      return {
        response: '❌ El nombre es demasiado largo. Por favor, envía un nombre más corto.',
        completed: false,
        cancelled: false,
        clientId: null,
        qrUrl: null
      };
    }
    
    trialSession.data.name = message.trim();
    trialSession.step = TrialStep.EMAIL;
    
    logSession(sessionId, `✅ Nombre recopilado: ${trialSession.data.name}`);
    
    // Guardar el mensaje original cuando el cliente completa su nombre
    // Este mensaje será usado para responder la confirmación cuando se conecte el QR
    // Necesitamos obtener el mensaje desde trialFlowHandler, así que lo guardamos en la sesión
    // El mensaje se pasará desde trialFlowHandler
    
    return {
      response: `✅ ¡Perfecto, *${trialSession.data.name}*! 

📧 Tu email (opcional):
Puedes saltar este paso escribiendo "saltar".

💡 Escribe "cancelar" si quieres salir.`,
      completed: false,
      cancelled: false,
      clientId: null,
      qrUrl: null
    };
  }
  
  // Paso 2: Recopilar email (opcional)
  if (trialSession.step === TrialStep.EMAIL) {
    if (messageLower === 'saltar' || messageLower === 'skip') {
      trialSession.data.email = null;
      logSession(sessionId, `⏭️ Email omitido por ${phoneNumber}`);
    } else {
      // Validar formato de email básico
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(message.trim())) {
        return {
          response: '❌ Email inválido. Por favor, envía un email válido o escribe "saltar".',
          completed: false,
          cancelled: false,
          clientId: null,
          qrUrl: null
        };
      }
      
      trialSession.data.email = message.trim();
      logSession(sessionId, `✅ Email recopilado: ${trialSession.data.email}`);
    }
    
    // Pasar al siguiente paso: pedir número donde enviar el QR
    trialSession.step = TrialStep.QR_PHONE;
    
    return {
      response: `✅ ¡Perfecto!
      
📱 *¿A qué número quieres que te enviemos el código QR?*

Puede ser el número de un amigo, familiar, o cualquier otro teléfono donde puedas escanear el QR.

💡 *Ejemplo:* 5491169956253 (sin espacios ni guiones)
💡 O escribe *"aquí"* para recibirlo en este mismo número

💡 Escribe "cancelar" si quieres salir.`,
      completed: false,
      cancelled: false,
      clientId: null,
      qrUrl: null
    };
  }
  
  // Paso 3: Recopilar número donde enviar el QR
  if (trialSession.step === TrialStep.QR_PHONE) {
    const messageLower = message.toLowerCase().trim();
    
    // Verificar si el usuario quiere recibir el QR en el mismo número
    const sameNumberKeywords = ['aquí', 'aqui', 'este', 'mismo', 'acá', 'aca', 'aquí mismo', 'aqui mismo', 'este número', 'este numero', 'mismo número', 'mismo numero'];
    if (sameNumberKeywords.includes(messageLower)) {
      // Usar el mismo número desde el que está hablando
      trialSession.data.qrPhoneNumber = null; // null indica que se envía al mismo número
      logSession(sessionId, `✅ QR se enviará al mismo número: ${phoneNumber}`);
      
      // Marcar que se está procesando para enviar mensaje inmediato
      trialSession.data.isProcessing = true;
      
      // Retornar mensaje de procesamiento inmediato
      // El flujo completo se ejecutará después en trialFlowHandler
      return {
        response: '⏳ *Procesando...*\n\nEstamos creando tu bot y generando el código QR. Te avisaremos en un momento.',
        completed: false,
        cancelled: false,
        clientId: null,
        qrUrl: null,
        isProcessing: true // Flag para indicar que se debe continuar con el procesamiento
      };
    }
    
    // Validar formato de número de teléfono (solo dígitos, mínimo 8 caracteres)
    const phoneRegex = /^[0-9]{8,15}$/;
    const cleanPhone = message.trim().replace(/[\s\-\(\)]/g, '');
    
    if (!phoneRegex.test(cleanPhone)) {
      return {
        response: '❌ Número de teléfono inválido. Por favor, envía solo números (8-15 dígitos) o escribe "aquí" para recibirlo en este mismo número.\n\n💡 Ejemplo: 5491169956253\n💡 O escribe "aquí" para recibirlo aquí mismo\n\n💡 Escribe "cancelar" si quieres salir.',
        completed: false,
        cancelled: false,
        clientId: null,
        qrUrl: null
      };
    }
    
    trialSession.data.qrPhoneNumber = cleanPhone;
    logSession(sessionId, `✅ Número para QR recopilado: ${trialSession.data.qrPhoneNumber}`);
    logSession(sessionId, `🔍 DEBUG - trialSession.data después de guardar: ${JSON.stringify(trialSession.data)}`);
    
    // Marcar que se está procesando para enviar mensaje inmediato
    trialSession.data.isProcessing = true;
    
    // Retornar mensaje de procesamiento inmediato
    // El flujo completo se ejecutará después en trialFlowHandler
    return {
      response: '⏳ *Procesando...*\n\nEstamos creando tu bot y generando el código QR. Te avisaremos en un momento.',
      completed: false,
      cancelled: false,
      clientId: null,
      qrUrl: null,
      isProcessing: true // Flag para indicar que se debe continuar con el procesamiento
    };
  }
  
  // Si llegamos aquí, el mensaje no es válido para el paso actual
  // Devolver mensaje de ayuda recordando en qué paso está
  if (trialSession.step === TrialStep.NAME) {
    return {
      response: `📝 Necesito tu nombre para continuar.\n\n💡 Escribe "cancelar" si quieres salir.`,
      completed: false,
      cancelled: false,
      clientId: null,
      qrUrl: null
    };
  }
  
  if (trialSession.step === TrialStep.EMAIL) {
    return {
      response: `📧 Tu email (opcional):\nPuedes saltar este paso escribiendo "saltar".\n\n💡 Escribe "cancelar" si quieres salir.`,
      completed: false,
      cancelled: false,
      clientId: null,
      qrUrl: null
    };
  }
  
  if (trialSession.step === TrialStep.QR_PHONE) {
    return {
      response: `📱 *¿A qué número quieres que te enviemos el código QR?*

Puede ser el número de un amigo, familiar, o cualquier otro teléfono donde puedas escanear el QR.

💡 *Ejemplo:* 5491169956253 (sin espacios ni guiones)
💡 O escribe *"aquí"* para recibirlo en este mismo número

💡 Escribe "cancelar" si quieres salir.`,
      completed: false,
      cancelled: false,
      clientId: null,
      qrUrl: null
    };
  }
  
  return { response: null, completed: false, cancelled: false, clientId: null, qrUrl: null };
}

