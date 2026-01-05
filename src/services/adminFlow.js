// Servicio para manejar el flujo de administración desde WhatsApp
import { logSession } from '../utils/logger/index.js';
import { getPrisma } from '../config/database.js';
import { getGlobalSessionManager } from './sessionManager/global.js';
import { loadSessions } from '../utils/menu/sessionHelpers.js';
import { BOT_MESSAGE_REGISTER_DELAY } from '../config/constants.js';

// Estados del flujo de administración
export const AdminStep = {
  IDLE: 'idle',
  MAIN_MENU: 'main_menu',
  ADD_SESSION_TYPE: 'add_session_type',
  ADD_SESSION_NAME: 'add_session_name',
  REMOVE_SESSION_SELECT: 'remove_session_select',
  UPDATE_SESSION_SELECT: 'update_session_select',
  UPDATE_SESSION_FIELD: 'update_session_field',
  START_SESSION_SELECT: 'start_session_select',
  REGENERATE_QR_SELECT: 'regenerate_qr_select',
  COMPLETED: 'completed'
};

// Mapa de sesiones en modo administración: phoneNumber -> { step, data }
const adminSessions = new Map();

/**
 * Verifica si un número de teléfono es el dueño del número maestro
 * @param {string} phoneNumber - Número de teléfono del destinatario (cuando fromMe=true, es msg.to)
 * @param {string} sessionId - ID de la sesión (master)
 * @returns {Promise<boolean>} true si es el dueño
 */
export async function isOwnerPhone(phoneNumber, sessionId) {
  try {
    const sessionManager = getGlobalSessionManager();
    if (!sessionManager) {
      return false;
    }
    
    const sessionData = sessionManager.getSession(sessionId);
    if (!sessionData || !sessionData.client) {
      return false;
    }
    
    // Obtener el número del master desde la sesión
    const masterPhone = sessionData.client.info?.wid?.user;
    if (!masterPhone) {
      // Si no hay info del cliente aún, intentar obtenerlo de la DB
      try {
        const { getSessionByName } = await import('../database/sessionService.js');
        const session = await getSessionByName(sessionId);
        if (session?.phone_number) {
          const normalizedPhone = phoneNumber.replace('@c.us', '').replace(/[^0-9]/g, '');
          const normalizedMaster = session.phone_number.replace(/[^0-9]/g, '');
          return normalizedPhone === normalizedMaster;
        }
      } catch (dbError) {
        // Continuar con el método anterior
      }
      return false;
    }
    
    // Comparar números (normalizar sin @c.us y sin caracteres especiales)
    const normalizedPhone = phoneNumber.replace('@c.us', '').replace(/[^0-9]/g, '');
    const normalizedMaster = masterPhone.replace('@c.us', '').replace(/[^0-9]/g, '');
    
    const isMatch = normalizedPhone === normalizedMaster;
    logSession(sessionId, `🔍 Verificando si es dueño: ${normalizedPhone} === ${normalizedMaster} = ${isMatch}`);
    
    return isMatch;
  } catch (error) {
    logSession(sessionId, `⚠️ Error verificando si es dueño: ${error?.message || error}`);
    return false;
  }
}

/**
 * Inicia el modo administración para el dueño
 * @param {string} phoneNumber - Número de teléfono del dueño
 * @param {string} sessionId - ID de la sesión (master)
 * @returns {Promise<string>} Mensaje de inicio
 */
export async function startAdminFlow(phoneNumber, sessionId) {
  logSession(sessionId, `🔐 Iniciando modo administración para ${phoneNumber}`);
  
  adminSessions.set(phoneNumber, {
    step: AdminStep.MAIN_MENU,
    sessionId,
    startedAt: Date.now()
  });
  
  return await showMainMenu(phoneNumber, sessionId);
}

/**
 * Muestra el menú principal de administración
 * @param {string} phoneNumber - Número de teléfono del dueño
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<string>} Mensaje del menú
 */
