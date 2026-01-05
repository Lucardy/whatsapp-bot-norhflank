// Servicio para manejar el flujo de configuración de respuestas desde WhatsApp
import { logSession } from '../utils/logger/index.js';
import { getPrisma } from '../config/database.js';
import { updateClientConfig, getClientConfig } from './database/configService.js';
import { clearConfigCache } from './messageHandler/cache.js';
import { ValidationError } from '../utils/errors.js';
// Validación se importa dinámicamente cuando se necesita

// Estados del flujo de configuración
export const ConfigStep = {
  IDLE: 'idle',
  WELCOME: 'configuring_welcome',
  OPTION_1_LABEL: 'configuring_option_1_label',
  OPTION_1: 'configuring_option_1',
  OPTION_2_LABEL: 'configuring_option_2_label',
  OPTION_2: 'configuring_option_2',
  OPTION_3_LABEL: 'configuring_option_3_label',
  OPTION_3: 'configuring_option_3',
  OPTION_4_LABEL: 'configuring_option_4_label',
  OPTION_4: 'configuring_option_4',
  COMPLETED: 'completed'
};

// Mapa de sesiones en modo configuración: clientId -> { step, data, phoneNumber }
const configurationSessions = new Map();

/**
 * Inicia el modo configuración para un cliente
 * @param {number} clientId - ID del cliente
 * @param {string} phoneNumber - Número de teléfono del cliente
 * @param {string} sessionId - ID de la sesión (master)
 * @returns {Promise<string>} Mensaje de inicio
 */
export async function startConfiguration(clientId, phoneNumber, sessionId) {
  logSession(sessionId, `⚙️ Iniciando modo configuración para cliente ${clientId}`);
  
  // Obtener configuración actual para mostrar valores por defecto
  const currentConfig = await getClientConfig(sessionId);
  
  configurationSessions.set(clientId, {
    step: ConfigStep.WELCOME,
    phoneNumber,
    data: {
      welcome_message: currentConfig?.welcome_message || null,
      options: currentConfig?.menu_options?.options || []
    },
    startedAt: Date.now()
  });
  
  return `⚙️ *Modo Configuración Activado*

Vamos a configurar las respuestas de tu bot paso a paso.

📝 *PASO 1: Mensaje de Bienvenida*
Envía el mensaje que quieres que aparezca cuando alguien escriba por primera vez a tu bot.

💡 *Comandos disponibles:*
• 'saltar' - Mantener mensaje actual
• 'cancelar' - Salir sin guardar
• 'ver' - Ver vista previa del menú
• 'editar [1-4]' - Editar una opción específica

📏 *Requisitos:* Mínimo 3 caracteres, máximo 2000 caracteres

*Mensaje actual:* ${currentConfig?.welcome_message ? `"${currentConfig.welcome_message.substring(0, 50)}..."` : 'No configurado'}`;
}

/**
 * Procesa un paso del flujo de configuración
 * @param {number} clientId - ID del cliente
 * @param {string} message - Mensaje del cliente
 * @param {string} sessionId - ID de la sesión (master)
 * @returns {Promise<Object>} { response: string, completed: boolean, cancelled: boolean }
 */
