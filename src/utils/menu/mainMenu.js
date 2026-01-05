// Menú principal de gestión de sesiones
import inquirer from 'inquirer';
import { loadSessions } from './sessionHelpers.js';
import { addSession } from './handlers/addSession.js';
import { removeSession } from './handlers/removeSession.js';
import { updateSession } from './handlers/updateSession.js';
import { regenerateQR } from './handlers/regenerateQR.js';
import { startSession } from './handlers/startSession.js';
import { listSessions } from './handlers/listSessions.js';

/**
 * Muestra el menú principal de gestión de sesiones
 * @param {SessionManager|null} sessionManager - Manager de sesiones (null si el bot no está corriendo)
 * @param {boolean} isBotRunning - Indica si el bot está corriendo
 */
export async function showSessionManagementMenu(sessionManager = null, isBotRunning = false) {
  const sessions = await loadSessions();

  console.log('\n📱 ============================================');
  console.log('   GESTOR DE CLIENTES / SESIONES');
  console.log('============================================\n');
  
  if (isBotRunning) {
    console.log('💡 El bot está corriendo. Los cambios se aplicarán inmediatamente.\n');
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '¿Qué quieres hacer?',
      choices: [
        { name: '➕ Agregar nueva sesión (maestro o cliente)', value: 'add' },
        { name: '🚀 Iniciar sesión de un cliente', value: 'start' },
        { name: '🔄 Cambiar WhatsApp de un cliente', value: 'reconnect' },
        { name: '✏️  Actualizar cliente existente', value: 'update' },
        { name: '🗑️  Eliminar cliente completamente', value: 'remove' },
        { name: '📋 Ver clientes configurados', value: 'list' },
        ...(isBotRunning ? [] : [{ name: '✅ Continuar e iniciar bot', value: 'continue' }]),
        { name: '❌ Salir / Volver', value: 'exit' }
      ]
    }
  ]);

  switch (action) {
    case 'add':
      await addSession(sessionManager);
      await showSessionManagementMenu(sessionManager, isBotRunning);
      break;
    case 'start':
      await startSession(sessionManager);
      await showSessionManagementMenu(sessionManager, isBotRunning);
      break;
    case 'update':
      await updateSession();
      await showSessionManagementMenu(sessionManager, isBotRunning);
      break;
    case 'reconnect':
      await regenerateQR(sessionManager);
      await showSessionManagementMenu(sessionManager, isBotRunning);
      break;
    case 'remove':
      await removeSession(sessionManager);
      await showSessionManagementMenu(sessionManager, isBotRunning);
      break;
    case 'list':
      await listSessions();
      await showSessionManagementMenu(sessionManager, isBotRunning);
      break;
    case 'continue':
      return true; // Continuar con el inicio del bot
    case 'exit':
      if (isBotRunning) {
        console.log('\n💡 Volviendo al bot. Los cambios ya están aplicados.\n');
        return false;
      }
      console.log('\n👋 ¡Hasta luego!\n');
      process.exit(0);
  }

  return false;
}