async function showMainMenu(phoneNumber, sessionId) {
  const sessions = await loadSessions();
  const sessionManager = getGlobalSessionManager();
  const isBotRunning = !!sessionManager;
  
  let menuText = `🔐 *MENÚ DE ADMINISTRACIÓN*\n\n`;
  menuText += `📋 *Opciones disponibles:*\n\n`;
  menuText += `1️⃣ Ver clientes configurados\n`;
  menuText += `2️⃣ Agregar nuevo cliente/sesión\n`;
  menuText += `3️⃣ Iniciar sesión de un cliente\n`;
  menuText += `4️⃣ Cambiar WhatsApp de un cliente\n`;
  menuText += `5️⃣ Actualizar cliente existente\n`;
  menuText += `6️⃣ Eliminar cliente completamente\n`;
  menuText += `\n0️⃣ Salir del menú de administración\n`;
  menuText += `\n💡 *Total de sesiones:* ${sessions.length}`;
  if (isBotRunning) {
    menuText += `\n✅ Bot está corriendo - Los cambios se aplicarán inmediatamente`;
  }
  menuText += `\n\n*Escribe el número de la opción que quieres realizar.*`;
  
  return menuText;
}

/**
 * Procesa un paso del flujo de administración
 * @param {string} phoneNumber - Número de teléfono del dueño
 * @param {string} message - Mensaje del dueño
 * @param {string} sessionId - ID de la sesión (master)
 * @returns {Promise<Object>} { response: string, completed: boolean, cancelled: boolean }
 */
export async function handleAdminStep(phoneNumber, message, sessionId) {
  const adminSession = adminSessions.get(phoneNumber);
  
  if (!adminSession) {
    return { response: null, completed: false, cancelled: false };
  }
  
  const messageLower = message.toLowerCase().trim();
  
  // Comando cancelar/salir
  if (messageLower === '0' || messageLower === 'salir' || messageLower === 'cancelar' || messageLower === 'exit') {
    adminSessions.delete(phoneNumber);
    logSession(sessionId, `🔐 Modo administración cancelado por ${phoneNumber}`);
    
    // Cuando se sale del modo admin, el bot puede volver a pausarse normalmente si el dueño envía mensajes
    // Esto se maneja automáticamente por markChatAsHumanManaged
    return {
      response: '✅ Saliste del menú de administración.\n\nEl bot volverá a pausarse automáticamente si envías mensajes.\n\nEscribe "admin" o "gestionar" para volver a entrar.',
      completed: false,
      cancelled: true
    };
  }
  
  // Procesar según el paso actual
  switch (adminSession.step) {
    case AdminStep.MAIN_MENU:
      return await handleMainMenuChoice(phoneNumber, messageLower, sessionId);
    
    case AdminStep.ADD_SESSION_TYPE:
      return await handleAddSessionType(phoneNumber, messageLower, sessionId);
    
    case AdminStep.ADD_SESSION_NAME:
      return await handleAddSessionName(phoneNumber, message, sessionId);
    
    case AdminStep.REMOVE_SESSION_SELECT:
      return await handleRemoveSessionSelect(phoneNumber, messageLower, sessionId);
    
    case AdminStep.UPDATE_SESSION_SELECT:
      return await handleUpdateSessionSelect(phoneNumber, messageLower, sessionId);
    
    case AdminStep.UPDATE_SESSION_FIELD:
      return await handleUpdateSessionField(phoneNumber, message, sessionId);
    
    case AdminStep.START_SESSION_SELECT:
      return await handleStartSessionSelect(phoneNumber, messageLower, sessionId);
    
    case AdminStep.REGENERATE_QR_SELECT:
      return await handleRegenerateQRSelect(phoneNumber, messageLower, sessionId);
    
    default:
      return { response: null, completed: false, cancelled: false };
  }
}

/**
 * Maneja la elección del menú principal
 */