export async function handleConfigurationStep(clientId, message, sessionId) {
  const configSession = configurationSessions.get(clientId);
  
  if (!configSession) {
    return { response: null, completed: false, cancelled: false };
  }
  
  const messageLower = message.toLowerCase().trim();
  
  // Comando cancelar
  if (messageLower === 'cancelar' || messageLower === 'cancel') {
    configurationSessions.delete(clientId);
    logSession(sessionId, `❌ Configuración cancelada por cliente ${clientId}`);
    return {
      response: '❌ Configuración cancelada. Puedes volver a configurar cuando quieras escribiendo "configurar".',
      completed: false,
      cancelled: true
    };
  }
  
  // Si está esperando confirmación, manejar confirmación
  if (configSession.waitingConfirmation) {
    return await handleConfirmation(clientId, message, sessionId);
  }
  
  // Si está editando una opción parcialmente, manejar la edición
  if (configSession.editingOption) {
    const optionKey = configSession.editingOption;
    try {
      const { validateBotMessage } = await import('../utils/validation/messageValidator.js');
      validateBotMessage(message, { maxLength: 2000 });
    } catch (validationError) {
      if (validationError instanceof ValidationError) {
        return {
          response: `❌ ${validationError.message}\n\nPor favor, envía un mensaje válido.`,
          completed: false,
          cancelled: false
        };
      }
    }
    
    // Guardar la opción editada
    updateOption(configSession.data, optionKey, message.trim());
    
    // Volver al paso anterior o avanzar
    const previousStep = configSession.previousStep;
    delete configSession.editingOption;
    delete configSession.previousStep;
    
    // Si estaba en el último paso, mostrar confirmación
    if (previousStep === ConfigStep.OPTION_4 || configSession.step === ConfigStep.OPTION_4) {
      return await showPreviewAndConfirm(clientId, sessionId);
    }
    
    // Volver al paso donde estaba
    configSession.step = previousStep || ConfigStep.OPTION_1;
    
    return {
      response: `✅ Opción ${optionKey} actualizada.\n\nContinúa con la configuración o escribe 'ver' para ver la vista previa.`,
      completed: false,
      cancelled: false
    };
  }
  
  // Comando saltar
  if (messageLower === 'saltar' || messageLower === 'skip') {
    return await advanceToNextStep(clientId, null, sessionId);
  }
  
  // Comandos especiales para edición parcial y vista previa
  if (messageLower === 'ver' || messageLower === 'preview' || messageLower === 'vista previa') {
    return await showPreview(clientId, sessionId);
  }
  
  if (messageLower.startsWith('editar ') || messageLower.startsWith('edit ')) {
    const optionKey = messageLower.split(' ')[1];
    if (['1', '2', '3', '4'].includes(optionKey)) {
      return await startPartialEdit(clientId, optionKey, sessionId);
    }
  }
  
  // Validar mensaje antes de procesar
  try {
    const { validateBotMessage } = await import('../utils/validation/messageValidator.js');
    validateBotMessage(message, { maxLength: 2000 });
  } catch (validationError) {
    if (validationError instanceof ValidationError) {
      return {
        response: `❌ ${validationError.message}\n\nPor favor, envía un mensaje válido (mínimo 3 caracteres, máximo 2000 caracteres).`,
        completed: false,
        cancelled: false
      };
    }
  }
  
  // Procesar según el paso actual
  switch (configSession.step) {
    case ConfigStep.WELCOME:
      configSession.data.welcome_message = message.trim();
      return await advanceToNextStep(clientId, ConfigStep.OPTION_1_LABEL, sessionId);
      
    case ConfigStep.OPTION_1_LABEL:
      updateOption(configSession.data, '1', message.trim(), true);
      return await advanceToNextStep(clientId, ConfigStep.OPTION_1, sessionId);
      
    case ConfigStep.OPTION_1:
      updateOption(configSession.data, '1', message.trim(), false);
      return await advanceToNextStep(clientId, ConfigStep.OPTION_2_LABEL, sessionId);
      
    case ConfigStep.OPTION_2_LABEL:
      updateOption(configSession.data, '2', message.trim(), true);
      return await advanceToNextStep(clientId, ConfigStep.OPTION_2, sessionId);
      
    case ConfigStep.OPTION_2:
      updateOption(configSession.data, '2', message.trim(), false);
      return await advanceToNextStep(clientId, ConfigStep.OPTION_3_LABEL, sessionId);
      
    case ConfigStep.OPTION_3_LABEL:
      updateOption(configSession.data, '3', message.trim(), true);
      return await advanceToNextStep(clientId, ConfigStep.OPTION_3, sessionId);
      
    case ConfigStep.OPTION_3:
      updateOption(configSession.data, '3', message.trim(), false);
      return await advanceToNextStep(clientId, ConfigStep.OPTION_4_LABEL, sessionId);
      
    case ConfigStep.OPTION_4_LABEL:
      updateOption(configSession.data, '4', message.trim(), true);
      return await advanceToNextStep(clientId, ConfigStep.OPTION_4, sessionId);
      
    case ConfigStep.OPTION_4:
      updateOption(configSession.data, '4', message.trim(), false);
      // Mostrar vista previa antes de completar
      return await showPreviewAndConfirm(clientId, sessionId);
      
    default:
      // Si llegamos aquí, el paso no es reconocido
      // Devolver mensaje de ayuda recordando en qué paso está
      return getCurrentStepHelpMessage(clientId, sessionId);
  }
}

