// Función para eliminar sesión/cliente
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { loadSessions, saveSessions, sessionExists, getSessionPath } from '../sessionHelpers.js';

/**
 * Elimina una sesión/cliente
 * @param {SessionManager|null} sessionManager - Manager de sesiones (null si el bot no está corriendo)
 */
export async function removeSession(sessionManager = null) {
  const sessions = await loadSessions();

  if (sessions.length === 0) {
    console.log('\n⚠️ No hay clientes configurados para eliminar.\n');
    return;
  }

  console.log('\n➖ Eliminar Sesión\n');

  // Obtener información de tipo de sesión desde la DB
  const sessionInfo = new Map();
  try {
    const { getPrisma } = await import('../../../config/database.js');
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

  const { sessionToRemove } = await inquirer.prompt([
    {
      type: 'list',
      name: 'sessionToRemove',
      message: 'Selecciona la sesión a eliminar:',
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

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `¿Estás seguro de eliminar el cliente "${sessionToRemove}"?`,
      default: false
    }
  ]);

  if (confirm) {
    console.log(`\n🔄 Eliminando cliente "${sessionToRemove}" completamente...`);
    
    // Si el bot está corriendo, eliminar dinámicamente
    if (sessionManager) {
      try {
        // Hacer logout y destruir cliente
        const sessionData = sessionManager.getSession(sessionToRemove);
        if (sessionData?.client) {
          try {
            await sessionData.client.logout().catch(() => {});
            await sessionData.client.destroy();
            console.log(`✅ Cliente desconectado y destruido`);
          } catch (err) {
            console.log(`⚠️ Error destruyendo cliente: ${err?.message || err}`);
          }
        }
        
        // Eliminar del manager
        await sessionManager.destroySession(sessionToRemove, true);
        console.log(`✅ Sesión "${sessionToRemove}" eliminada del bot`);
      } catch (err) {
        console.log(`⚠️ Error eliminando sesión: ${err?.message || err}`);
      }
    }
    
    // Eliminar carpeta física COMPLETA (esto elimina todo: autenticación, cache, etc.)
    const sessionPath = getSessionPath(sessionToRemove);
    if (fs.existsSync(sessionPath)) {
      // Esperar un poco para asegurar que el cliente se desconectó completamente
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Intentar eliminar con retry en caso de error de permisos
      let retries = 3;
      let deleted = false;
      
      while (retries > 0 && !deleted) {
        try {
          fs.rmSync(sessionPath, { recursive: true, force: true });
          console.log(`✅ Carpeta completa eliminada: ${sessionPath}`);
          console.log(`   (Incluye autenticación, cache y todos los datos)`);
          deleted = true;
        } catch (err) {
          retries--;
          if (retries > 0) {
            console.log(`⚠️ Error eliminando carpeta (intentos restantes: ${retries}), reintentando en 1 segundo...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.log(`⚠️ Error eliminando carpeta después de varios intentos: ${err.message}`);
            console.log(`💡 Puede que algunos archivos estén en uso. Intenta eliminar manualmente: ${sessionPath}`);
            
            // Intentar eliminar solo autenticación como fallback
            const authPath = path.join(sessionPath, '.wwebjs_auth');
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
      }
    }
    
    // Eliminar de la base de datos si existe
    try {
      const { getPrisma } = await import('../../../config/database.js');
      const db = getPrisma();
      await db.whatsAppSession.deleteMany({
        where: { session_name: sessionToRemove }
      });
      console.log(`✅ Cliente "${sessionToRemove}" eliminado de la base de datos`);
    } catch (err) {
      // Si no hay DB, continuar
    }
    
    // Eliminar de la configuración (archivo)
    const newSessions = sessions.filter(s => s !== sessionToRemove);
    await saveSessions(newSessions);
    console.log(`✅ Cliente "${sessionToRemove}" eliminado de la configuración`);
    
    console.log(`\n✅ Cliente "${sessionToRemove}" eliminado COMPLETAMENTE`);
    console.log(`💡 Todos los datos fueron eliminados. Puedes crear una nueva sesión desde cero.\n`);
  } else {
    console.log('\n❌ Operación cancelada');
  }
}

