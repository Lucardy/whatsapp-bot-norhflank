// Script simple para obtener el número de teléfono real desde un ID
// Se conecta directamente a una sesión existente
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { PHONE_VALIDATION_PATTERN } from '../src/config/constants.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testId = process.argv[2] || '191148173860917';

console.log('🔍 Obteniendo número de teléfono real...\n');
console.log(`📱 ID a probar: ${testId}\n`);

// Buscar sesiones disponibles
const sessionsDir = path.join(__dirname, '..', 'sessions');
const fs = await import('fs');

let sessionName = null;
if (fs.existsSync(sessionsDir)) {
  const sessions = fs.readdirSync(sessionsDir).filter(item => {
    const itemPath = path.join(sessionsDir, item);
    return fs.statSync(itemPath).isDirectory();
  });
  
  if (sessions.length > 0) {
    // Buscar sesión master o usar la primera
    sessionName = sessions.find(s => s.includes('master') || s.includes('unikuo')) || sessions[0];
    console.log(`📦 Usando sesión: ${sessionName}\n`);
  }
}

if (!sessionName) {
  console.error('❌ No se encontraron sesiones. Asegúrate de que el bot esté corriendo.');
  process.exit(1);
}

const sessionPath = path.join(sessionsDir, sessionName);

// Crear cliente
const client = new Client({
  authStrategy: new LocalAuth({ 
    dataPath: sessionPath 
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

// Eventos
client.on('qr', (qr) => {
  console.log('📱 Escanea este QR para conectar:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
  console.log('✅ Cliente conectado!\n');
  console.log('='.repeat(60));
  
  try {
    // Método 1: getContactById
    console.log('\n📱 Método 1: client.getContactById()');
    try {
      const contactId = testId.includes('@') ? testId : `${testId}@c.us`;
      console.log(`   Intentando con: ${contactId}`);
      
      const contact = await client.getContactById(contactId);
      
      if (contact) {
        console.log('   ✅ Contacto obtenido');
        console.log('   📋 Datos:');
        console.log('      - contact.id.user:', contact.id?.user);
        console.log('      - contact.id._serialized:', contact.id?._serialized);
        console.log('      - contact.number:', contact.number);
        
        if (contact.id && contact.id.user) {
          const phoneNumber = contact.id.user.replace(/\D/g, '');
          if (PHONE_VALIDATION_PATTERN.test(phoneNumber)) {
            console.log(`   ✅✅✅ NÚMERO REAL ENCONTRADO: ${phoneNumber} ✅✅✅`);
          } else {
            console.log(`   ⚠️ contact.id.user no es válido: ${contact.id.user}`);
          }
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Método 2: getNumberId
    console.log('\n📱 Método 2: client.getNumberId()');
    try {
      const phoneFormatted = testId.includes('@') ? testId : `${testId}@c.us`;
      const numberId = await client.getNumberId(phoneFormatted);
      
      if (numberId && numberId._serialized) {
        const userId = numberId._serialized.split('@')[0];
        const phoneNumber = userId.replace(/\D/g, '');
        if (PHONE_VALIDATION_PATTERN.test(phoneNumber)) {
          console.log(`   ✅✅✅ NÚMERO REAL ENCONTRADO: ${phoneNumber} ✅✅✅`);
        } else {
          console.log(`   ⚠️ numberId no es válido: ${userId}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Método 3: Buscar en chats
    console.log('\n📱 Método 3: Buscar en chats');
    try {
      const chats = await client.getChats();
      const matchingChat = chats.find(chat => {
        const chatId = chat.id._serialized || chat.id;
        return chatId.includes(testId) || testId.includes(chatId.split('@')[0]);
      });

      if (matchingChat && matchingChat.id && matchingChat.id.user) {
        const phoneNumber = matchingChat.id.user.replace(/\D/g, '');
        if (PHONE_VALIDATION_PATTERN.test(phoneNumber)) {
          console.log(`   ✅✅✅ NÚMERO REAL ENCONTRADO: ${phoneNumber} ✅✅✅`);
        } else {
          console.log(`   ⚠️ chat.id.user no es válido: ${matchingChat.id.user}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Prueba completada\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.destroy();
    process.exit(0);
  }
});

client.on('auth_failure', (msg) => {
  console.error('❌ Error de autenticación:', msg);
  process.exit(1);
});

client.initialize();
