// Función para listar sesiones configuradas
import { loadSessions, sessionExists } from '../sessionHelpers.js';
import { getPrisma } from '../../../config/database.js';

/**
 * Lista todas las sesiones configuradas
 */
export async function listSessions() {
  const sessions = await loadSessions();

  console.log('\n📋 Sesiones Configuradas\n');

  if (sessions.length === 0) {
    console.log('   ⚠️ No hay sesiones configuradas.\n');
    return;
  }

  // Obtener información de la base de datos para mostrar el tipo
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

  // Separar sesiones maestro y clientes
  const masterSessions = [];
  const clientSessions = [];

  sessions.forEach((session) => {
    const exists = sessionExists(session);
    const status = exists ? '✅' : '⚠️';
    const type = sessionInfo.get(session) || 'client';
    const info = {
      name: session,
      exists,
      status,
      type
    };
    
    if (type === 'master') {
      masterSessions.push(info);
    } else {
      clientSessions.push(info);
    }
  });

  // Mostrar sesiones maestro primero
  if (masterSessions.length > 0) {
    console.log('   📞 NÚMEROS MAESTRO (Empresa):');
    masterSessions.forEach((info, index) => {
      console.log(`      ${index + 1}. ${info.status} ${info.name} ${info.exists ? '(existe)' : '(no existe físicamente)'} - 🔑 MAESTRO`);
    });
    console.log('');
  }

  // Mostrar clientes
  if (clientSessions.length > 0) {
    console.log('   👤 CLIENTES:');
    clientSessions.forEach((info, index) => {
      console.log(`      ${index + 1}. ${info.status} ${info.name} ${info.exists ? '(existe)' : '(no existe físicamente)'}`);
    });
    console.log('');
  }

  console.log('');
}