/**
 * Genera un mensaje de ayuda recordando en qué paso está el usuario
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Mensaje de ayuda
 */
export async function getCurrentStepHelpMessage(clientId, sessionId) {
  const configSession = configurationSessions.get(clientId);
  
  if (!configSession) {
    return { response: null, completed: false, cancelled: false };
  }
  
  const stepMessages = {
    [ConfigStep.WELCOME]: {
      title: 'PASO 1: Mensaje de Bienvenida',
      description: 'Envía el mensaje que quieres que aparezca cuando alguien escriba por primera vez a tu bot.',
      current: configSession.data.welcome_message
    },
    [ConfigStep.OPTION_1_LABEL]: {
      title: 'PASO 2: Texto de Opción 1',
      description: 'Envía el texto que quieres que aparezca en el menú para la opción 1.\n\nEjemplo: "Consultar precios" o "Ver productos"',
      current: getCurrentLabel(configSession.data, '1')
    },
    [ConfigStep.OPTION_1]: {
      title: 'PASO 3: Respuesta de Opción 1',
      description: 'Envía el mensaje que quieres que aparezca cuando un usuario escriba "1".',
      current: getCurrentOption(configSession.data, '1')
    },
    [ConfigStep.OPTION_2_LABEL]: {
      title: 'PASO 4: Texto de Opción 2',
      description: 'Envía el texto que quieres que aparezca en el menú para la opción 2.\n\nEjemplo: "Información de trabajos" o "Ver portafolio"',
      current: getCurrentLabel(configSession.data, '2')
    },
    [ConfigStep.OPTION_2]: {
      title: 'PASO 5: Respuesta de Opción 2',
      description: 'Envía el mensaje que quieres que aparezca cuando un usuario escriba "2".',
      current: getCurrentOption(configSession.data, '2')
    },
    [ConfigStep.OPTION_3_LABEL]: {
      title: 'PASO 6: Texto de Opción 3',
      description: 'Envía el texto que quieres que aparezca en el menú para la opción 3.\n\nEjemplo: "Ver página web" o "Contacto"',
      current: getCurrentLabel(configSession.data, '3')
    },
    [ConfigStep.OPTION_3]: {
      title: 'PASO 7: Respuesta de Opción 3',
      description: 'Envía el mensaje que quieres que aparezca cuando un usuario escriba "3".',
      current: getCurrentOption(configSession.data, '3')
    },
    [ConfigStep.OPTION_4_LABEL]: {
      title: 'PASO 8: Texto de Opción 4',
      description: 'Envía el texto que quieres que aparezca en el menú para la opción 4.\n\nEjemplo: "Hablar con agente" o "Soporte"',
      current: getCurrentLabel(configSession.data, '4')
    },
    [ConfigStep.OPTION_4]: {
      title: 'PASO 9: Respuesta de Opción 4',
      description: 'Envía el mensaje que quieres que aparezca cuando un usuario escriba "4".',
      current: getCurrentOption(configSession.data, '4')
    }
  };
  
  const stepInfo = stepMessages[configSession.step];
  
  if (!stepInfo) {
    return { response: null, completed: false, cancelled: false };
  }
  
  return {
    response: `📝 *${stepInfo.title}*\n\nEstamos esperando: ${stepInfo.description}\n\n💡 *Comandos disponibles:*\n• 'saltar' - Mantener mensaje actual\n• 'cancelar' - Salir sin guardar\n• 'ver' - Ver vista previa del menú\n• 'editar [1-4]' - Editar una opción específica\n\n*Mensaje actual:* ${stepInfo.current ? `"${stepInfo.current.substring(0, 80)}${stepInfo.current.length > 80 ? '...' : ''}"` : 'No configurado'}`,
    completed: false,
    cancelled: false
  };
}

