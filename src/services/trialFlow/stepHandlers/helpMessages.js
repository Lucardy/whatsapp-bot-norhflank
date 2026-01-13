// Mensajes de ayuda contextual para el flujo de prueba gratuita
// Responsabilidad única: Generar mensajes de ayuda según el paso actual

import { TrialStep } from '../constants.js';

/**
 * Genera un mensaje de ayuda contextual según el paso actual del flujo
 * @param {string} step - Paso actual del flujo (TrialStep)
 * @param {Object} trialSession - Sesión de trial con datos del cliente
 * @returns {string} Mensaje de ayuda contextual
 */
export function getContextualHelp(step, trialSession) {
  const clientName = trialSession.data.name ? `, *${trialSession.data.name}*` : '';
  
  switch (step) {
    case TrialStep.NAME:
      return `📝 *Paso 1: Tu nombre*${clientName}

Necesito tu nombre para crear tu cuenta de bot.

💡 *¿Qué hacer?*
• Escribe tu nombre o el nombre de tu negocio
• Debe tener al menos 2 letras
• Ejemplos válidos: "Juan", "María", "Mi Negocio"

❌ *No se permiten:*
• Solo números (ej: "12345")
• Solo símbolos (ej: "###")
• Nombres muy cortos (menos de 2 letras)

💡 *Comandos disponibles:*
• "cancelar" - Salir del proceso
• "ayuda" - Ver este mensaje de ayuda`;
    
    case TrialStep.EMAIL:
      return `📧 *Paso 2: Tu email (opcional)*${clientName}

Este paso es opcional. Puedes proporcionar tu email o saltarlo.

💡 *¿Qué hacer?*
• Escribe tu email (ej: "juan@ejemplo.com")
• O escribe "saltar" para omitir este paso

💡 *Comandos disponibles:*
• "saltar" - Omitir este paso
• "cancelar" - Salir del proceso
• "ayuda" - Ver este mensaje de ayuda`;
    
    case TrialStep.QR_PHONE:
      return `📱 *Paso 3: Número para recibir el QR*${clientName}

Necesito saber a qué número enviarte el código QR para conectar tu bot.

💡 *¿Qué hacer?*
• Escribe el número de teléfono donde quieres recibir el QR
• O escribe "aquí" para recibirlo en este mismo número

⚠️ *Importante:* El QR debe escanearse desde el WhatsApp donde quieres tener el bot.

💡 *Comandos disponibles:*
• "aquí" - Recibir QR en este mismo número
• "cancelar" - Salir del proceso
• "ayuda" - Ver este mensaje de ayuda`;
    
    case TrialStep.QR_SENT:
      return `📱 *QR Enviado*${clientName}

El código QR ya fue enviado. Puedes:

💡 *Opciones disponibles:*
• "qr" - Reenviar el QR al mismo número
• "cambiar" o "otro número" - Enviar el QR a un número diferente
• Escribe un número de teléfono - Enviar el QR a ese número
• "aquí" - Enviar el QR a este mismo número
• "cancelar" - Salir del proceso
• "ayuda" - Ver este mensaje de ayuda`;
    
    default:
      return `❓ *Ayuda - Flujo de Prueba Gratuita*

Estás en el proceso de registro para obtener tu bot de WhatsApp.

💡 *Comandos disponibles:*
• "cancelar" - Salir del proceso
• "ayuda" - Ver este mensaje de ayuda

💡 Puedes volver a solicitar una prueba gratuita escribiendo "5" en el menú principal.`;
  }
}
