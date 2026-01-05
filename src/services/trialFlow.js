// Servicio para manejar el flujo de solicitud de prueba gratuita desde WhatsApp
import { logSession } from '../utils/logger/index.js';
import { createClientWithSession } from './onboardingService.js';
import { ValidationError } from '../utils/errors.js';
import { getSessionByClientId } from './database/sessionService.js';
import { getPrisma } from '../config/database.js';

// Estados del flujo de prueba gratuita
export const TrialStep = {
  IDLE: 'idle',
  NAME: 'collecting_name',
  EMAIL: 'collecting_email',
  COMPLETED: 'completed'
};

// Mapa de sesiones en modo prueba gratuita: phoneNumber -> { step, data, sessionId }
const trialSessions = new Map();

/**
 * Verifica si el usuario ya tiene una sesión pendiente de QR
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @returns {Promise<Object|null>} Sesión pendiente o null
 */
async function findPendingSessionByPhone(phoneNumber) {
  try {
    const db = getPrisma();
    // Buscar cliente por contact_phone
    const client = await db.client.findFirst({
      where: {
        contact_phone: phoneNumber,
        status: 'trial' // Solo clientes en prueba
      },
      include: {
        sessions: {
          where: {
            session_type: 'client',
            status: { in: ['qr_pending', 'connecting'] } // Sesiones pendientes de QR
          }
        }
      }
    });
    
    if (client && client.sessions.length > 0) {
      return {
        client,
        session: client.sessions[0]
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Inicia el flujo de prueba gratuita
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @param {string} sessionId - ID de la sesión (master)
 * @param {Object} sessionManager - Instancia del SessionManager (opcional)
 * @returns {Promise<Object>} { message: string, hasPendingSession: boolean, sessionName: string|null, qrDataURL: string|null }
 */
export async function startTrialFlow(phoneNumber, sessionId, sessionManager = null) {
  logSession(sessionId, `🎁 Iniciando flujo de prueba gratuita para ${phoneNumber}`);
  
  // Verificar si el usuario ya tiene una sesión pendiente
  const pendingSession = await findPendingSessionByPhone(phoneNumber);
  
  if (pendingSession) {
    logSession(sessionId, `✅ Sesión pendiente encontrada para ${phoneNumber}: ${pendingSession.session.session_name}`);
    
    // Intentar obtener el QR de la sesión existente
    let qrDataURL = null;
    if (sessionManager) {
      try {
        // Asegurar que la sesión esté creada en el SessionManager
        const sessionData = sessionManager.getSession(pendingSession.session.session_name);
        if (!sessionData) {
          logSession(sessionId, `🔄 Creando sesión en SessionManager: ${pendingSession.session.session_name}`);
          await sessionManager.createSession(pendingSession.session.session_name, true);
        }
        
        // Esperar a que se genere el QR (máximo 30 segundos)
        const maxWaitTime = 30000;
        const checkInterval = 500;
        let waited = 0;
        
        while (waited < maxWaitTime) {
          const currentSessionData = sessionManager.getSession(pendingSession.session.session_name);
          if (currentSessionData?.lastQRDataURL) {
            qrDataURL = currentSessionData.lastQRDataURL;
            logSession(sessionId, `✅ QR encontrado para sesión existente: ${pendingSession.session.session_name}`);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          waited += checkInterval;
        }
      } catch (err) {
        logSession(sessionId, `⚠️ Error obteniendo QR de sesión existente: ${err?.message || err}`);
      }
    }
    
    const emailLine = pendingSession.client.contact_email ? `\n📧 Email: ${pendingSession.client.contact_email}` : '';
    const qrStatusLine = qrDataURL ? '\n\n📱 El QR se enviará en el siguiente mensaje.' : '\n\n⏳ El QR se está generando, espera un momento...';
    
    return {
      message: `🔄 *Ya tienes una cuenta de prueba*\n\n👤 Nombre: *${pendingSession.client.name}*${emailLine}\n\n📱 Escanea el QR para activar tu bot:${qrStatusLine}`,
      hasPendingSession: true,
      sessionName: pendingSession.session.session_name,
      qrDataURL: qrDataURL
    };
  }
  
  // Si no hay sesión pendiente, iniciar el flujo normal
  trialSessions.set(phoneNumber, {
    step: TrialStep.NAME,
    phoneNumber,
    sessionId,
    data: {
      name: null,
      email: null
    },
    startedAt: Date.now()
  });
  
  return {
    message: `🎁 *¡Prueba Gratuita de Bot de WhatsApp!*

✨ *7 días gratis* con un bot personalizado que responde automáticamente por ti.

📝 Para comenzar, solo necesito tu nombre:

💡 Escribe "cancelar" si quieres salir.`,
    hasPendingSession: false,
    sessionName: null,
    qrDataURL: null
  };
}

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
    
    return {
      response: `✅ ¡Perfecto, *${trialSession.data.name}*! 

📧 Ahora tu email (opcional):
Escribe "saltar" si prefieres no compartirlo.

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
    
    // Todos los datos recopilados, crear cliente y sesión
    return await completeTrialFlow(phoneNumber, sessionId, sessionManager);
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
      response: `📧 Tu email (opcional):\nEscribe "saltar" si prefieres no compartirlo.\n\n💡 Escribe "cancelar" si quieres salir.`,
      completed: false,
      cancelled: false,
      clientId: null,
      qrUrl: null
    };
  }
  
  return { response: null, completed: false, cancelled: false, clientId: null, qrUrl: null };
}

/**
 * Completa el flujo de prueba gratuita creando el cliente y la sesión
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @param {string} sessionId - ID de la sesión (master)
 * @param {Object} sessionManager - Instancia del SessionManager (opcional)
 * @returns {Promise<Object>} { response: string, completed: boolean, clientId: number, qrUrl: string, qrDataURL: string|null, sessionName: string }
 */
async function completeTrialFlow(phoneNumber, sessionId, sessionManager = null) {
  const trialSession = trialSessions.get(phoneNumber);
  
  if (!trialSession) {
    return { response: null, completed: false, clientId: null, qrUrl: null, qrDataURL: null, sessionName: null };
  }
  
  try {
    logSession(sessionId, `📝 Creando cliente para prueba gratuita: ${trialSession.data.name}`);
    
    // Validar datos antes de crear
    const { validateClientData } = await import('../utils/validation/clientValidator.js');
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
    const result = await createClientWithSession({
      name: trialSession.data.name,
      contact_email: trialSession.data.email || null,
      contact_phone: phoneNumber, // Usar el número de WhatsApp del usuario
      status: 'trial'
    });
    
    logSession(sessionId, `✅ Cliente creado: ${result.client.name} (ID: ${result.client.id})`);
    logSession(sessionId, `✅ Sesión creada: ${result.session.session_name}`);
    
    // Marcar como completado
    trialSession.step = TrialStep.COMPLETED;
    trialSessions.delete(phoneNumber);
    
    let qrDataURL = null;
    let isSessionReady = false;
    
    // Si tenemos acceso al sessionManager, crear la sesión y esperar el QR
    if (sessionManager) {
      try {
        logSession(sessionId, `🚀 Iniciando sesión para generar QR: ${result.session.session_name}`);
        
        // Verificar si la sesión ya existe en el SessionManager
        let sessionData = sessionManager.getSession(result.session.session_name);
        
        // Verificar en la base de datos si la sesión pertenece al cliente que se acaba de crear
        let shouldReset = false;
        if (sessionData) {
          logSession(sessionId, `ℹ️ Sesión "${result.session.session_name}" ya existe en SessionManager`);
          
          try {
            const { getSessionByName } = await import('../database/sessionService.js');
            const dbSession = await getSessionByName(result.session.session_name);
            
            // Si la sesión en la DB pertenece al cliente que se acaba de crear
            const belongsToNewClient = dbSession?.client_id === result.client.id;
            
            if (belongsToNewClient) {
              // La sesión pertenece al nuevo cliente
              logSession(sessionId, `✅ Sesión "${result.session.session_name}" pertenece al nuevo cliente (ID: ${result.client.id})`);
              
              // Si está conectada, verificar si el número conectado coincide con el del nuevo cliente
              if (sessionData.isReady) {
                const connectedPhone = dbSession?.phone_number;
                const newClientPhone = result.client.contact_phone;
                
                if (connectedPhone && newClientPhone) {
                  // Normalizar números para comparar
                  const normalize = (phone) => phone.replace(/[^0-9]/g, '');
                  const normalizedConnected = normalize(connectedPhone);
                  const normalizedNew = normalize(newClientPhone);
                  
                  if (normalizedConnected === normalizedNew) {
                    // El número conectado coincide, no necesitamos resetear
                    logSession(sessionId, `✅ Sesión ya conectada con el número correcto del cliente`);
                    isSessionReady = true;
                  } else {
                    // El número conectado no coincide, necesitamos resetear
                    logSession(sessionId, `🔄 Sesión conectada con número diferente. Reseteando...`);
                    shouldReset = true;
                  }
                } else {
                  // No hay número conectado o no hay número del cliente, resetear para estar seguros
                  logSession(sessionId, `🔄 Sesión conectada pero sin número verificado. Reseteando...`);
                  shouldReset = true;
                }
              } else {
                // No está conectada, verificar si tiene QR guardado
                if (sessionData.lastQRDataURL) {
                  qrDataURL = sessionData.lastQRDataURL;
                  logSession(sessionId, `✅ QR encontrado para sesión existente: ${result.session.session_name}`);
                } else {
                  // Iniciar la sesión para generar QR
                  logSession(sessionId, `🔄 Sesión existe pero no está conectada, iniciando...`);
                  await sessionManager.startSession(result.session.session_name);
                }
              }
            } else {
              // La sesión NO pertenece al nuevo cliente, siempre resetear
              logSession(sessionId, `🔄 Sesión "${result.session.session_name}" pertenece a otro cliente. Reseteando para nuevo cliente...`);
              shouldReset = true;
            }
          } catch (dbErr) {
            logSession(sessionId, `⚠️ Error verificando sesión en DB: ${dbErr?.message || dbErr}`);
            // Si hay error, por seguridad resetear si está conectada
            if (sessionData.isReady) {
              logSession(sessionId, `🔄 Error en verificación, reseteando por seguridad...`);
              shouldReset = true;
            }
          }
        } else {
          // Si la sesión no existe en SessionManager, crear una nueva
          logSession(sessionId, `🆕 Creando nueva sesión: ${result.session.session_name}`);
          await sessionManager.createSession(result.session.session_name, true); // Auto-inicializar
        }
        
        // Si necesitamos resetear, hacerlo ahora
        if (shouldReset) {
          try {
            logSession(sessionId, `🔄 Reseteando sesión "${result.session.session_name}"...`);
            await sessionManager.resetSession(result.session.session_name);
            logSession(sessionId, `✅ Sesión reseteada, esperando nuevo QR...`);
            // Esperar un poco para que se recree la sesión
            await new Promise(resolve => setTimeout(resolve, 2000));
            sessionData = sessionManager.getSession(result.session.session_name);
          } catch (resetErr) {
            logSession(sessionId, `⚠️ Error reseteando sesión: ${resetErr?.message || resetErr}`);
            // Continuar intentando crear/iniciar la sesión
          }
        }
        
        // Si no tenemos QR aún y la sesión no está conectada, esperar a que se genere
        if (!qrDataURL && !isSessionReady) {
          logSession(sessionId, `⏳ Esperando generación de QR...`);
          const maxWaitTime = 30000; // 30 segundos
          const checkInterval = 500; // Verificar cada 500ms
          let waited = 0;
          
          while (waited < maxWaitTime) {
            sessionData = sessionManager.getSession(result.session.session_name);
            
            // Si la sesión se conectó, no necesitamos QR
            if (sessionData?.isReady) {
              isSessionReady = true;
              logSession(sessionId, `✅ Sesión conectada durante la espera`);
              break;
            }
            
            // Si se generó el QR, usarlo
            if (sessionData?.lastQRDataURL) {
              qrDataURL = sessionData.lastQRDataURL;
              logSession(sessionId, `✅ QR generado para ${result.session.session_name}`);
              break;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
          }
          
          if (!qrDataURL && !isSessionReady) {
            logSession(sessionId, `⚠️ QR no generado después de ${maxWaitTime}ms`);
          }
        }
      } catch (err) {
        logSession(sessionId, `⚠️ Error iniciando sesión para QR: ${err?.message || err}`);
      }
    }
    
    // Construir mensaje según el estado de la sesión
    let qrMessage = '';
    if (isSessionReady) {
      qrMessage = '✅ *Tu bot ya está activo y funcionando!*\n\nNo necesitas escanear ningún QR.';
    } else if (qrDataURL) {
      qrMessage = '📱 *Escanea el QR para activar tu bot:*\nEl QR se enviará en el siguiente mensaje.';
    } else {
      qrMessage = '📱 *Escanea el QR para activar tu bot:*\n⏳ El QR se está generando, espera un momento...';
    }
    
    return {
      response: `🎉 *¡Listo! Tu bot está casi listo*

✅ Nombre: *${result.client.name}*
${result.client.contact_email ? `📧 Email: ${result.client.contact_email}\n` : ''}📱 Teléfono: ${phoneNumber}

${qrMessage}

⏰ *Recuerda:* Tu prueba es válida por 7 días.`,
      completed: true,
      cancelled: false,
      clientId: result.client.id,
      qrUrl: null, // Ya no enviamos la URL
      qrDataURL: qrDataURL,
      sessionName: result.session.session_name,
      isSessionReady: isSessionReady // Agregar flag para saber si está conectada
    };
  } catch (error) {
    logSession(sessionId, `❌ Error completando prueba gratuita: ${error?.message || error}`);
    trialSessions.delete(phoneNumber);
    
    return {
      response: `❌ *Error al crear tu cuenta*

Hubo un problema. Por favor, intenta nuevamente más tarde o contacta con soporte.

Error: ${error instanceof ValidationError ? error.message : 'Error interno del servidor'}`,
      completed: false,
      cancelled: false,
      clientId: null,
      qrUrl: null,
      qrDataURL: null,
      sessionName: null
    };
  }
}

/**
 * Verifica si un usuario está en modo prueba gratuita
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @returns {boolean} true si está en modo prueba gratuita
 */
export function isInTrialFlow(phoneNumber) {
  return trialSessions.has(phoneNumber);
}

/**
 * Obtiene el paso actual del flujo de prueba gratuita
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @returns {string|null} Paso actual o null si no está en el flujo
 */
export function getTrialStep(phoneNumber) {
  const trialSession = trialSessions.get(phoneNumber);
  return trialSession ? trialSession.step : null;
}

/**
 * Cancela el flujo de prueba gratuita para un usuario
 * @param {string} phoneNumber - Número de teléfono del usuario
 */
export function cancelTrialFlow(phoneNumber) {
  trialSessions.delete(phoneNumber);
}

