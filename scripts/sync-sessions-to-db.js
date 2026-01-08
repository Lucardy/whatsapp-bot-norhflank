// Script para sincronizar sesiones del archivo con la base de datos
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPrisma } from '../src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../');
const CONFIG_FILE = path.join(PROJECT_ROOT, 'sessions-config.json');

async function syncSessions() {
  const db = getPrisma();
  
  try {
    // Leer sesiones del archivo
    let fileSessions = [];
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(data);
      fileSessions = config.sessions || [];
    }
    
    console.log(`\n📋 Sesiones en archivo: ${fileSessions.length}`);
    fileSessions.forEach(s => console.log(`   - ${s}`));
    
    // Leer sesiones de la base de datos
    const dbSessions = await db.whatsAppSession.findMany({
      select: {
        session_name: true,
        session_type: true
      }
    });
    
    console.log(`\n📋 Sesiones en base de datos: ${dbSessions.length}`);
    dbSessions.forEach(s => {
      const typeLabel = s.session_type === 'master' ? '📞 MASTER' : '👤 CLIENT';
      console.log(`   ${typeLabel} - ${s.session_name}`);
    });
    
    // Buscar sesiones que están en el archivo pero no en la DB
    const dbSessionNames = new Set(dbSessions.map(s => s.session_name));
    const missingSessions = fileSessions.filter(s => !dbSessionNames.has(s));
    
    if (missingSessions.length > 0) {
      console.log(`\n⚠️ Sesiones en archivo pero no en DB: ${missingSessions.length}`);
      
      for (const sessionName of missingSessions) {
        console.log(`\n🔧 Creando sesión "${sessionName}" en la base de datos...`);
        
        // Preguntar el tipo (por defecto asumir que es client, pero podemos verificar)
        // Por ahora, vamos a crear todas como 'client' y luego el usuario puede corregir
        // O podemos intentar detectar si el nombre sugiere que es master
        
        const isMaster = sessionName.toLowerCase().includes('master') || 
                        sessionName.toLowerCase().includes('unikuo') && 
                        (sessionName.toLowerCase().includes('11') || sessionName.toLowerCase().includes('4'));
        
        // Buscar o crear cliente
        let client;
        if (isMaster) {
          client = await db.client.findFirst({
            where: { name: 'MASTER' }
          });
          
          if (!client) {
            client = await db.client.create({
              data: {
                name: 'MASTER',
                status: 'active',
                contact_phone: null,
                contact_email: null
              }
            });
            console.log(`   ✅ Cliente "MASTER" creado`);
          }
        } else {
          client = await db.client.findFirst({
            where: { name: sessionName }
          });
          
          if (!client) {
            client = await db.client.create({
              data: {
                name: sessionName,
                status: 'trial',
                contact_phone: null,
                contact_email: null
              }
            });
            console.log(`   ✅ Cliente "${sessionName}" creado`);
          }
        }
        
        // Crear sesión
        const sessionType = isMaster ? 'master' : 'client';
        await db.whatsAppSession.create({
          data: {
            client_id: client.id,
            session_name: sessionName,
            session_type: sessionType,
            status: 'qr_pending'
          }
        });
        
        const typeLabel = sessionType === 'master' ? '📞 MASTER' : '👤 CLIENT';
        console.log(`   ✅ Sesión "${sessionName}" creada como ${typeLabel}`);
      }
    } else {
      console.log(`\n✅ Todas las sesiones están sincronizadas`);
    }
    
    // Mostrar resumen final
    const finalSessions = await db.whatsAppSession.findMany({
      select: {
        session_name: true,
        session_type: true
      }
    });
    
    console.log(`\n📊 Resumen final:`);
    finalSessions.forEach(s => {
      const typeLabel = s.session_type === 'master' ? '📞 MASTER' : '👤 CLIENT';
      console.log(`   ${typeLabel} - ${s.session_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await db.$disconnect();
  }
}

syncSessions();

