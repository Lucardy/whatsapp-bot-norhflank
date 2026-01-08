// Construcción de respuestas del bot
import { logSession } from '../../utils/logger/index.js';
import { getClientConfig } from '../database/configService.js';

/**
 * Obtiene las respuestas del bot (desde DB o fallback hardcodeado)
 * @param {string} sessionId - ID de la sesión
 * @param {string|null} clientName - Nombre del cliente si es conocido (para personalizar mensajes)
 * @param {number|null} clientId - ID del cliente si es conocido (para agregar opción de configurar)
 * @returns {Promise<Object>} Objeto con las respuestas
 */
export async function getResponses(sessionId, clientName = null, clientId = null) {
  const clientConfig = await getClientConfig(sessionId);
  
  // Obtener el tipo de sesión para determinar si mostrar opción de configurar
  const { getSessionType } = await import('../database/sessionService.js');
  const sessionType = await getSessionType(sessionId);
  
  if (clientConfig?.menu_options?.options) {
    // Construir objeto de respuestas desde DB
    const responses = {};
    clientConfig.menu_options.options.forEach(option => {
      responses[option.key] = option.response;
    });
    
    // Obtener mensaje de bienvenida personalizado del cliente
    let welcomeMessage = clientConfig.menu_options.default_response || clientConfig.welcome_message;
    if (clientName && welcomeMessage) {
      // Reemplazar "Hola" o "Bienvenido" con saludo personalizado si es posible
      welcomeMessage = welcomeMessage.replace(
        /(👋\s*¡?Hola!?\s*👋|¡Hola!|Bienvenido)/i,
        `👋 ¡Hola ${clientName}! 👋`
      );
    }
    
    // Construir mensajes de bienvenida usando la configuración del cliente
    // Si el cliente tiene un mensaje de bienvenida personalizado, usarlo
    // Si no, usar el mensaje de bienvenida por defecto de Unikuo
    const welcomePart1 = clientConfig.welcome_message || (clientName
      ? `👋 ¡Hola ${clientName}! 👋\n\nMe alegra verte de nuevo 😊\n\nEn *Unikuo* creamos páginas web, marketing digital y bots de WhatsApp. ¿En qué te puedo ayudar?`
      : `👋 ¡Hola! 👋\n\nBienvenido a *Unikuo* 😊\n\nSomos especialistas en:\n🖥️ Páginas web profesionales\n📱 Marketing digital\n🤖 Bots de WhatsApp\n\n¿En qué te puedo ayudar?`);
    
    // Construir lista de opciones desde la configuración del cliente
    const optionsList = clientConfig.menu_options.options
      .map(opt => `${opt.key}️⃣ ${opt.label || opt.key}`)
      .join('\n');
    
    // Parte 2: Opciones (usar las opciones del cliente si están disponibles)
    // NOTA: No mostrar opción de configuración en el master - los clientes gestionan desde su propio bot
    const welcomePart2 = clientConfig.menu_options.options.length > 0
      ? `📋 *¿Qué te gustaría saber?*\n\n${optionsList}\n\n👉 *Escribe el número de la opción que te interesa*`
      : `📋 *¿Qué te gustaría saber?*\n\n1️⃣ Consultar precios\n2️⃣ Ver nuestros trabajos\n3️⃣ Visitar nuestra página web\n4️⃣ Hablar con un agente\n5️⃣ Prueba gratuita de bot\n\n👉 *Escribe el número de la opción que te interesa*`;
    
    // Mensaje para opciones inválidas (usar las opciones del cliente si están disponibles)
    const invalidOption = clientConfig.menu_options.options.length > 0
      ? `❓ No entendí tu mensaje.\n\n📋 *Opciones disponibles:*\n\n${optionsList}\n\n👉 *Escribe el número de la opción que te interesa*`
      : `❓ No entendí tu mensaje.\n\n📋 *Opciones disponibles:*\n\n1️⃣ Consultar precios\n2️⃣ Ver nuestros trabajos\n3️⃣ Visitar nuestra página web\n4️⃣ Hablar con un agente\n5️⃣ Prueba gratuita de bot\n\n👉 *Escribe el número de la opción que te interesa*`;
    
    responses.welcome_part1 = welcomePart1;
    responses.welcome_part2 = welcomePart2;
    responses.invalid_option = invalidOption;
    responses.default = welcomeMessage; // Mantener para compatibilidad
    
    // NOTA: Los clientes gestionan su bot desde su propio WhatsApp, no desde el master
    // Removida la opción de configuración desde el master para mantener separación de responsabilidades
    
    return responses;
  }

  // Fallback: respuestas hardcodeadas (compatibilidad con sistema anterior)
  const greeting = clientName 
    ? `👋 ¡Hola ${clientName}! 👋\n\nMe alegra verte de nuevo.`
    : `👋 ¡Hola! 👋\n\nBienvenido a *Unikuo*, servicio de creación de páginas web.`;
  
  return {
    '1': `💰 *Nuestros Planes de Páginas Web*

Ofrecemos planes mensuales que incluyen:
• Diseño profesional
• Hosting y dominio
• Mantenimiento continuo
• Soporte técnico

📋 *Planes disponibles:*

• *Landing Page*: $24.000/mes
• *Catálogo Online*: $41.000/mes
• *Business Web*: $58.000/mes

💬 Para más detalles o consultas personalizadas, elige la opción 4 para hablar con un agente.`,

    '2': `🎨 *Nuestros Trabajos*

Creamos páginas web profesionales y modernas para tu negocio. Nuestros servicios incluyen:

✨ *Lo que ofrecemos:*
• Diseño responsive (se adapta a móviles)
• Optimización para buscadores (SEO)
• Integración con redes sociales
• Formularios de contacto
• Panel de administración
• Actualizaciones de contenido

🚀 *Tecnologías que utilizamos:*
• Diseño moderno y profesional
• Velocidad optimizada
• Seguridad implementada

💡 Todos nuestros sitios incluyen mantenimiento continuo y soporte técnico.`,

    '3': `🌐 *Nuestra Página Web*

Visita nuestro sitio para conocer más sobre nuestros servicios:

🔗 https://unikuoweb.com/

Allí encontrarás:
• Portafolio de trabajos
• Información detallada de servicios
• Casos de éxito
• Formulario de contacto

💬 ¿Tienes alguna pregunta? Elige la opción 4 para hablar con un agente.`,

    '4': `👤 *Hablar con un Agente*

¡Perfecto! Un agente de Unikuo se comunicará contigo en la brevedad.

⏰ Te responderemos pronto por este mismo WhatsApp.

Mientras tanto, puedes revisar nuestras opciones anteriores si tienes alguna otra consulta.`,

    '5': `🎁 *Prueba Gratuita de Bot de WhatsApp*

¡Obtén una prueba gratuita de 7 días con un bot completamente personalizado!

✨ *Lo que incluye:*
• Bot personalizado con tus respuestas
• Respuestas automáticas 24/7
• Configuración fácil desde WhatsApp
• Soporte durante la prueba

Escribe "5" o "prueba gratuita" para comenzar el proceso de registro.`,

    // Mensaje de bienvenida (parte 1 - saludo e información)
    welcome_part1: clientName
      ? `👋 ¡Hola ${clientName}! 👋\n\nMe alegra verte de nuevo 😊\n\nEn *Unikuo* creamos páginas web, marketing digital y bots de WhatsApp. ¿En qué te puedo ayudar?`
      : `👋 ¡Hola! 👋\n\nBienvenido a *Unikuo* 😊\n\nSomos especialistas en:\n🖥️ Páginas web profesionales\n📱 Marketing digital\n🤖 Bots de WhatsApp\n\n¿En qué te puedo ayudar?`,

    // Mensaje de bienvenida (parte 2 - opciones)
    welcome_part2: `📋 *¿Qué te gustaría saber?*\n\n1️⃣ Consultar precios\n2️⃣ Ver nuestros trabajos\n3️⃣ Visitar nuestra página web\n4️⃣ Hablar con un agente\n5️⃣ Prueba gratuita de bot\n\n👉 *Escribe el número de la opción que te interesa*`,

    // Mensaje para opciones inválidas
    invalid_option: `❓ No entendí tu mensaje.\n\n📋 *Opciones disponibles:*\n\n1️⃣ Consultar precios\n2️⃣ Ver nuestros trabajos\n3️⃣ Visitar nuestra página web\n4️⃣ Hablar con un agente\n5️⃣ Prueba gratuita de bot\n\n👉 *Escribe el número de la opción que te interesa*`,

    // Mantener default para compatibilidad (pero no se usará en el nuevo flujo)
    default: `${greeting}\n\nEstoy aquí para ayudarte.\n¿Qué te gustaría saber?\n\n1️⃣ Consultar precios\n2️⃣ Ver nuestros trabajos\n3️⃣ Visitar nuestra página web\n4️⃣ Hablar con un agente\n5️⃣ Prueba gratuita de bot\n\nEscribe el número de la opción que te interesa.`
  };
}

