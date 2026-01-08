// Script para verificar y corregir el tipo de sesión
import { getPrisma } from '../src/config/database.js';

async function fixSessionType() {
  const db = getPrisma();
  
  try {
    // Listar todas las sesiones
    const sessions = await db.whatsAppSession.findMany({
      select: {
        id: true,
        session_name: true,
        session_type: true,
        client: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log('\n📋 Sesiones en la base de datos:\n');
    sessions.forEach(session => {
      const typeLabel = session.session_type === 'master' ? '📞 MASTER' : '👤 CLIENT';
      console.log(`${typeLabel} - ${session.session_name} (Cliente: ${session.client?.name || 'N/A'})`);
    });
    
    // Buscar sesión específica
    const sessionName = process.argv[2] || 'unikuo11';
    const session = await db.whatsAppSession.findUnique({
      where: { session_name: sessionName }
    });
    
    if (session) {
      console.log(`\n🔍 Sesión "${sessionName}":`);
      console.log(`   Tipo actual: ${session.session_type}`);
      console.log(`   Cliente ID: ${session.client_id}`);
      
      // Si el usuario quiere cambiar el tipo
      if (process.argv[3]) {
        const newType = process.argv[3]; // 'master' o 'client'
        if (newType === 'master' || newType === 'client') {
          await db.whatsAppSession.update({
            where: { session_name: sessionName },
            data: { session_type: newType }
          });
          console.log(`\n✅ Tipo de sesión "${sessionName}" actualizado a "${newType}"`);
        } else {
          console.log(`\n❌ Tipo inválido. Usa "master" o "client"`);
        }
      } else {
        console.log(`\n💡 Para cambiar el tipo, ejecuta:`);
        console.log(`   node scripts/fix-session-type.js ${sessionName} master`);
        console.log(`   o`);
        console.log(`   node scripts/fix-session-type.js ${sessionName} client`);
      }
    } else {
      console.log(`\n❌ Sesión "${sessionName}" no encontrada`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.$disconnect();
  }
}

fixSessionType();