async function handleMainMenuChoice(phoneNumber, messageLower, sessionId) {
  const adminSession = adminSessions.get(phoneNumber);
  
  switch (messageLower) {
    case '1':
    case 'listar':
    case 'ver':
      return await handleListSessions(phoneNumber, sessionId);
    
    case '2':
    case 'agregar':
    case 'nuevo':
      adminSession.step = AdminStep.ADD_SESSION_TYPE;
      return {
        response: `➕ *Agregar Nueva Sesión*\n\n¿Qué tipo de sesión quieres crear?\n\n1️⃣ Número Maestro (Empresa)\n2️⃣ Número de Cliente\n\n0️⃣ Volver al menú principal`,
        completed: false,
        cancelled: false
      };
    
    case '3':
    case 'iniciar':
    case 'start':
      adminSession.step = AdminStep.START_SESSION_SELECT;
      return await showSessionList(phoneNumber, sessionId, 'start');
    
    case '4':
    case 'cambiar':
    case 'reconectar':
      adminSession.step = AdminStep.REGENERATE_QR_SELECT;
      return await showSessionList(phoneNumber, sessionId, 'regenerate');
    
    case '5':
    case 'actualizar':
    case 'update':
      adminSession.step = AdminStep.UPDATE_SESSION_SELECT;
      return await showSessionList(phoneNumber, sessionId, 'update');
    
    case '6':
    case 'eliminar':
    case 'borrar':
      adminSession.step = AdminStep.REMOVE_SESSION_SELECT;
      return await showSessionList(phoneNumber, sessionId, 'remove');
    
    default:
      return {
        response: `❌ Opción no válida.\n\n${await showMainMenu(phoneNumber, sessionId)}`,
        completed: false,
        cancelled: false
      };
  }
}

/**
 * Lista todas las sesiones configuradas
 */
async function handleListSessions(phoneNumber, sessionId) {
  const sessions = await loadSessions();
  const adminSession = adminSessions.get(phoneNumber);
  
  if (sessions.length === 0) {
    adminSession.step = AdminStep.MAIN_MENU;
    return {
      response: `📋 *Sesiones Configuradas*\n\n⚠️ No hay sesiones configuradas.\n\n${await showMainMenu(phoneNumber, sessionId)}`,
      completed: false,
      cancelled: false
    };
  }
  
  // Obtener información de la base de datos
  const sessionInfo = new Map();
  try {
    const db = getPrisma();
    const dbSessions = await db.whatsAppSession.findMany({
      where: { session_name: { in: sessions } },
      select: { session_name: true, session_type: true }
    });
    
    dbSessions.forEach(s => {
      sessionInfo.set(s.session_name, s.session_type);
    });
  } catch (err) {
    // Continuar sin información de tipo
  }
  
  let response = `📋 *Sesiones Configuradas*\n\n`;
  
  // Separar maestros y clientes
  const masters = [];
  const clients = [];
  
  sessions.forEach((session) => {
    const type = sessionInfo.get(session) || 'client';
    if (type === 'master') {
      masters.push(session);
    } else {
      clients.push(session);
    }
  });
  
  if (masters.length > 0) {
    response += `📞 *NÚMEROS MAESTRO:*\n`;
    masters.forEach((s, i) => {
      response += `   ${i + 1}. ${s} 🔑\n`;
    });
    response += `\n`;
  }
  
  if (clients.length > 0) {
    response += `👤 *CLIENTES:*\n`;
    clients.forEach((s, i) => {
      response += `   ${i + 1}. ${s}\n`;
    });
  }
  
  response += `\n${await showMainMenu(phoneNumber, sessionId)}`;
  adminSession.step = AdminStep.MAIN_MENU;
  
  return {
    response,
    completed: false,
    cancelled: false
  };
}

/**
 * Muestra lista de sesiones para selección
 */
