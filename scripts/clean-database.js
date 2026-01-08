// Script para limpiar la base de datos (eliminar todos los clientes y sesiones)
import { getPrisma } from '../src/config/database.js';

async function cleanDatabase() {
  const db = getPrisma();
  
  try {
    console.log('\n🗑️ Limpiando base de datos...\n');
    
    // Contar antes de eliminar
    const sessionsCount = await db.whatsAppSession.count();
    const clientsCount = await db.client.count();
    const configsCount = await db.clientConfig.count();
    
    console.log(`📊 Estado actual:`);
    console.log(`   Sesiones: ${sessionsCount}`);
    console.log(`   Clientes: ${clientsCount}`);
    console.log(`   Configuraciones: ${configsCount}`);
    
    if (sessionsCount === 0 && clientsCount === 0) {
      console.log('\n✅ La base de datos ya está vacía.\n');
      return;
    }
    
    // Eliminar en orden (respetando foreign keys)
    // 1. Eliminar configuraciones (depende de clientes)
    if (configsCount > 0) {
      await db.clientConfig.deleteMany({});
      console.log(`✅ ${configsCount} configuración(es) eliminada(s)`);
    }
    
    // 2. Eliminar sesiones (depende de clientes)
    if (sessionsCount > 0) {
      await db.whatsAppSession.deleteMany({});
      console.log(`✅ ${sessionsCount} sesión(es) eliminada(s)`);
    }
    
    // 3. Eliminar clientes
    if (clientsCount > 0) {
      await db.client.deleteMany({});
      console.log(`✅ ${clientsCount} cliente(s) eliminado(s)`);
    }
    
    console.log('\n✅ Base de datos limpiada exitosamente.\n');
    
    // Verificar estado final
    const finalSessions = await db.whatsAppSession.count();
    const finalClients = await db.client.count();
    const finalConfigs = await db.clientConfig.count();
    
    console.log(`📊 Estado final:`);
    console.log(`   Sesiones: ${finalSessions}`);
    console.log(`   Clientes: ${finalClients}`);
    console.log(`   Configuraciones: ${finalConfigs}\n`);
    
  } catch (error) {
    console.error('❌ Error limpiando base de datos:', error.message);
    console.error(error.stack);
  } finally {
    await db.$disconnect();
  }
}

cleanDatabase();

