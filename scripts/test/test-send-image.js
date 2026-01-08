// Script de prueba para enviar una imagen por WhatsApp
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const SESSION_NAME = 'unikuo4'; // Usar la sesión master (unikuo4) para enviar
const TEST_IMAGE = path.join(__dirname, '../qr_pablo_criscione.png');
const TARGET_PHONE = '56991588143@c.us'; // Número de pablo_criscione

async function testSendImage() {
  console.log('🧪 Iniciando prueba de envío de imagen...');
  
  // Verificar que la imagen existe
  if (!fs.existsSync(TEST_IMAGE)) {
    console.error(`❌ La imagen de prueba no existe: ${TEST_IMAGE}`);
    process.exit(1);
  }
  
  console.log(`📁 Imagen de prueba: ${TEST_IMAGE}`);
  console.log(`📞 Número destino: ${TARGET_PHONE}`);
  
  // Crear cliente
  const sessionPath = path.join(__dirname, '../sessions', SESSION_NAME);
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: sessionPath }),
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/wa-version.json',
    },
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });
  
  client.on('ready', async () => {
    console.log('✅ Cliente listo');
    
    // Esperar un poco para asegurar que todo esté listo
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      // Verificar que el cliente esté realmente listo
      if (!client.info || !client.info.wid) {
        console.error('❌ Cliente no está completamente listo');
        await client.destroy();
        process.exit(1);
      }
      
      console.log(`📋 Cliente conectado como: ${client.info.wid.user || 'N/A'}`);
      
      // Crear MessageMedia desde el archivo
      console.log('🔄 Creando MessageMedia desde archivo...');
      const media = MessageMedia.fromFilePath(TEST_IMAGE);
      console.log(`✅ MessageMedia creado: mimetype=${media.mimetype}, filename=${media.filename}, dataLength=${media.data?.length || 'N/A'}`);
      
      // Enviar imagen
      console.log(`📤 Enviando imagen a ${TARGET_PHONE}...`);
      console.log(`⏳ Esperando respuesta (timeout: 30s)...`);
      
      const startTime = Date.now();
      const sentMessage = await Promise.race([
        client.sendMessage(TARGET_PHONE, media, {
          caption: '🧪 Esta es una imagen de prueba'
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout después de 30 segundos')), 30000);
        })
      ]);
      
      const elapsedTime = Date.now() - startTime;
      console.log(`✅ Imagen enviada exitosamente en ${elapsedTime}ms! ID: ${sentMessage?.id?._serialized || sentMessage?.id}`);
      console.log('✅ Prueba completada exitosamente');
      
      await client.destroy();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error enviando imagen:', error);
      console.error('Stack:', error.stack);
      await client.destroy();
      process.exit(1);
    }
  });
  
  client.on('qr', (qr) => {
    console.log('⚠️ Se requiere escanear QR. La sesión ya debería estar activa, cerrando...');
    setTimeout(() => {
      client.destroy();
      process.exit(1);
    }, 5000);
  });
  
  client.on('authenticated', () => {
    console.log('✅ Cliente autenticado');
  });
  
  client.on('auth_failure', (msg) => {
    console.error('❌ Error de autenticación:', msg);
    setTimeout(() => {
      client.destroy();
      process.exit(1);
    }, 1000);
  });
  
  client.on('disconnected', (reason) => {
    console.log('⚠️ Cliente desconectado:', reason);
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
  
  console.log('🔄 Inicializando cliente...');
  try {
    await client.initialize();
  } catch (error) {
    console.error('❌ Error inicializando cliente:', error.message);
    console.error('💡 Nota: Si el bot principal ya está corriendo, este script no puede crear otro cliente.');
    console.error('💡 Prueba enviando la opción 5 desde WhatsApp para probar el envío de imagen.');
    process.exit(1);
  }
}

testSendImage().catch(console.error);