/**
 * Avanza al siguiente paso del flujo
 * @param {number} clientId - ID del cliente
 * @param {string} nextStep - Siguiente paso
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta para el cliente
 */
async function advanceToNextStep(clientId, nextStep, sessionId) {
  const configSession = configurationSessions.get(clientId);
  
  if (!nextStep) {
    // Avanzar automáticamente al siguiente paso
    const steps = [
      ConfigStep.WELCOME,
      ConfigStep.OPTION_1_LABEL,
      ConfigStep.OPTION_1,
      ConfigStep.OPTION_2_LABEL,
      ConfigStep.OPTION_2,
      ConfigStep.OPTION_3_LABEL,
      ConfigStep.OPTION_3,
      ConfigStep.OPTION_4_LABEL,
      ConfigStep.OPTION_4
    ];
    const currentIndex = steps.indexOf(configSession.step);
    nextStep = steps[currentIndex + 1] || ConfigStep.COMPLETED;
  }
  
  if (nextStep === ConfigStep.COMPLETED) {
    return await completeConfiguration(clientId, sessionId);
  }
  
  configSession.step = nextStep;
  
  const stepMessages = {
    [ConfigStep.OPTION_1_LABEL]: {
      title: 'PASO 2: Texto de Opción 1',
      description: 'Envía el texto que quieres que aparezca en el menú para la opción 1.\n\nEjemplo: "Consultar precios" o "Ver productos"',
      current: getCurrentLabel(configSession.data, '1')
    },
    [ConfigStep.OPTION_1]: {
      title: 'PASO 3: Respuesta de Opción 1',
      description: 'Envía el mensaje que quieres que aparezca cuando un usuario escriba "1".',
      current: getCurrentOption(configSession.data, '1')
    },
    [ConfigStep.OPTION_2_LABEL]: {
      title: 'PASO 4: Texto de Opción 2',
      description: 'Envía el texto que quieres que aparezca en el menú para la opción 2.\n\nEjemplo: "Información de trabajos" o "Ver portafolio"',
      current: getCurrentLabel(configSession.data, '2')
    },
    [ConfigStep.OPTION_2]: {
      title: 'PASO 5: Respuesta de Opción 2',
      description: 'Envía el mensaje que quieres que aparezca cuando un usuario escriba "2".',
      current: getCurrentOption(configSession.data, '2')
    },
    [ConfigStep.OPTION_3_LABEL]: {
      title: 'PASO 6: Texto de Opción 3',
      description: 'Envía el texto que quieres que aparezca en el menú para la opción 3.\n\nEjemplo: "Ver página web" o "Contacto"',
      current: getCurrentLabel(configSession.data, '3')
    },
    [ConfigStep.OPTION_3]: {
      title: 'PASO 7: Respuesta de Opción 3',
      description: 'Envía el mensaje que quieres que aparezca cuando un usuario escriba "3".',
      current: getCurrentOption(configSession.data, '3')
    },
    [ConfigStep.OPTION_4_LABEL]: {
      title: 'PASO 8: Texto de Opción 4',
      description: 'Envía el texto que quieres que aparezca en el menú para la opción 4.\n\nEjemplo: "Hablar con agente" o "Soporte"',
      current: getCurrentLabel(configSession.data, '4')
    },
    [ConfigStep.OPTION_4]: {
      title: 'PASO 9: Respuesta de Opción 4',
      description: 'Envía el mensaje que quieres que aparezca cuando un usuario escriba "4".',
      current: getCurrentOption(configSession.data, '4')
    }
  };
  
  const stepInfo = stepMessages[nextStep];
  const savedMessage = configSession.step !== nextStep ? '✅ Guardado.\n\n' : '';
  
  return {
    response: `${savedMessage}📝 *${stepInfo.title}*\n${stepInfo.description}\n\n💡 *Comandos disponibles:*\n• 'saltar' - Mantener mensaje actual\n• 'cancelar' - Salir sin guardar\n• 'ver' - Ver vista previa del menú\n• 'editar [1-4]' - Editar una opción específica\n\n*Mensaje actual:* ${stepInfo.current ? `"${stepInfo.current.substring(0, 80)}${stepInfo.current.length > 80 ? '...' : ''}"` : 'No configurado'}`,
    completed: false,
    cancelled: false
  };
}

