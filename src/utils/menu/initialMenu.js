// Menú inicial al arrancar el bot
import inquirer from 'inquirer';
import { loadSessions } from './sessionHelpers.js';
import { showSessionManagementMenu } from './mainMenu.js';

/**
 * Muestra el menú inicial al arrancar el bot
 * @param {SessionManager|null} sessionManager - Manager de sesiones (null si el bot no está corriendo)
 * @param {boolean} isBotRunning - Indica si el bot está corriendo
 */
export async function showInitialMenu(sessionManager = null, isBotRunning = false) {
  const sessions = await loadSessions();

  console.log('\n🚀 ============================================');
  console.log('   WHATSAPP BOT - MENÚ PRINCIPAL');
  console.log('============================================\n');
        // Obtener información de tipo de sesión desde la DB
        const sessionInfo = new Map();
        try {
          const { getPrisma } = await import('../../config/database.js');
          const db = getPrisma();
          const dbSessions = await db.whatsAppSession.findMany({
            where: {
              session_name: { in: sessions }
            },
            select: {
              session_name: true,
              session_type: true
            }
          });
          
          dbSessions.forEach(s => {
            sessionInfo.set(s.session_name, s.session_type);
          });
        } catch (err) {
          // Si no hay DB, continuar sin información de tipo
        }
        
        console.log(`📋 Sesiones configuradas: ${sessions.length}`);
        if (sessions.length > 0) {
          // Separar y mostrar primero maestros, luego clientes
          const masters = sessions.filter(s => sessionInfo.get(s) === 'master');
          const clients = sessions.filter(s => sessionInfo.get(s) !== 'master');
          
          if (masters.length > 0) {
            console.log(`   📞 Números Maestro:`);
            masters.forEach((s, i) => console.log(`      ${i + 1}. ${s} 🔑`));
          }
          
          if (clients.length > 0) {
            console.log(`   👤 Clientes:`);
            clients.forEach((s, i) => console.log(`      ${i + 1}. ${s}`));
          }
        }
  console.log('');

  if (isBotRunning) {
    console.log('💡 El bot está corriendo. Puedes gestionar sesiones o detener el bot.\n');
  }

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '¿Qué quieres hacer?',
      choices: [
        ...(isBotRunning ? [] : [{ name: '▶️  Iniciar bot', value: 'start' }]),
        { name: '⚙️  Gestionar clientes / sesiones', value: 'manage' },
        ...(isBotRunning ? [{ name: '🛑 Detener bot', value: 'stop' }] : []),
        { name: '❌ Salir', value: 'exit' }
      ]
    }
  ]);

  switch (action) {
    case 'start':
      return { shouldStart: true, shouldManage: false, shouldStop: false };
    case 'manage':
      // Gestionar sesiones (puede volver al menú o continuar)
      const manageResult = await showSessionManagementMenu(sessionManager, isBotRunning);
      // Si el bot no está corriendo y el usuario quiere continuar, iniciar bot
      if (!isBotRunning && manageResult === true) {
        return { shouldStart: true, shouldManage: true, shouldStop: false };
      }
      // Volver al menú principal
      return await showInitialMenu(sessionManager, isBotRunning);
    case 'stop':
      return { shouldStart: false, shouldManage: false, shouldStop: true };
    case 'exit':
      console.log('\n👋 ¡Hasta luego!\n');
      process.exit(0);
  }
}

