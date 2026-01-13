// Script para probar la extracción del número de teléfono real
// Usa la sesión master para obtener el número de un contacto
import { SessionManager } from '../src/services/sessionManager/index.js';
import { config, loadSessionsConfig } from '../src/config/index.js';
import { PHONE_VALIDATION_PATTERN } from '../src/config/constants.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Prueba diferentes métodos para obtener el número de teléfono de un contacto
 */
async function testPhoneExtraction() {
  console.log('🔍 Iniciando prueba de extracción de número de teléfono...\n');

  // Intentar usar SessionManager global (si el bot está corriendo)
  let sessionManager = null;
  try {
    const { getGlobalSessionManager } = await import('../src/services/sessionManager/global.js');
    sessionManager = getGlobalSessionManager();
    if (sessionManager) {
      console.log('✅ Usando SessionManager global (bot está corriendo)');
    }
  } catch (e) {
    // Continuar para crear uno nuevo
  }

  // Si no hay SessionManager global, crear uno nuevo
  if (!sessionManager) {
    console.log('📦 Creando nuevo SessionManager...');
    fs.mkdirSync(config.sessionBaseDir, { recursive: true });
    sessionManager = new SessionManager(config.sessionBaseDir);
  }
  
  // Cargar sesiones
  const SESSIONS_CONFIG = await loadSessionsConfig();
  console.log('📋 Sesiones configuradas:', SESSIONS_CONFIG);
  
  // Buscar la sesión master
  let masterSessionId = null;
  for (const sessionId of SESSIONS_CONFIG) {
    try {
      const { getSessionType } = await import('../src/services/database/sessionService.js');
      const sessionType = await getSessionType(sessionId);
      if (sessionType === 'master') {
        masterSessionId = sessionId;
        break;
      }
    } catch (e) {
      // Continuar buscando
    }
  }

  if (!masterSessionId) {
    // Usar la primera sesión disponible
    masterSessionId = SESSIONS_CONFIG[0];
    console.log(`⚠️ No se encontró sesión master explícita, usando: ${masterSessionId}`);
  }

  console.log(`📦 Verificando sesión: ${masterSessionId}...`);
  
  // Verificar si la sesión ya existe y está conectada
  let sessionData = sessionManager.getSession(masterSessionId);
  let client = null;
  
  if (sessionData?.client) {
    try {
      const state = await sessionData.client.getState();
      if (state === 'CONNECTED') {
        console.log(`✅ Sesión ${masterSessionId} ya está conectada\n`);
        client = sessionData.client;
      }
    } catch (e) {
      // Continuar para inicializar
    }
  }
  
  // Si no está conectada, intentar inicializar (pero con timeout más corto)
  if (!client) {
    console.log(`📦 Intentando conectar sesión: ${masterSessionId}...`);
    await sessionManager.ensureInit(masterSessionId);
    
    // Esperar a que esté lista (máximo 10 segundos, ya que el usuario dijo que la inició)
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      sessionData = sessionManager.getSession(masterSessionId);
      if (sessionData?.client) {
        try {
          const state = await sessionData.client.getState();
          if (state === 'CONNECTED') {
            console.log(`✅ Sesión ${masterSessionId} conectada\n`);
            client = sessionData.client;
            break;
          }
        } catch (e) {
          // Continuar esperando
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
      process.stdout.write(`\r⏳ Esperando conexión... (${attempts}/${maxAttempts})`);
    }
    
    console.log('\n');
    
    if (!client) {
      console.error('❌ No se pudo conectar a la sesión');
      console.error('💡 Asegúrate de que el bot esté corriendo y la sesión esté lista');
      process.exit(1);
    }
  }

  // Obtener el número/ID desde argumentos de línea de comandos o pedirlo
  let testId = process.argv[2];
  
  if (!testId) {
    // Pedir al usuario el número o ID a probar
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    console.log('📝 Ingresa el número de teléfono o ID largo que quieres probar:');
    console.log('   Ejemplo: 5491169956253 o 191148173860917\n');
    
    const input = await question('Número/ID: ');
    rl.close();

    testId = input.trim();
    if (!testId) {
      console.error('❌ No se ingresó ningún número');
      console.log('\n💡 Uso: node scripts/test-phone-extraction.js <número_o_id>');
      process.exit(1);
    }
  }

  console.log(`\n🔍 Probando con: ${testId}\n`);
  console.log('='.repeat(60));

  // Método 1: Intentar obtener contacto directamente
  console.log('\n📱 Método 1: client.getContactById()');
  try {
    const contactId = testId.includes('@') ? testId : `${testId}@c.us`;
    console.log(`   Intentando con: ${contactId}`);
    
    const contact = await client.getContactById(contactId);
    
    if (contact) {
      console.log('   ✅ Contacto obtenido');
      console.log('   📋 Datos del contacto:');
      console.log('      - contact.id:', contact.id);
      console.log('      - contact.id.user:', contact.id?.user);
      console.log('      - contact.id._serialized:', contact.id?._serialized);
      console.log('      - contact.number:', contact.number);
      console.log('      - contact.pushname:', contact.pushname);
      console.log('      - contact.name:', contact.name);
      
      // Extraer número
      if (contact.id && contact.id.user) {
        const phoneNumber = contact.id.user.replace(/\D/g, '');
        if (PHONE_VALIDATION_PATTERN.test(phoneNumber)) {
          console.log(`   ✅ Número real encontrado: ${phoneNumber}`);
        } else {
          console.log(`   ⚠️ contact.id.user no es un número válido: ${contact.id.user}`);
        }
      }
      
      if (contact.number) {
        const phoneNumber = contact.number.replace(/\D/g, '');
        if (PHONE_VALIDATION_PATTERN.test(phoneNumber)) {
          console.log(`   ✅ Número desde contact.number: ${phoneNumber}`);
        } else {
          console.log(`   ⚠️ contact.number no es válido: ${contact.number}`);
        }
      }
    } else {
      console.log('   ❌ No se pudo obtener el contacto');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Método 2: Intentar con getNumberId
  console.log('\n📱 Método 2: client.getNumberId()');
  try {
    const phoneFormatted = testId.includes('@') ? testId : `${testId}@c.us`;
    console.log(`   Intentando con: ${phoneFormatted}`);
    
    const numberId = await client.getNumberId(phoneFormatted);
    
    if (numberId) {
      console.log('   ✅ NumberId obtenido');
      console.log('   📋 Datos:');
      console.log('      - numberId:', numberId);
      console.log('      - numberId._serialized:', numberId._serialized);
      
      if (numberId._serialized) {
        const userId = numberId._serialized.split('@')[0];
        const phoneNumber = userId.replace(/\D/g, '');
        if (PHONE_VALIDATION_PATTERN.test(phoneNumber)) {
          console.log(`   ✅ Número real encontrado: ${phoneNumber}`);
        } else {
          console.log(`   ⚠️ numberId no es un número válido: ${userId}`);
        }
      }
    } else {
      console.log('   ❌ getNumberId retornó null');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Método 3: Simular un mensaje recibido
  console.log('\n📱 Método 3: Simular mensaje recibido');
  try {
    // Crear un objeto de mensaje simulado
    const mockMessage = {
      from: testId.includes('@') ? testId : `${testId}@c.us`,
      fromMe: false,
      getContact: async () => {
        return await client.getContactById(testId.includes('@') ? testId : `${testId}@c.us`);
      }
    };

    const contact = await mockMessage.getContact();
    if (contact && contact.id && contact.id.user) {
      const phoneNumber = contact.id.user.replace(/\D/g, '');
      if (PHONE_VALIDATION_PATTERN.test(phoneNumber)) {
        console.log(`   ✅ Número real desde mensaje simulado: ${phoneNumber}`);
      } else {
        console.log(`   ⚠️ contact.id.user no es válido: ${contact.id.user}`);
      }
    } else {
      console.log('   ❌ No se pudo obtener contacto desde mensaje simulado');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Método 4: Buscar en los chats recientes
  console.log('\n📱 Método 4: Buscar en chats recientes');
  try {
    const chats = await client.getChats();
    console.log(`   ✅ Se obtuvieron ${chats.length} chats`);
    
    // Buscar el chat que coincida con el ID
    const matchingChat = chats.find(chat => {
      const chatId = chat.id._serialized || chat.id;
      return chatId.includes(testId) || testId.includes(chatId.split('@')[0]);
    });

    if (matchingChat) {
      console.log('   ✅ Chat encontrado');
      console.log('   📋 Datos del chat:');
      console.log('      - chat.id:', matchingChat.id);
      console.log('      - chat.id.user:', matchingChat.id?.user);
      console.log('      - chat.id._serialized:', matchingChat.id?._serialized);
      
      if (matchingChat.id && matchingChat.id.user) {
        const phoneNumber = matchingChat.id.user.replace(/\D/g, '');
        if (PHONE_VALIDATION_PATTERN.test(phoneNumber)) {
          console.log(`   ✅ Número real desde chat: ${phoneNumber}`);
        } else {
          console.log(`   ⚠️ chat.id.user no es válido: ${matchingChat.id.user}`);
        }
      }
    } else {
      console.log('   ⚠️ No se encontró un chat que coincida');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Prueba completada');
  console.log('\n💡 Resumen:');
  console.log('   - Si algún método retornó un número válido (8-15 dígitos), ese es el número real');
  console.log('   - Si todos retornaron IDs largos, WhatsApp no expone el número para ese contacto');
  console.log('   - En ese caso, el número debe obtenerse cuando el usuario envía un mensaje\n');

  // Cerrar el cliente
  try {
    await client.destroy();
  } catch (e) {
    // Ignorar errores al cerrar
  }

  process.exit(0);
}

// Ejecutar
testPhoneExtraction().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
