// Script para testear y obtener TODOS los datos posibles de un contacto que envía un mensaje
// Usa la sesión master existente (unikuo12)
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const MASTER_SESSION_ID = 'unikuo12'; // Cambia esto si tu sesión master tiene otro nombre
const SESSION_PATH = path.join(__dirname, '..', 'sessions', MASTER_SESSION_ID);

console.log('🔍 Script de Test - Extracción de Datos de Contacto');
console.log('='.repeat(60));
console.log(`📁 Sesión: ${MASTER_SESSION_ID}`);
console.log(`📂 Ruta: ${SESSION_PATH}`);
console.log('='.repeat(60));
console.log('\n⏳ Inicializando cliente WhatsApp...\n');

// Configuración de Puppeteer
const puppeteerConfig = {
  headless: true,
  executablePath: puppeteer.executablePath(),
  protocolTimeout: 120_000,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--no-zygote',
    '--disable-gpu',
  ]
};

// Crear cliente
const client = new Client({
  authStrategy: new LocalAuth({ 
    dataPath: SESSION_PATH
  }),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/wa-version.json',
  },
  puppeteer: puppeteerConfig
});

// Función para extraer TODOS los datos posibles de un contacto
async function extractAllContactData(msg) {
  console.log('\n' + '='.repeat(60));
  console.log('📨 MENSAJE RECIBIDO');
  console.log('='.repeat(60));
  
  const data = {
    timestamp: new Date().toISOString(),
    messageData: {},
    contactData: {},
    rawData: {}
  };

  // 1. Datos del mensaje
  console.log('\n📝 1. DATOS DEL MENSAJE:');
  console.log('-'.repeat(60));
  data.messageData = {
    id: msg.id?._serialized || msg.id || 'N/A',
    from: msg.from || 'N/A',
    fromMe: msg.fromMe || false,
    body: msg.body || 'N/A',
    timestamp: msg.timestamp || 'N/A',
    type: msg.type || 'N/A',
    hasMedia: msg.hasMedia || false,
    isGroup: msg.isGroup || false,
    isForwarded: msg.isForwarded || false,
    isStarred: msg.isStarred || false,
    isStatus: msg.isStatus || false,
  };
  
  Object.entries(data.messageData).forEach(([key, value]) => {
    console.log(`   ${key}: ${JSON.stringify(value)}`);
  });

  // 2. Intentar obtener contacto con getContact()
  console.log('\n📱 2. DATOS DEL CONTACTO (message.getContact()):');
  console.log('-'.repeat(60));
  
  try {
    if (msg.getContact && typeof msg.getContact === 'function') {
      const contact = await msg.getContact();
      
      if (contact) {
        // Extraer todos los campos posibles del contacto
        data.contactData = {
          id: contact.id || 'N/A',
          id_user: contact.id?.user || 'N/A',
          id_server: contact.id?.server || 'N/A',
          id_serialized: contact.id?._serialized || 'N/A',
          number: contact.number || 'N/A',
          name: contact.name || 'N/A',
          shortName: contact.shortName || 'N/A',
          pushname: contact.pushname || 'N/A',
          isBusiness: contact.isBusiness || false,
          isEnterprise: contact.isEnterprise || false,
          isGroup: contact.isGroup || false,
          isMyContact: contact.isMyContact || false,
          isUser: contact.isUser || false,
          isWAContact: contact.isWAContact || false,
          profilePicUrl: contact.profilePicUrl || 'N/A',
          labels: contact.labels || [],
        };

        // Intentar obtener más datos si existen
        try {
          if (contact.getProfilePicUrl) {
            data.contactData.profilePicUrl_alt = await contact.getProfilePicUrl().catch(() => 'Error obteniendo');
          }
        } catch (e) {}

        try {
          if (contact.getChat) {
            const chat = await contact.getChat().catch(() => null);
            if (chat) {
              data.contactData.chat = {
                id: chat.id?._serialized || chat.id || 'N/A',
                isGroup: chat.isGroup || false,
                isMuted: chat.isMuted || false,
                isReadOnly: chat.isReadOnly || false,
              };
            }
          }
        } catch (e) {}

        Object.entries(data.contactData).forEach(([key, value]) => {
          if (typeof value === 'object' && !Array.isArray(value)) {
            console.log(`   ${key}:`);
            Object.entries(value).forEach(([subKey, subValue]) => {
              console.log(`      ${subKey}: ${JSON.stringify(subValue)}`);
            });
          } else {
            console.log(`   ${key}: ${JSON.stringify(value)}`);
          }
        });
      } else {
        console.log('   ⚠️ getContact() retornó null o undefined');
        data.contactData.error = 'getContact() retornó null';
      }
    } else {
      console.log('   ⚠️ msg.getContact no está disponible');
      data.contactData.error = 'getContact() no disponible';
    }
  } catch (error) {
    console.log(`   ❌ Error obteniendo contacto: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    data.contactData.error = error.message;
    data.contactData.errorStack = error.stack;
  }

  // 3. Datos del mensaje.from
  console.log('\n🔍 3. DATOS DE msg.from:');
  console.log('-'.repeat(60));
  data.messageData.fromDetails = {
    raw: msg.from,
    parsed: null
  };
  
  if (msg.from) {
    // Intentar parsear el formato de WhatsApp
    const fromMatch = msg.from.match(/^(\d+)@([a-z.]+)$/);
    if (fromMatch) {
      data.messageData.fromDetails.parsed = {
        number: fromMatch[1],
        server: fromMatch[2],
        isLid: fromMatch[2] === 'lid',
        isCus: fromMatch[2] === 'c.us',
        isGus: fromMatch[2] === 'g.us',
      };
      console.log(`   Número extraído: ${fromMatch[1]}`);
      console.log(`   Servidor: ${fromMatch[2]}`);
      console.log(`   Es @lid: ${fromMatch[2] === 'lid'}`);
      console.log(`   Es @c.us: ${fromMatch[2] === 'c.us'}`);
    } else {
      console.log(`   Formato no reconocido: ${msg.from}`);
    }
  } else {
    console.log('   ⚠️ msg.from es null o undefined');
  }

  // 4. Datos del chat
  console.log('\n💬 4. DATOS DEL CHAT:');
  console.log('-'.repeat(60));
  
  try {
    if (msg.getChat && typeof msg.getChat === 'function') {
      const chat = await msg.getChat();
      if (chat) {
        data.chatData = {
          id: chat.id?._serialized || chat.id || 'N/A',
          name: chat.name || 'N/A',
          isGroup: chat.isGroup || false,
          isMuted: chat.isMuted || false,
          isReadOnly: chat.isReadOnly || false,
          unreadCount: chat.unreadCount || 0,
          pinned: chat.pinned || false,
        };
        
        Object.entries(data.chatData).forEach(([key, value]) => {
          console.log(`   ${key}: ${JSON.stringify(value)}`);
        });
      }
    } else {
      console.log('   ⚠️ msg.getChat no está disponible');
    }
  } catch (error) {
    console.log(`   ❌ Error obteniendo chat: ${error.message}`);
  }

  // 5. Datos RAW del objeto mensaje (solo propiedades principales)
  console.log('\n🔧 5. PROPIEDADES DEL OBJETO MENSAJE:');
  console.log('-'.repeat(60));
  const messageKeys = Object.keys(msg).filter(key => 
    !key.startsWith('_') && 
    typeof msg[key] !== 'function' &&
    !['client', 'id', 'from', 'body', 'timestamp', 'type'].includes(key)
  );
  
  messageKeys.forEach(key => {
    try {
      const value = msg[key];
      if (typeof value !== 'function' && typeof value !== 'object') {
        console.log(`   ${key}: ${JSON.stringify(value)}`);
        data.rawData[key] = value;
      }
    } catch (e) {
      // Ignorar errores al acceder a propiedades
    }
  });

  // 6. Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN - NÚMEROS ENCONTRADOS:');
  console.log('='.repeat(60));
  
  const numbers = [];
  
  // De contact.id.user
  if (data.contactData.id_user && data.contactData.id_user !== 'N/A') {
    const cleanNumber = data.contactData.id_user.replace(/\D/g, '');
    if (cleanNumber.length >= 8) {
      numbers.push({
        source: 'contact.id.user',
        value: data.contactData.id_user,
        clean: cleanNumber,
        isValid: /^[0-9]{8,15}$/.test(cleanNumber)
      });
    }
  }
  
  // De contact.number
  if (data.contactData.number && data.contactData.number !== 'N/A') {
    const cleanNumber = data.contactData.number.replace(/\D/g, '');
    if (cleanNumber.length >= 8) {
      numbers.push({
        source: 'contact.number',
        value: data.contactData.number,
        clean: cleanNumber,
        isValid: /^[0-9]{8,15}$/.test(cleanNumber)
      });
    }
  }
  
  // De msg.from (parseado)
  if (data.messageData.fromDetails?.parsed?.number) {
    const num = data.messageData.fromDetails.parsed.number;
    if (num.length >= 8) {
      numbers.push({
        source: 'msg.from (parseado)',
        value: num,
        clean: num,
        isValid: /^[0-9]{8,15}$/.test(num),
        isLid: data.messageData.fromDetails.parsed.isLid
      });
    }
  }
  
  if (numbers.length > 0) {
    numbers.forEach((num, index) => {
      console.log(`\n${index + 1}. ${num.source}:`);
      console.log(`   Valor: ${num.value}`);
      console.log(`   Limpio: ${num.clean}`);
      console.log(`   Válido (8-15 dígitos): ${num.isValid ? '✅' : '❌'}`);
      if (num.isLid !== undefined) {
        console.log(`   Es @lid: ${num.isLid ? '⚠️ SÍ' : '✅ NO'}`);
      }
    });
    
    // Recomendación
    const validNumbers = numbers.filter(n => n.isValid && !n.isLid);
    if (validNumbers.length > 0) {
      console.log(`\n✅ RECOMENDACIÓN: Usar ${validNumbers[0].source} = ${validNumbers[0].clean}`);
    } else {
      console.log(`\n⚠️ ADVERTENCIA: No se encontró ningún número válido (todos son @lid o inválidos)`);
    }
  } else {
    console.log('\n❌ No se encontró ningún número de teléfono');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Análisis completado. Esperando siguiente mensaje...\n');
  
  return data;
}

// Event listeners
client.on('qr', (qr) => {
  console.log('📱 QR Code generado. Escanea con WhatsApp:');
  console.log(qr);
  console.log('\n💡 También puedes verlo en: http://localhost:3000/qr/' + MASTER_SESSION_ID);
});

client.on('ready', () => {
  console.log('✅ Cliente conectado y listo!');
  console.log('📬 Esperando mensajes...');
  console.log('💡 Envía un mensaje desde otro WhatsApp para ver todos los datos\n');
});

client.on('authenticated', () => {
  console.log('🔐 Autenticado exitosamente');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Error de autenticación:', msg);
  process.exit(1);
});

client.on('disconnected', (reason) => {
  console.log('⚠️ Desconectado:', reason);
  if (reason === 'NAVIGATION') {
    console.log('💡 Necesitas escanear el QR nuevamente');
  }
});

// Escuchar mensajes
client.on('message_create', async (msg) => {
  // Solo procesar mensajes que no son del bot
  if (msg.fromMe) {
    return;
  }
  
  try {
    await extractAllContactData(msg);
  } catch (error) {
    console.error('❌ Error procesando mensaje:', error);
  }
});

// Inicializar
console.log('🚀 Iniciando cliente...\n');
client.initialize().catch(err => {
  console.error('❌ Error inicializando:', err);
  process.exit(1);
});

// Manejo de cierre
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Cerrando cliente...');
  await client.destroy();
  process.exit(0);
});