async function showSessionList(phoneNumber, sessionId, action) {
  const sessions = await loadSessions();
  const adminSession = adminSessions.get(phoneNumber);
  
  if (sessions.length === 0) {
    adminSession.step = AdminStep.MAIN_MENU;
    return {
      response: `⚠️ No hay sesiones configuradas.\n\n${await showMainMenu(phoneNumber, sessionId)}`,
      completed: false,
      cancelled: false
    };
  }
  
  // Guardar la acción para usarla después
  adminSession.action = action;
  adminSession.sessionList = sessions;
  
  let response = `📋 *Selecciona una sesión:*\n\n`;
  sessions.forEach((s, i) => {
    response += `${i + 1}. ${s}\n`;
  });
  response += `\n0️⃣ Volver al menú principal\n`;
  response += `\n*Escribe el número de la sesión que quieres ${action === 'start' ? 'iniciar' : action === 'regenerate' ? 'cambiar' : action === 'update' ? 'actualizar' : 'eliminar'}.*`;
  
  return {
    response,
    completed: false,
    cancelled: false
  };
}

/**
 * Maneja la selección de tipo de sesión para agregar
 */
async function handleAddSessionType(phoneNumber, messageLower, sessionId) {
  const adminSession = adminSessions.get(phoneNumber);
  
  if (messageLower === '0') {
    adminSession.step = AdminStep.MAIN_MENU;
    return {
      response: await showMainMenu(phoneNumber, sessionId),
      completed: false,
      cancelled: false
    };
  }
  
  if (messageLower === '1' || messageLower === 'maestro' || messageLower === 'master') {
    adminSession.data = { sessionType: 'master' };
    adminSession.step = AdminStep.ADD_SESSION_NAME;
    return {
      response: `📞 *Agregar Número Maestro*\n\nIngresa el nombre del número maestro (sin espacios, solo letras, números y guiones):\n\nEjemplo: unikuo4, master1\n\n0️⃣ Volver`,
      completed: false,
      cancelled: false
    };
  }
  
  if (messageLower === '2' || messageLower === 'cliente' || messageLower === 'client') {
    adminSession.data = { sessionType: 'client' };
    adminSession.step = AdminStep.ADD_SESSION_NAME;
    return {
      response: `👤 *Agregar Cliente*\n\nIngresa el nombre del cliente (sin espacios, solo letras, números y guiones):\n\nEjemplo: pablo, cliente1\n\n0️⃣ Volver`,
      completed: false,
      cancelled: false
    };
  }
  
  return {
    response: `❌ Opción no válida. Escribe 1 para Maestro o 2 para Cliente.\n\n0️⃣ Volver`,
    completed: false,
    cancelled: false
  };
}

/**
 * Maneja el nombre de sesión para agregar
 */
async function handleAddSessionName(phoneNumber, message, sessionId) {
  const adminSession = adminSessions.get(phoneNumber);
  
  if (message.toLowerCase() === '0') {
    adminSession.step = AdminStep.MAIN_MENU;
    return {
      response: await showMainMenu(phoneNumber, sessionId),
      completed: false,
      cancelled: false
    };
  }
  
  // Validar nombre
  const { validateSessionName } = await import('../utils/validation.js');
  const { ValidationError } = await import('../utils/errors.js');
  
  try {
    validateSessionName(message.trim());
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        response: `❌ ${error.message}\n\nPor favor, ingresa un nombre válido (sin espacios, solo letras, números y guiones).\n\n0️⃣ Volver`,
        completed: false,
        cancelled: false
      };
    }
  }
  
  // Verificar si ya existe
  const sessions = await loadSessions();
  if (sessions.includes(message.trim())) {
    return {
      response: `❌ Ya existe una sesión con ese nombre.\n\nPor favor, elige otro nombre.\n\n0️⃣ Volver`,
      completed: false,
      cancelled: false
    };
  }
  
  const sessionName = message.trim();
  const sessionType = adminSession.data.sessionType;
  const isMaster = sessionType === 'master';
  
  // Crear sesión usando la lógica del handler de terminal
  try {
    const { addSessionFromAdmin } = await import('./adminFlow/handlers/addSessionHandler.js');
    const result = await addSessionFromAdmin(sessionName, sessionType, sessionId);
    
    adminSession.step = AdminStep.MAIN_MENU;
    return {
      response: `${result}\n\n${await showMainMenu(phoneNumber, sessionId)}`,
      completed: false,
      cancelled: false
    };
  } catch (error) {
    logSession(sessionId, `❌ Error agregando sesión: ${error?.message || error}`);
    adminSession.step = AdminStep.MAIN_MENU;
    return {
      response: `❌ Error al agregar sesión: ${error?.message || 'Error desconocido'}\n\n${await showMainMenu(phoneNumber, sessionId)}`,
      completed: false,
      cancelled: false
    };
  }
}

