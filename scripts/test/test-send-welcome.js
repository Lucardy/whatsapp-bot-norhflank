// Script de prueba para enviar mensaje de bienvenida
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import { getPrisma } from '../src/config/database.js';
import { log } from '../src/utils/logger/index.js';

async function testSendWelcome() {
  try {
    // Obtener información del cliente hector desde la base de datos
    const db = getPrisma();
    const session = await db.whatsAppSession.findFirst({
      where: { session_name: 'hector' },
      include: { client: true }
    });

    if (!session || !session.client) {
      log('❌ No se encontró la sesión o cliente "hector"');
      await db.$disconnect();
      return;
    }

    const clientName = session.client.name;
    const phoneNumber = session.phone_number || '5491158467189'; // Número de hector
    const welcomeMessage = `🎉 *¡Bienvenido a tu Bot de WhatsApp!*

Hola *${clientName}*, tu bot ya está conectado y listo para usar.

⏸️ *Estado inicial:* Tu bot comienza *desactivado* para que puedas configurarlo con tranquilidad.

📱 *¿Qué puedes hacer ahora?*

*Comandos rápidos:*
• Escribe *"menú"* → Ver todas las opciones disponibles
• Escribe *"configurar"* → Personalizar tus respuestas y opciones
• Escribe *"ayuda"* → Ver la guía completa de uso
• Escribe *"probar"* → Activar modo test para probar tu bot

💡 *Pasos recomendados:*

1️⃣ *Configura tus respuestas*
   Personaliza el mensaje de bienvenida y las 4 opciones del menú que verán tus contactos.

2️⃣ *Prueba tu bot*
   Usa el modo test para ver cómo funcionan tus respuestas antes de activarlo.

3️⃣ *Activa tu bot*
   Cuando estés listo, activa el bot desde el menú para que empiece a responder automáticamente.

✅ *Una vez activado:*
   Tu bot responderá automáticamente a todos los mensajes que reciba, usando las respuestas que configuraste.

📞 *Importante:*
   • Para gestionar tu bot → Escribe en *este chat* (tu propio bot)
   • Para consultas o soporte → Escribe al número de Unikuo

🚀 *¡Comienza ahora escribiendo "menú"!*`;

    log(`📱 Cliente: ${clientName}`);
    log(`📞 Número: ${phoneNumber}`);
    log(`📝 Mensaje: ${welcomeMessage.substring(0, 100)}...`);

    // Crear cliente WhatsApp usando la sesión existente
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'hector'
      }),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });

    log('🔄 Inicializando cliente...');

    client.on('ready', async () => {
      log('✅ Cliente conectado');
      
      try {
        const chatId = `${phoneNumber}@c.us`;
        log(`📤 Enviando mensaje a ${chatId}...`);
        
        // Intentar enviar el mensaje
        await client.sendMessage(chatId, welcomeMessage);
        
        log('✅ Mensaje enviado exitosamente!');
        await db.$disconnect();
        process.exit(0);
      } catch (error) {
        log(`❌ Error enviando mensaje: ${error?.message || error}`);
        log(`❌ Stack: ${error?.stack || 'N/A'}`);
        await db.$disconnect();
        process.exit(1);
      }
    });

    client.on('auth_failure', (msg) => {
      log(`❌ Error de autenticación: ${msg}`);
      process.exit(1);
    });

    client.on('disconnected', (reason) => {
      log(`⚠️ Cliente desconectado: ${reason}`);
    });

    await client.initialize();
  } catch (error) {
    log(`❌ Error en el script: ${error?.message || error}`);
    log(`❌ Stack: ${error?.stack || 'N/A'}`);
    process.exit(1);
  }
}

testSendWelcome();

