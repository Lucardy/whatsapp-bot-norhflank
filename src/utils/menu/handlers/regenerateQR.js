// Función para regenerar QR / cambiar WhatsApp de un cliente
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { loadSessions, sessionExists, getSessionPath, getAuthPath, getPort } from '../sessionHelpers.js';
import { getPrisma } from '../../../config/database.js';

/**
 * Regenera QR / cambia WhatsApp de un cliente
 * @param {SessionManager|null} sessionManager - Manager de sesiones (null si el bot no está corriendo)
 */
export async function regenerateQR(sessionManager = null) {
  const sessions = await loadSessions();

  if (sessions.length === 0) {
    console.log('\n⚠️ No hay clientes configurados.\n');
    return;
  }

  console.log('\n🔄 Cambiar WhatsApp de un Cliente\n');
  console.log('💡 Esta opción eliminará COMPLETAMENTE la sesión actual y creará una nueva.');
  console.log('💡 Perfecto para cambiar el WhatsApp asociado a un cliente.\n');

  // Obtener información de tipo de sesión desde la DB
  const sessionInfo = new Map();
  try {
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

  const { sessionToReconnect } = await inquirer.prompt([
    {
      type: 'list',
      name: 'sessionToReconnect',
      message: 'Selecciona la sesión:',
      choices: sessions.map(s => {
        const type = sessionInfo.get(s) || 'client';
        const typeLabel = type === 'master' ? '📞 MAESTRO' : '👤 Cliente';
        return {
          name: `${typeLabel} - ${s} ${sessionExists(s) ? '(existe físicamente)' : '(no existe)'}`,
          value: s
        };
      })
    }
  ]);

  // Verificar estado en DB si existe
  let sessionData = null;
  try {
    const db = getPrisma();
    sessionData = await db.whatsAppSession.findUnique({
      where: { session_name: sessionToReconnect },
      include: {
        client: true
      }
    });
  } catch (err) {
    // Ignorar si no hay DB
  }

  const isMaster = sessionData?.session_type === 'master';
  const typeLabel = isMaster ? 'Número Maestro' : 'Cliente';
  
  console.log(`\n📱 ${typeLabel}: ${sessionToReconnect}`);
  if (sessionData) {
    console.log(`   Estado actual: ${sessionData.status}`);
    console.log(`   Tipo: ${isMaster ? '📞 Maestro (Empresa)' : '👤 Cliente'}`);
    if (!isMaster && sessionData.client) {
      console.log(`   Cliente: ${sessionData.client.name}`);
    }
  }
  console.log('');

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: '¿Qué quieres hacer?',
      choices: [
        { name: '🗑️  Eliminar sesión completamente y crear nueva (recomendado)', value: 'reset_complete' },
        { name: '🔄 Solo resetear autenticación (mantener sesión)', value: 'reset' },
        { name: '❌ Cancelar', value: 'cancel' }
      ]
    }
  ]);

  if (action === 'cancel') {
    return;
  }

  if (action === 'instructions') {
    console.log('\n📖 Instrucciones para escanear QR:\n');
    console.log('1. Inicia el bot con: npm start');
    console.log('2. Elige "Iniciar bot directamente" o "Gestionar sesiones y luego iniciar bot"');
    console.log('3. Cuando el bot esté corriendo, abre en tu navegador:');
    console.log(`   http://localhost:${getPort()}/qr/${sessionToReconnect}`);
    console.log('4. Escanea el QR con WhatsApp en tu celular');
    console.log('5. Después de escanear, la sesión quedará guardada automáticamente');
    console.log('6. No necesitarás escanear el QR nuevamente en el futuro\n');
    return;
  }

  if (action === 'reset_complete') {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `¿Estás seguro de eliminar COMPLETAMENTE la sesión de "${sessionToReconnect}" y crear una nueva? Esto eliminará todos los datos y necesitarás escanear un nuevo QR.`,
        default: false
      }
    ]);

    if (!confirm) {
      console.log('\n❌ Operación cancelada');
      return;
    }

    console.log(`\n🗑️ Eliminando sesión completamente de "${sessionToReconnect}"...`);

    // Si el bot está corriendo, eliminar dinámicamente
    if (sessionManager) {
      try {
        // Hacer logout y destruir cliente
        const currentSessionData = sessionManager.getSession(sessionToReconnect);
        if (currentSessionData?.client) {
          try {
            await currentSessionData.client.logout().catch(() => {});
            await currentSessionData.client.destroy();
            console.log(`✅ Cliente desconectado y destruido`);
          } catch (err) {
            console.log(`⚠️ Error destruyendo cliente: ${err?.message || err}`);
          }
        }
        
        // Eliminar del manager
        await sessionManager.destroySession(sessionToReconnect, true);
        console.log(`✅ Sesión eliminada del bot`);
      } catch (err) {
        console.log(`⚠️ Error eliminando sesión: ${err?.message || err}`);
      }
    }

    // Eliminar carpeta COMPLETA (esto elimina todo)
    const sessionPath = getSessionPath(sessionToReconnect);
    if (fs.existsSync(sessionPath)) {
      try {
        fs.rmSync(sessionPath, { recursive: true, force: true });
        console.log(`✅ Carpeta completa eliminada: ${sessionPath}`);
        console.log(`   (Incluye autenticación, cache y todos los datos)`);
      } catch (err) {
        console.log(`⚠️ Error eliminando carpeta: ${err.message}`);
        // Intentar eliminar solo autenticación como fallback
        const authPath = getAuthPath(sessionToReconnect);
        if (fs.existsSync(authPath)) {
          try {
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log(`✅ Al menos la autenticación fue eliminada`);
          } catch (err2) {
            console.log(`⚠️ Error eliminando autenticación: ${err2.message}`);
          }
        }
      }
    }

    // Actualizar estado en DB si existe
    if (sessionData) {
      try {
        const db = getPrisma();
        await db.whatsAppSession.update({
          where: { session_name: sessionToReconnect },
          data: { 
            status: 'qr_pending',
            phone_number: null
          }
        });
        console.log('✅ Estado actualizado en la base de datos');
      } catch (err) {
        // Ignorar si no hay DB
      }
    }

    // Esperar un poco para asegurar que todo se limpió
    console.log('\n⏳ Esperando a que se limpie todo...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Crear nueva sesión desde cero usando resetSession con deleteAll=true
    console.log(`\n🆕 Creando nueva sesión para "${sessionToReconnect}"...`);
    if (sessionManager) {
      try {
        // Usar resetSession con deleteAll=false porque ya eliminamos todo manualmente
        // Crear nueva sesión desde cero (auto-inicializar para generar QR)
        await sessionManager.createSession(sessionToReconnect, true);
        const newSessionData = sessionManager.getSession(sessionToReconnect);
        if (newSessionData) {
          newSessionData.forceQR = true;
          newSessionData.isReady = false;
        }
        console.log(`✅ Nueva sesión creada. El QR se está generando...`);
      } catch (err) {
        console.log(`⚠️ Error creando nueva sesión: ${err?.message || err}`);
      }
    }

    console.log('\n📱 Próximos pasos:');
    if (sessionManager) {
      console.log(`1. Abre en tu navegador: http://localhost:${getPort()}/qr/${sessionToReconnect}`);
      console.log(`2. Espera unos segundos a que aparezca el QR`);
      console.log(`3. Escanea el nuevo QR con el nuevo WhatsApp`);
    } else {
      console.log('1. Elige "✅ Continuar e iniciar bot" en el menú');
      console.log('2. El bot iniciará automáticamente y generará el QR');
      console.log(`3. Abre en tu navegador: http://localhost:${getPort()}/qr/${sessionToReconnect}`);
      console.log('4. Escanea el QR con WhatsApp');
    }
    console.log('4. La sesión se guardará automáticamente después de escanear\n');
  }

  if (action === 'reset') {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `¿Estás seguro de resetear la autenticación de "${sessionToReconnect}"? Esto eliminará la autenticación guardada y necesitarás escanear un nuevo QR.`,
        default: false
      }
    ]);

    if (!confirm) {
      console.log('\n❌ Operación cancelada');
      return;
    }

    console.log(`\n🔄 Reseteando autenticación para "${sessionToReconnect}"...`);

    // Si el bot está corriendo, resetear dinámicamente
    if (sessionManager) {
      try {
        await sessionManager.resetSession(sessionToReconnect);
        console.log(`✅ Sesión "${sessionToReconnect}" reseteada`);
        console.log(`💡 El nuevo QR se está generando ahora...`);
      } catch (err) {
        console.log(`⚠️ Error reseteando sesión: ${err?.message || err}`);
      }
    }

    // Eliminar carpeta .wwebjs_auth para forzar nuevo QR
    const authPath = getAuthPath(sessionToReconnect);
    
    if (fs.existsSync(authPath)) {
      try {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log(`✅ Autenticación anterior eliminada`);
      } catch (err) {
        console.log(`⚠️ Error al eliminar autenticación: ${err.message}`);
      }
    }

    // Actualizar estado en DB si existe
    if (sessionData) {
      try {
        const db = getPrisma();
        await db.whatsAppSession.update({
          where: { session_name: sessionToReconnect },
          data: { 
            status: 'qr_pending',
            phone_number: null
          }
        });
        console.log('✅ Estado actualizado en la base de datos');
      } catch (err) {
        // Ignorar si no hay DB
      }
    }

    console.log('\n📱 Próximos pasos:');
    if (sessionManager) {
      console.log(`1. Abre en tu navegador: http://localhost:${getPort()}/qr/${sessionToReconnect}`);
      console.log(`2. Espera unos segundos a que aparezca el QR`);
      console.log(`3. Escanea el nuevo QR con el nuevo WhatsApp`);
    } else {
      console.log('1. Elige "✅ Continuar e iniciar bot" en el menú');
      console.log('2. El bot iniciará automáticamente y generará el QR');
      console.log(`3. Abre en tu navegador: http://localhost:${getPort()}/qr/${sessionToReconnect}`);
      console.log('4. Escanea el QR con WhatsApp');
    }
    console.log('4. La sesión se guardará automáticamente después de escanear\n');
  }
}