/**
 * Maneja la selección de sesión para eliminar
 */
async function handleRemoveSessionSelect(phoneNumber, messageLower, sessionId) {
  const adminSession = adminSessions.get(phoneNumber);
  const sessions = adminSession.sessionList;
  
  if (messageLower === '0') {
    adminSession.step = AdminStep.MAIN_MENU;
    return {
      response: await showMainMenu(phoneNumber, sessionId),
      completed: false,
      cancelled: false
    };
  }
  
  const index = parseInt(messageLower) - 1;
  if (isNaN(index) || index < 0 || index >= sessions.length) {
    return {
      response: `❌ Número inválido. Por favor, elige un número del 1 al ${sessions.length}.\n\n0️⃣ Volver`,
      completed: false,
      cancelled: false
    };
  }
  
  const sessionName = sessions[index];
  
  // Confirmar eliminación
  adminSession.data = { sessionToRemove: sessionName };
  adminSession.step = AdminStep.MAIN_MENU; // Volver al menú después
  
  try {
    const { removeSessionFromAdmin } = await import('./adminFlow/handlers/removeSessionHandler.js');
    const result = await removeSessionFromAdmin(sessionName, sessionId);
    
    return {
      response: `${result}\n\n${await showMainMenu(phoneNumber, sessionId)}`,
      completed: false,
      cancelled: false
    };
  } catch (error) {
    logSession(sessionId, `❌ Error eliminando sesión: ${error?.message || error}`);
    return {
      response: `❌ Error al eliminar sesión: ${error?.message || 'Error desconocido'}\n\n${await showMainMenu(phoneNumber, sessionId)}`,
      completed: false,
      cancelled: false
    };
  }
}

/**
 * Maneja la selección de sesión para iniciar
 */
async function handleStartSessionSelect(phoneNumber, messageLower, sessionId) {
  const adminSession = adminSessions.get(phoneNumber);
  const sessions = adminSession.sessionList;
  
  if (messageLower === '0') {
    adminSession.step = AdminStep.MAIN_MENU;
    return {
      response: await showMainMenu(phoneNumber, sessionId),
      completed: false,
      cancelled: false
    };
  }
  
  const index = parseInt(messageLower) - 1;
  if (isNaN(index) || index < 0 || index >= sessions.length) {
    return {
      response: `❌ Número inválido. Por favor, elige un número del 1 al ${sessions.length}.\n\n0️⃣ Volver`,
      completed: false,
      cancelled: false
    };
  }
  
  const sessionName = sessions[index];
  adminSession.step = AdminStep.MAIN_MENU;
  
  try {
    const { startSessionFromAdmin } = await import('./adminFlow/handlers/startSessionHandler.js');
    const result = await startSessionFromAdmin(sessionName, sessionId);
    
    return {
      response: `${result}\n\n${await showMainMenu(phoneNumber, sessionId)}`,
      completed: false,
      cancelled: false
    };
  } catch (error) {
    logSession(sessionId, `❌ Error iniciando sesión: ${error?.message || error}`);
    return {
      response: `❌ Error al iniciar sesión: ${error?.message || 'Error desconocido'}\n\n${await showMainMenu(phoneNumber, sessionId)}`,
      completed: false,
      cancelled: false
    };
  }
}

/**
 * Maneja la selección de sesión para regenerar QR
 */
