// Función para iniciar sesión de un cliente (generar QR)
import inquirer from 'inquirer';
import { loadSessions, sessionExists, getPort } from '../sessionHelpers.js';
import { getPrisma } from '../../../config/database.js';

/**
 * Inicia la sesión de un cliente (genera QR)
 * @param {SessionManager|null} sessionManager - Manager de sesiones (null si el bot no está corriendo)
 */
export async function startSession(sessionManager = null) {
  const sessions = await loadSessions();

  if (sessions.length === 0) {
    console.log('\n⚠️ No hay clientes configurados.\n');
    return;
  }

  console.log('\n🚀 Iniciar Sesión de un Cliente\n');
  console.log('💡 Esta opción generará el QR para escanear con WhatsApp.\n');

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

  const { sessionToStart } = await inquirer.prompt([
    {
      type: 'list',
      name: 'sessionToStart',
      message: 'Selecciona la sesión para iniciar:',
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
      where: { session_name: sessionToStart },
      include: {
        client: true
      }
    });
  } catch (err) {
    // Ignorar si no hay DB
  }

  const isMaster = sessionData?.session_type === 'master';
  const typeLabel = isMaster ? 'Número Maestro' : 'Cliente';
  
  console.log(`\n📱 ${typeLabel}: ${sessionToStart}`);
  if (sessionData) {
    console.log(`   Estado actual: ${sessionData.status}`);
    console.log(`   Tipo: ${isMaster ? '📞 Maestro (Empresa)' : '👤 Cliente'}`);
    if (!isMaster && sessionData.client) {
      console.log(`   Cliente: ${sessionData.client.name}`);
    }
  }
  console.log('');

  // Si el bot no está corriendo, informar
  if (!sessionManager) {
    console.log('⚠️ El bot no está corriendo.');
    console.log('💡 Inicia el bot primero para poder generar el QR.\n');
    return;
  }

  // Verificar si la sesión ya está conectada
  const currentSession = sessionManager.getSession(sessionToStart);
  if (currentSession?.isReady) {
    console.log('✅ Esta sesión ya está conectada.');
    console.log(`💡 Link del QR: http://localhost:${getPort()}/qr/${sessionToStart}`);
    console.log('💡 Si quieres cambiar el WhatsApp, usa la opción "🔄 Cambiar WhatsApp".\n');
    return;
  }

  console.log(`🔄 Iniciando sesión para "${sessionToStart}"...`);

  try {
    await sessionManager.startSession(sessionToStart);
    console.log(`✅ Sesión "${sessionToStart}" iniciada. El QR se está generando...`);
    
    // Actualizar estado en DB si existe
    if (sessionData) {
      try {
        const db = getPrisma();
        await db.whatsAppSession.update({
          where: { session_name: sessionToStart },
          data: { 
            status: 'qr_pending'
          }
        });
        console.log('✅ Estado actualizado en la base de datos');
      } catch (err) {
        // Ignorar si no hay DB
      }
    }

    console.log('\n📱 Próximos pasos:');
    console.log(`1. Abre en tu navegador: http://localhost:${getPort()}/qr/${sessionToStart}`);
    console.log(`2. Espera unos segundos a que aparezca el QR`);
    console.log(`3. Escanea el QR con WhatsApp en tu celular`);
    console.log(`4. La sesión se guardará automáticamente después de escanear\n`);
  } catch (err) {
    console.log(`⚠️ Error iniciando sesión: ${err?.message || err}`);
  }
}

