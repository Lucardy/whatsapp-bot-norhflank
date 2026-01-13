// Persistencia de configuración en base de datos
import { getPrisma } from '../../../config/database.js';
import { updateClientConfig } from '../../database/configService.js';
import { clearConfigCache } from '../../messageHandler/cache.js';
import { logSession } from '../../../utils/logger/index.js';
import { getSession } from '../sessionManager.js';

/**
 * Construye la estructura de menu_options para guardar en BD
 * @param {Object} configData - Datos de configuración
 * @returns {Object} Estructura de menu_options
 */
function buildMenuOptions(configData) {
  const menuOptions = {
    options: [],
    default_response: configData.welcome_message || ''
  };
  
  // Agregar todas las opciones configuradas (ordenadas por key)
  if (configData.options && Array.isArray(configData.options)) {
    const sortedOptions = [...configData.options].sort((a, b) => {
      const numA = parseInt(a.key);
      const numB = parseInt(b.key);
      return numA - numB;
    });
    
    sortedOptions.forEach(option => {
      if (option.label && option.response) {
        menuOptions.options.push({
          key: option.key,
          label: option.label,
          response: option.response
        });
      }
    });
  }
  
  return menuOptions;
}

/**
 * Completa la configuración y guarda en la base de datos
 * @param {number} clientId - ID del cliente
 * @param {string} sessionId - ID de la sesión
 * @returns {Promise<Object>} Respuesta final
 */
export async function completeConfiguration(clientId, sessionId) {
  const configSession = getSession(clientId);
  
  if (!configSession) {
    return { response: null, completed: false, cancelled: false };
  }
  
  // Construir estructura de menu_options
  const menuOptions = buildMenuOptions(configSession.data);
  
  // Guardar en base de datos
  try {
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
      const { validateClientConfig } = await import('../../../utils/validation/configValidator.js');
      try {
        // Validar: pasar menu_options.options (el array) a la validación
        // La validación espera un array, no el objeto completo
        validateClientConfig({
          welcome_message: configSession.data.welcome_message,
          menu_options: menuOptions.options || []
        }, {
          requireWelcome: !!configSession.data.welcome_message,
          requireOptions: false // Permitir guardar sin opciones si solo se configuró el mensaje de bienvenida
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
        menu_options: menuOptions,
        excluded_numbers: configSession.data.excluded_numbers || []
      });
      
      // Limpiar cache
      clearConfigCache(clientSessionId);
      
      logSession(sessionId, `✅ Configuración completada y guardada para cliente ${clientId}`);
    }
  } catch (error) {
    logSession(sessionId, `❌ Error guardando configuración: ${error?.message || error}`);
  }
  
  // Guardar datos antes de eliminar la sesión
  const optionCount = menuOptions.options.length;
  const hadWelcome = !!configSession.data.welcome_message;
  
  // Eliminar la sesión de configuración después de guardar (IMPORTANTE: hacerlo antes de construir el mensaje)
  const { deleteSession } = await import('../sessionManager.js');
  deleteSession(clientId);
  logSession(sessionId, `🗑️ Sesión de configuración eliminada para cliente ${clientId} después de guardar`);
  
  const summary = `✅ *¡Configuración completada y guardada!*

📋 *Resumen de lo configurado:*
• Mensaje de bienvenida: ${hadWelcome ? '✅' : '⏭️'}
• Opciones configuradas: ${optionCount} ${optionCount > 0 ? '✅' : '⏭️'}

🎉 Los cambios se aplicarán inmediatamente. Puedes probar enviando un mensaje a tu bot.

💡 Escribe "configurar" nuevamente si quieres modificar algo.

💡 Escribe "menu" si quieres volver al menu principal.`;
  
  return {
    response: summary,
    completed: true,
    cancelled: false
  };
}

