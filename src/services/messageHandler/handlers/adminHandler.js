// Handler para lógica de administración desde WhatsApp
import { logSession } from '../../../utils/logger/index.js';

/**
 * Verifica si un mensaje contiene texto del menú del bot
 * @param {string} texto - Texto del mensaje
 * @returns {boolean} true si contiene texto del menú
 */
function isBotMenuText(texto) {
  const textoLower = texto.toLowerCase();
  const botMenuIndicators = [
    'menú de administración',
    'opciones disponibles',
    'total de sesiones',
    'bot está corriendo',
    'escribe el número',
    'selecciona una sesión',
    'agregar nueva sesión',
    'qué tipo de sesión',
    'sesiones configuradas',
    'números maestro',
    'clientes:'
  ];
  return botMenuIndicators.some(indicator => textoLower.includes(indicator));
}

/**
 * Verifica si un mensaje es una palabra clave de admin
 * @param {string} texto - Texto del mensaje
 * @returns {boolean} true si es una palabra clave de admin
 */
function isAdminKeyword(texto) {
  const textoLower = texto.toLowerCase();
  const adminKeywords = ['admin', 'gestionar', 'gestion', 'menu admin', 'administrar', '🔐'];
  
  return adminKeywords.some(keyword => {
    const keywordIndex = textoLower.indexOf(keyword);
    if (keywordIndex === -1) return false;
    
    // Si el mensaje es muy corto (solo la palabra clave o similar), es válido
    if (texto.length <= keyword.length + 10) return true;
    
    // Si el mensaje es largo pero contiene la palabra clave al inicio, también es válido
    return keywordIndex < 20; // Palabra clave en los primeros 20 caracteres
  });
}

/**
 * Procesa un paso del flujo de administración
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} targetPhone - Número de teléfono del destinatario
 * @param {string} texto - Texto del mensaje
 * @returns {Promise<boolean>} true si el mensaje fue procesado
 */
export async function handleAdminStep(msg, sessionId, targetPhone, texto) {
  const { handleAdminStep: handleAdminStepFlow } = await import('../../../services/adminFlow/index.js');
  const adminResult = await handleAdminStepFlow(targetPhone, texto, sessionId);
  
  logSession(sessionId, `🔐 Resultado de handleAdminStep: response=${!!adminResult.response}, completed=${adminResult.completed}, cancelled=${adminResult.cancelled}`);
  
  if (adminResult.response) {
    try {
      const { sendBotMessage } = await import('../humanManager.js');
      await sendBotMessage(msg, sessionId, targetPhone, adminResult.response);
      logSession(sessionId, '✅ Respuesta de administración enviada');
    } catch (err) {
      logSession(sessionId, `❌ Error enviando respuesta admin: ${err?.message || err}`);
    }
  } else {
    logSession(sessionId, `⚠️ handleAdminStep no devolvió respuesta para texto: "${texto}"`);
  }
  
  return true; // Procesado
}

/**
 * Inicia el flujo de administración
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} targetPhone - Número de teléfono del destinatario
 * @returns {Promise<boolean>} true si el flujo fue iniciado
 */
export async function startAdminFlow(msg, sessionId, targetPhone) {
  logSession(sessionId, `🔐 Mensaje del dueño detectado para modo admin: ${targetPhone}`);
  logSession(sessionId, `🔐 Activando modo administración para ${targetPhone}`);
  
  const { startAdminFlow: startAdminFlowService } = await import('../../../services/adminFlow/index.js');
  const startMessage = await startAdminFlowService(targetPhone, sessionId);
  
  try {
    const { sendBotMessage } = await import('../humanManager.js');
    await sendBotMessage(msg, sessionId, targetPhone, startMessage);
    logSession(sessionId, '✅ Menú de administración enviado');
  } catch (err) {
    logSession(sessionId, `❌ Error enviando menú admin: ${err?.message || err}`);
  }
  
  return true; // Procesado
}