/**
 * Completa la configuración y guarda en la base de datos
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta final
 */
async function completeConfiguration(clientId, sessionId) {
  const configSession = configurationSessions.get(clientId);
  
  if (!configSession) {
    return { response: null, completed: false, cancelled: false };
  }
  
  // Construir estructura de menu_options usando los labels y responses guardados
  const menuOptions = {
    options: [
      { 
        key: '1', 
        label: getCurrentLabel(configSession.data, '1') || 'Opción 1', 
        response: getCurrentOption(configSession.data, '1') || '' 
      },
      { 
        key: '2', 
        label: getCurrentLabel(configSession.data, '2') || 'Opción 2', 
        response: getCurrentOption(configSession.data, '2') || '' 
      },
      { 
        key: '3', 
        label: getCurrentLabel(configSession.data, '3') || 'Opción 3', 
        response: getCurrentOption(configSession.data, '3') || '' 
      },
      { 
        key: '4', 
        label: getCurrentLabel(configSession.data, '4') || 'Opción 4', 
        response: getCurrentOption(configSession.data, '4') || '' 
      }
    ],
    default_response: configSession.data.welcome_message || ''
  };
  
  // Guardar en base de datos
  try {
    // Necesitamos obtener el sessionId del cliente (no del master)
    const db = getPrisma();
    const client = await db.client.findUnique({
      where: { id: clientId },
      include: {
        sessions: {
          where: { session_type: 'client' },
          take: 1
        }
      }
    });
    
    const clientSessionId = client?.sessions[0]?.session_name;
    
    if (clientSessionId) {
      // Validar configuración antes de guardar
      const { validateClientConfig } = await import('../utils/validation/configValidator.js');
      try {
        validateClientConfig({
          welcome_message: configSession.data.welcome_message,
          menu_options: menuOptions
        });
      } catch (validationError) {
        logSession(sessionId, `❌ Error de validación en configuración: ${validationError?.message || validationError}`);
        return {
          response: `❌ *Error de validación*\n\n${validationError.message}\n\nPor favor, corrige los errores y vuelve a intentar.`,
          completed: false,
          cancelled: false
        };
      }
      
      await updateClientConfig(clientSessionId, {
        welcome_message: configSession.data.welcome_message,
        menu_options: menuOptions
      });
      
      // Limpiar cache
      clearConfigCache(clientSessionId);
      
      logSession(sessionId, `✅ Configuración completada y guardada para cliente ${clientId}`);
    }
  } catch (error) {
    logSession(sessionId, `❌ Error guardando configuración: ${error?.message || error}`);
  }
  
  // Eliminar sesión de configuración
  configurationSessions.delete(clientId);
  
  const summary = `
✅ *¡Configuración completada y guardada!*

📋 *Resumen de lo configurado:*
• Mensaje de bienvenida: ${configSession.data.welcome_message ? '✅' : '⏭️'}
• Opción 1: ${getCurrentOption(configSession.data, '1') ? '✅' : '⏭️'}
• Opción 2: ${getCurrentOption(configSession.data, '2') ? '✅' : '⏭️'}
• Opción 3: ${getCurrentOption(configSession.data, '3') ? '✅' : '⏭️'}
• Opción 4: ${getCurrentOption(configSession.data, '4') ? '✅' : '⏭️'}

🎉 Los cambios se aplicarán inmediatamente. Puedes probar enviando un mensaje a tu bot.

💡 Escribe "configurar" nuevamente si quieres modificar algo.`;
  
  return {
    response: summary,
    completed: true,
    cancelled: false
  };
}

