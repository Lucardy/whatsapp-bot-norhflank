// Script interactivo para gestionar sesiones de WhatsApp
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, 'sessions-config.json');
const SESSION_BASE_DIR = process.env.SESSION_BASE_DIR || path.join(__dirname, 'sessions');
const PORT = process.env.PORT || 3000;

// Cargar configuración
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('❌ Error cargando configuración:', err.message);
  }
  return { sessions: [] };
}

// Guardar configuración
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    console.error('❌ Error guardando configuración:', err.message);
    return false;
  }
}

// Verificar si una sesión existe físicamente
function sessionExists(sessionId) {
  const sessionPath = path.join(SESSION_BASE_DIR, sessionId);
  return fs.existsSync(sessionPath);
}

// Menú principal
async function showMainMenu() {
  const config = loadConfig();
  const sessions = config.sessions || [];

  console.log('\n📱 ============================================');
  console.log('   GESTOR DE SESIONES DE WHATSAPP');
  console.log('============================================\n');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '¿Qué quieres hacer?',
      choices: [
        { name: '➕ Agregar nueva sesión', value: 'add' },
        { name: '➖ Eliminar sesión', value: 'remove' },
        { name: '📋 Ver sesiones configuradas', value: 'list' },
        { name: '🔗 Ver links de QR', value: 'qr' },
        { name: '❌ Salir', value: 'exit' }
      ]
    }
  ]);

  switch (action) {
    case 'add':
      await addSession(config);
      break;
    case 'remove':
      await removeSession(config);
      break;
    case 'list':
      await listSessions(config);
      break;
    case 'qr':
      await showQRLinks(config);
      break;
    case 'exit':
      console.log('\n👋 ¡Hasta luego!\n');
      process.exit(0);
  }

  // Volver al menú principal
  await showMainMenu();
}

// Agregar nueva sesión
async function addSession(config) {
  console.log('\n➕ Agregar Nueva Sesión\n');

  const { sessionName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'sessionName',
      message: 'Ingresa el nombre de la sesión (sin espacios, solo letras, números y guiones):',
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'El nombre no puede estar vacío';
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
          return 'El nombre solo puede contener letras, números, guiones y guiones bajos';
        }
        if ((config.sessions || []).includes(input)) {
          return 'Ya existe una sesión con ese nombre';
        }
        return true;
      }
    }
  ]);

  const sessions = config.sessions || [];
  sessions.push(sessionName);
  config.sessions = sessions;

  if (saveConfig(config)) {
    console.log(`\n✅ Sesión "${sessionName}" agregada exitosamente!`);
    
    // Crear carpeta de sesión si no existe
    const sessionPath = path.join(SESSION_BASE_DIR, sessionName);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
      console.log(`📁 Carpeta creada: ${sessionPath}`);
    }

    // Mostrar link del QR
    const qrLink = `http://localhost:${PORT}/qr/${sessionName}`;
    console.log(`\n🔗 Link del QR para escanear:`);
    console.log(`   ${qrLink}\n`);
    console.log('💡 Inicia el bot con "npm start" y luego abre este link en tu navegador para escanear el QR.\n');
  } else {
    console.log('\n❌ Error al guardar la configuración');
  }
}

// Eliminar sesión
async function removeSession(config) {
  const sessions = config.sessions || [];

  if (sessions.length === 0) {
    console.log('\n⚠️ No hay sesiones configuradas para eliminar.\n');
    return;
  }

  console.log('\n➖ Eliminar Sesión\n');

  const { sessionToRemove } = await inquirer.prompt([
    {
      type: 'list',
      name: 'sessionToRemove',
      message: 'Selecciona la sesión a eliminar:',
      choices: sessions.map(s => ({
        name: `${s} ${sessionExists(s) ? '(existe físicamente)' : '(no existe)'}`,
        value: s
      }))
    }
  ]);

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `¿Estás seguro de eliminar la sesión "${sessionToRemove}"?`,
      default: false
    }
  ]);

  if (confirm) {
    config.sessions = sessions.filter(s => s !== sessionToRemove);
    
    if (saveConfig(config)) {
      console.log(`\n✅ Sesión "${sessionToRemove}" eliminada de la configuración.`);
      
      // Preguntar si quiere eliminar también la carpeta física
      if (sessionExists(sessionToRemove)) {
        const { deleteFolder } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'deleteFolder',
            message: `¿Eliminar también la carpeta física de la sesión? (${path.join(SESSION_BASE_DIR, sessionToRemove)})`,
            default: false
          }
        ]);

        if (deleteFolder) {
          try {
            const sessionPath = path.join(SESSION_BASE_DIR, sessionToRemove);
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log(`✅ Carpeta eliminada: ${sessionPath}`);
          } catch (err) {
            console.log(`⚠️ Error al eliminar carpeta: ${err.message}`);
          }
        }
      }
    } else {
      console.log('\n❌ Error al guardar la configuración');
    }
  } else {
    console.log('\n❌ Operación cancelada');
  }
}

// Listar sesiones
async function listSessions(config) {
  const sessions = config.sessions || [];

  console.log('\n📋 Sesiones Configuradas\n');

  if (sessions.length === 0) {
    console.log('   ⚠️ No hay sesiones configuradas.\n');
    return;
  }

  sessions.forEach((session, index) => {
    const exists = sessionExists(session);
    const status = exists ? '✅' : '⚠️';
    console.log(`   ${index + 1}. ${status} ${session} ${exists ? '(existe)' : '(no existe físicamente)'}`);
  });

  console.log('');
}

// Mostrar links de QR
async function showQRLinks(config) {
  const sessions = config.sessions || [];

  console.log('\n🔗 Links de QR para Escanear\n');

  if (sessions.length === 0) {
    console.log('   ⚠️ No hay sesiones configuradas.\n');
    return;
  }

  sessions.forEach((session, index) => {
    const qrLink = `http://localhost:${PORT}/qr/${session}`;
    console.log(`   ${index + 1}. ${session}:`);
    console.log(`      ${qrLink}`);
  });

  console.log('\n💡 Inicia el bot con "npm start" y luego abre estos links en tu navegador.\n');
}

// Iniciar
console.log('\n🚀 Iniciando Gestor de Sesiones...\n');
showMainMenu().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});