async function handleRegenerateQRSelect(phoneNumber, messageLower, sessionId) {
  const adminSession = adminSessions.get(phoneNumber);
  const sessions = adminSession.sessionList;
  
  if (messageLower === '0') {
    adminSession.step = AdminStep.MAIN_MENU;
    return {
      response: await showMainMenu(phoneNumber, sessionId),
      completed: false,
      cancelled: false
    };
  }
  
  const index = parseInt(messageLower) - 1;
  if (isNaN(index) || index < 0 || index >= sessions.length) {
    return {
      response: `❌ Número inválido. Por favor, elige un número del 1 al ${sessions.length}.\n\n0️⃣ Volver`,
      completed: false,
      cancelled: false
    };
  }
  
  const sessionName = sessions[index];
  adminSession.step = AdminStep.MAIN_MENU;
  
  try {
    const { regenerateQRFromAdmin } = await import('./adminFlow/handlers/regenerateQRHandler.js');
    const result = await regenerateQRFromAdmin(sessionName, sessionId);
    
    return {
      response: `${result}\n\n${await showMainMenu(phoneNumber, sessionId)}`,
      completed: false,
      cancelled: false
    };
  } catch (error) {
    logSession(sessionId, `❌ Error regenerando QR: ${error?.message || error}`);
    return {
      response: `❌ Error al regenerar QR: ${error?.message || 'Error desconocido'}\n\n${await showMainMenu(phoneNumber, sessionId)}`,
      completed: false,
      cancelled: false
    };
  }
}

/**
 * Maneja la selección de sesión para actualizar
 */
async function handleUpdateSessionSelect(phoneNumber, messageLower, sessionId) {
  const adminSession = adminSessions.get(phoneNumber);
  const sessions = adminSession.sessionList;
  
  if (messageLower === '0') {
    adminSession.step = AdminStep.MAIN_MENU;
    return {
      response: await showMainMenu(phoneNumber, sessionId),
      completed: false,
      cancelled: false
    };
  }
  
  const index = parseInt(messageLower) - 1;
  if (isNaN(index) || index < 0 || index >= sessions.length) {
    return {
      response: `❌ Número inválido. Por favor, elige un número del 1 al ${sessions.length}.\n\n0️⃣ Volver`,
      completed: false,
      cancelled: false
    };
  }
  
  const sessionName = sessions[index];
  adminSession.data = { sessionToUpdate: sessionName };
  adminSession.step = AdminStep.UPDATE_SESSION_FIELD;
  
  return {
    response: `✏️ *Actualizar Cliente: ${sessionName}*\n\n¿Qué quieres actualizar?\n\n1️⃣ Nombre del cliente\n2️⃣ Email de contacto\n3️⃣ Teléfono de contacto\n4️⃣ Estado (activo/inactivo)\n\n0️⃣ Volver`,
    completed: false,
    cancelled: false
  };
}

/**
 * Maneja la actualización de campo de sesión
 */
async function handleUpdateSessionField(phoneNumber, message, sessionId) {
  const adminSession = adminSessions.get(phoneNumber);
  
  if (message.toLowerCase() === '0') {
    adminSession.step = AdminStep.MAIN_MENU;
    return {
      response: await showMainMenu(phoneNumber, sessionId),
      completed: false,
      cancelled: false
    };
  }
  
  // Por ahora, simplificar: solo mostrar que está en desarrollo
  adminSession.step = AdminStep.MAIN_MENU;
  return {
    response: `⚠️ La actualización de clientes desde WhatsApp está en desarrollo.\n\nPor ahora, usa la terminal para actualizar clientes.\n\n${await showMainMenu(phoneNumber, sessionId)}`,
    completed: false,
    cancelled: false
  };
}

/**
 * Verifica si un usuario está en modo administración
 * @param {string} phoneNumber - Número de teléfono
 * @returns {boolean} true si está en modo administración
 */
export function isInAdminMode(phoneNumber) {
  return adminSessions.has(phoneNumber);
}

/**
 * Cancela el modo administración
 * @param {string} phoneNumber - Número de teléfono
 */
export function cancelAdminMode(phoneNumber) {
  adminSessions.delete(phoneNumber);
}