/**
 * Verifica si un cliente está en modo configuración
 * @param {number} clientId - ID del cliente
 * @returns {boolean} true si está en modo configuración
 */
export function isInConfigurationMode(clientId) {
  return configurationSessions.has(clientId);
}

/**
 * Obtiene el paso actual de configuración
 * @param {number} clientId - ID del cliente
 * @returns {string|null} Paso actual o null
 */
export function getConfigurationStep(clientId) {
  const session = configurationSessions.get(clientId);
  return session?.step || null;
}

/**
 * Actualiza una opción en los datos de configuración
 * @param {Object} data - Datos de configuración
 * @param {string} key - Clave de la opción ('1', '2', '3', '4')
 * @param {string} message - Mensaje de la opción
 */
function updateOption(data, key, message, isLabel = false) {
  if (!data.options) {
    data.options = [];
  }
  
  const existingIndex = data.options.findIndex(opt => opt.key === key);
  let option;
  
  if (existingIndex >= 0) {
    option = { ...data.options[existingIndex] };
    if (isLabel) {
      option.label = message;
    } else {
      option.response = message;
    }
    data.options[existingIndex] = option;
  } else {
    option = {
      key,
      label: isLabel ? message : `Opción ${key}`,
      response: isLabel ? '' : message
    };
    data.options.push(option);
  }
}

/**
 * Obtiene el mensaje actual de una opción
 * @param {Object} data - Datos de configuración
 * @param {string} key - Clave de la opción
 * @returns {string|null} Mensaje actual o null
 */
function getCurrentOption(data, key) {
  if (!data.options) return null;
  const option = data.options.find(opt => opt.key === key);
  return option?.response || null;
}

/**
 * Obtiene el label actual de una opción
 * @param {Object} data - Datos de configuración
 * @param {string} key - Clave de la opción
 * @returns {string|null} Label actual o null
 */
function getCurrentLabel(data, key) {
  if (!data.options) return null;
  const option = data.options.find(opt => opt.key === key);
  return option?.label || null;
}

/**
 * Cancela el modo configuración para un cliente
 * @param {number} clientId - ID del cliente
 */
export function cancelConfiguration(clientId) {
  configurationSessions.delete(clientId);
}

/**
 * Muestra una vista previa del menú configurado
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta con vista previa
 */
async function showPreview(clientId, sessionId) {
  const configSession = configurationSessions.get(clientId);
  
  if (!configSession) {
    return { response: null, completed: false, cancelled: false };
  }
  
  const welcome = configSession.data.welcome_message || 'No configurado';
  const label1 = getCurrentLabel(configSession.data, '1') || 'Opción 1';
  const label2 = getCurrentLabel(configSession.data, '2') || 'Opción 2';
  const label3 = getCurrentLabel(configSession.data, '3') || 'Opción 3';
  const label4 = getCurrentLabel(configSession.data, '4') || 'Opción 4';
  
  const option1 = getCurrentOption(configSession.data, '1') || 'No configurado';
  const option2 = getCurrentOption(configSession.data, '2') || 'No configurado';
  const option3 = getCurrentOption(configSession.data, '3') || 'No configurado';
  const option4 = getCurrentOption(configSession.data, '4') || 'No configurado';
  
  const preview = `👁️ *Vista Previa del Menú*

📝 *Mensaje de Bienvenida:*
${welcome.substring(0, 150)}${welcome.length > 150 ? '...' : ''}

📋 *Opciones del Menú:*

*1️⃣ ${label1}:*
${option1.substring(0, 100)}${option1.length > 100 ? '...' : ''}

*2️⃣ ${label2}:*
${option2.substring(0, 100)}${option2.length > 100 ? '...' : ''}

*3️⃣ ${label3}:*
${option3.substring(0, 100)}${option3.length > 100 ? '...' : ''}

*4️⃣ ${label4}:*
${option4.substring(0, 100)}${option4.length > 100 ? '...' : ''}

💡 *Comandos:*
• Continúa escribiendo para seguir configurando
• 'editar [1-4]' - Editar una opción específica
• 'cancelar' - Salir sin guardar`;
  
  return {
    response: preview,
    completed: false,
    cancelled: false
  };
}