/**
 * Procesa mensajes del dueño en sesión master (modo admin)
 * @param {Object} msg - Objeto de mensaje de whatsapp-web.js
 * @param {string} sessionId - ID de la sesión
 * @param {string} targetPhone - Número de teléfono del destinatario
 * @param {string} texto - Texto del mensaje
 * @returns {Promise<boolean>} true si el mensaje fue procesado, false si debe continuar con el flujo normal
 */
export async function processOwnerMessage(msg, sessionId, targetPhone, texto) {
  // Si el mensaje está vacío, ignorarlo
  if (!texto) {
    return true; // Procesado (ignorado)
  }
  
  const { getSessionType } = await import('../../../services/database/sessionService.js');
  const sessionType = await getSessionType(sessionId);
  
  if (sessionType !== 'master') {
    return false; // No es sesión master, continuar con flujo normal
  }
  
  // Solo procesar si el mensaje contiene palabras clave de admin
  const adminKeywords = ['admin', 'administrador', 'gestionar', 'gestion'];
  const isAdminKeyword = adminKeywords.some(keyword => 
    texto.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (!isAdminKeyword) {
    return false; // No es un mensaje de admin, continuar con flujo normal
  }
  
  const { isOwnerPhone, isInAdminMode } = await import('../../../services/adminFlow/index.js');
  const isOwner = await isOwnerPhone(targetPhone, sessionId);
  
  if (!isOwner) {
    logSession(sessionId, `⚠️ Intento de activar admin desde número no autorizado: ${targetPhone}`);
    return false; // No es el dueño, continuar con flujo normal
  }
  
  // Verificar si ya está en modo admin PRIMERO
  const inAdminMode = isInAdminMode(targetPhone);
  logSession(sessionId, `🔐 Verificando modo admin: phone=${targetPhone}, inAdminMode=${inAdminMode}, texto="${texto}"`);
  
  if (inAdminMode) {
    // En modo admin, verificar si el mensaje es del bot
    if (isBotMenuText(texto)) {
      logSession(sessionId, `⏭️ Ignorado: mensaje contiene texto del menú del bot en modo admin (evitando bucle infinito)`);
      return true; // Ignorar mensajes que contienen texto del menú del bot
    }
    
    // Si el mensaje es muy largo (más de 200 caracteres), probablemente es del bot
    if (texto.length > 200) {
      logSession(sessionId, `⏭️ Ignorado: mensaje muy largo en modo admin (${texto.length} caracteres), probablemente del bot`);
      return true; // Ignorar mensajes muy largos
    }
    
    // Si el mensaje es corto y no contiene texto del menú, es un mensaje del usuario
    logSession(sessionId, `🔐 Procesando paso de administración para ${targetPhone}, texto: "${texto}"`);
    await handleAdminStep(msg, sessionId, targetPhone, texto);
    return true; // Procesado
  } else {
    // No está en modo admin, verificar si es un mensaje reciente del bot
    const { isRecentBotMessage } = await import('../humanManager.js');
    
    if (targetPhone && isRecentBotMessage(sessionId, targetPhone)) {
      logSession(sessionId, `⏭️ Ignorado: mensaje propio reciente del bot (evitando bucle infinito)`);
      return true; // Ignorar mensajes recientes del bot
    }
    
    // Si el mensaje contiene texto del menú del bot, definitivamente es del bot
    if (isBotMenuText(texto)) {
      logSession(sessionId, `⏭️ Ignorado: mensaje contiene texto del menú del bot (evitando bucle infinito)`);
      return true; // Ignorar mensajes que contienen texto del menú del bot
    }
    
    // Si el mensaje es muy largo (más de 200 caracteres), probablemente es del bot
    if (texto.length > 200) {
      logSession(sessionId, `⏭️ Ignorado: mensaje muy largo (${texto.length} caracteres), probablemente del bot`);
      return true; // Ignorar mensajes muy largos
    }
    
    // Verificar si es una palabra clave para activar admin
    if (isAdminKeyword(texto)) {
      await startAdminFlow(msg, sessionId, targetPhone);
      return true; // Procesado
    }
  }
  
  return false; // No es un mensaje de admin, continuar con flujo normal
}