/**
 * Muestra vista previa y solicita confirmación antes de guardar
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta con confirmación
 */
async function showPreviewAndConfirm(clientId, sessionId) {
  const configSession = configurationSessions.get(clientId);
  
  if (!configSession) {
    return { response: null, completed: false, cancelled: false };
  }
  
  // Cambiar a modo de confirmación
  configSession.step = ConfigStep.COMPLETED;
  configSession.waitingConfirmation = true;
  
  const preview = await showPreview(clientId, sessionId);
  
  return {
    response: `${preview.response}\n\n✅ *¿Guardar esta configuración?*\n\nEscribe 'guardar' o 'si' para confirmar, o 'cancelar' para salir sin guardar.`,
    completed: false,
    cancelled: false
  };
}

/**
 * Inicia la edición parcial de una opción específica
 * @param {number} clientId - ID del cliente
 * @param {string} optionKey - Clave de la opción ('1', '2', '3', '4')
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta para editar
 */
async function startPartialEdit(clientId, optionKey, sessionId) {
  const configSession = configurationSessions.get(clientId);
  
  if (!configSession) {
    return { response: null, completed: false, cancelled: false };
  }
  
  const currentMessage = getCurrentOption(configSession.data, optionKey);
  
  // Guardar el paso anterior para volver después
  configSession.previousStep = configSession.step;
  configSession.editingOption = optionKey;
  
  // Cambiar al paso correspondiente
  const stepMap = {
    '1': ConfigStep.OPTION_1,
    '2': ConfigStep.OPTION_2,
    '3': ConfigStep.OPTION_3,
    '4': ConfigStep.OPTION_4
  };
  
  configSession.step = stepMap[optionKey];
  
  return {
    response: `✏️ *Editando Opción ${optionKey}*\n\nEnvía el nuevo mensaje para la opción ${optionKey}.\n\n💡 *Comandos:*\n• 'saltar' - Mantener mensaje actual\n• 'cancelar' - Volver sin cambios\n\n*Mensaje actual:* ${currentMessage ? `"${currentMessage.substring(0, 80)}${currentMessage.length > 80 ? '...' : ''}"` : 'No configurado'}`,
    completed: false,
    cancelled: false
  };
}

/**
 * Maneja la confirmación para guardar la configuración
 * @param {number} clientId - ID del cliente
 * @param {string} message - Mensaje del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Resultado de la confirmación
 */
export async function handleConfirmation(clientId, message, sessionId) {
  const configSession = configurationSessions.get(clientId);
  
  if (!configSession || !configSession.waitingConfirmation) {
    return { response: null, completed: false, cancelled: false };
  }
  
  const messageLower = message.toLowerCase().trim();
  
  if (messageLower === 'guardar' || messageLower === 'si' || messageLower === 'sí' || messageLower === 'yes') {
    return await completeConfiguration(clientId, sessionId);
  }
  
  if (messageLower === 'cancelar' || messageLower === 'cancel' || messageLower === 'no') {
    configurationSessions.delete(clientId);
    return {
      response: '❌ Configuración cancelada. No se guardaron cambios.',
      completed: false,
      cancelled: true
    };
  }
  
  return {
    response: '❓ No entendí. Escribe "guardar" o "si" para confirmar, o "cancelar" para salir sin guardar.',
    completed: false,
    cancelled: false
  };
}

