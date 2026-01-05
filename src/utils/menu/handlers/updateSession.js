// Función para actualizar sesión/cliente existente
import inquirer from 'inquirer';
import fs from 'fs';
import { loadSessions, sessionExists, getSessionPath, saveSessionsToFile, getSessionPath as getNewSessionPath } from '../sessionHelpers.js';
import { getPrisma } from '../../../config/database.js';

/**
 * Actualiza una sesión/cliente existente
 */
export async function updateSession() {
  const sessions = await loadSessions();

  if (sessions.length === 0) {
    console.log('\n⚠️ No hay clientes configurados para actualizar.\n');
    return;
  }

  console.log('\n✏️  Actualizar Cliente\n');

  const { sessionToUpdate } = await inquirer.prompt([
    {
      type: 'list',
      name: 'sessionToUpdate',
      message: 'Selecciona el cliente a actualizar:',
      choices: sessions.map(s => ({
        name: `${s} ${sessionExists(s) ? '(existe físicamente)' : '(no existe)'}`,
        value: s
      }))
    }
  ]);

  // Cargar información actual de la sesión desde DB si existe
  let currentSessionData = null;
  let availableClients = [];
  
  try {
    const db = getPrisma();
    currentSessionData = await db.whatsAppSession.findUnique({
      where: { session_name: sessionToUpdate },
      include: {
        client: {
          include: {
            plan: true
          }
        }
      }
    });

    // Cargar lista de clientes disponibles
    availableClients = await db.client.findMany({
      where: {
        status: {
          in: ['active', 'trial']
        }
      },
      select: {
        id: true,
        name: true,
        status: true
      },
      orderBy: {
        name: 'asc'
      }
    });
  } catch (err) {
    // Si no hay DB, continuar sin datos de DB
  }

  console.log(`\n📋 Información actual del cliente "${sessionToUpdate}":`);
  if (currentSessionData) {
    console.log(`   Cliente: ${currentSessionData.client.name} (ID: ${currentSessionData.client_id})`);
    console.log(`   Estado: ${currentSessionData.status}`);
    console.log(`   Teléfono: ${currentSessionData.phone_number || 'No configurado'}`);
  } else {
    console.log('   (No hay información en la base de datos)');
  }
  console.log('');

  // Opciones de actualización
  const { updateField } = await inquirer.prompt([
    {
      type: 'list',
      name: 'updateField',
      message: '¿Qué quieres actualizar?',
      choices: [
        { name: '📝 Renombrar cliente (cambiar nombre)', value: 'rename' },
        { name: '👤 Cambiar cliente asociado', value: 'client' },
        { name: '📱 Actualizar número de teléfono', value: 'phone' },
        { name: '🔄 Actualizar estado', value: 'status' },
        { name: '❌ Cancelar', value: 'cancel' }
      ]
    }
  ]);

  if (updateField === 'cancel') {
    console.log('\n❌ Operación cancelada');
    return;
  }

  try {
    const db = getPrisma();

    switch (updateField) {
      case 'rename': {
        const { newName } = await inquirer.prompt([
          {
            type: 'input',
            name: 'newName',
            message: 'Ingresa el nuevo nombre del cliente:',
            default: sessionToUpdate,
            validate: (input) => {
              if (!input || input.trim().length === 0) {
                return 'El nombre no puede estar vacío';
              }
              if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
                return 'El nombre solo puede contener letras, números, guiones y guiones bajos';
              }
              if (input !== sessionToUpdate && sessions.includes(input)) {
                return 'Ya existe un cliente con ese nombre';
              }
              return true;
            }
          }
        ]);

        if (newName !== sessionToUpdate) {
          // Actualizar en DB si existe
          if (currentSessionData) {
            await db.whatsAppSession.update({
              where: { session_name: sessionToUpdate },
              data: { session_name: newName }
            });
            console.log(`\n✅ Cliente actualizado en la base de datos: "${sessionToUpdate}" → "${newName}"`);
          }

          // Actualizar en archivo
          const newSessions = sessions.map(s => s === sessionToUpdate ? newName : s);
          saveSessionsToFile(newSessions);
          console.log(`✅ Cliente renombrado en configuración: "${sessionToUpdate}" → "${newName}"`);

          // Renombrar carpeta física si existe
          const oldPath = getNewSessionPath(sessionToUpdate);
          const newPath = getNewSessionPath(newName);
          if (fs.existsSync(oldPath)) {
            const { renameFolder } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'renameFolder',
                message: `¿Renombrar también la carpeta física? (${oldPath} → ${newPath})`,
                default: true
              }
            ]);

            if (renameFolder) {
              try {
                fs.renameSync(oldPath, newPath);
                console.log(`✅ Carpeta renombrada: ${oldPath} → ${newPath}`);
              } catch (err) {
                console.log(`⚠️ Error al renombrar carpeta: ${err.message}`);
                console.log(`💡 Puedes renombrarla manualmente después`);
              }
            }
          }
        } else {
          console.log('\n⚠️ El nombre es el mismo, no se realizaron cambios');
        }
        break;
      }

      case 'client': {
        if (availableClients.length === 0) {
          console.log('\n⚠️ No hay clientes disponibles en la base de datos.');
          console.log('💡 Asegúrate de tener clientes creados en la DB.\n');
          return;
        }

        const { clientId } = await inquirer.prompt([
          {
            type: 'list',
            name: 'clientId',
            message: 'Selecciona el nuevo cliente:',
            choices: availableClients.map(c => ({
              name: `${c.name} (${c.status})`,
              value: c.id
            }))
          }
        ]);

        if (currentSessionData) {
          await db.whatsAppSession.update({
            where: { session_name: sessionToUpdate },
            data: { client_id: clientId }
          });
          const selectedClient = availableClients.find(c => c.id === clientId);
          console.log(`\n✅ Cliente actualizado: "${currentSessionData.client.name}" → "${selectedClient.name}"`);
        } else {
          console.log('\n⚠️ Esta sesión no existe en la base de datos.');
          console.log('💡 Solo las sesiones en la DB pueden tener cliente asociado.\n');
        }
        break;
      }

      case 'phone': {
        const { phoneNumber } = await inquirer.prompt([
          {
            type: 'input',
            name: 'phoneNumber',
            message: 'Ingresa el número de teléfono (o deja vacío para eliminar):',
            default: currentSessionData?.phone_number || '',
            validate: (input) => {
              if (input && !/^\+?[0-9\s-]+$/.test(input.trim())) {
                return 'Formato de teléfono inválido';
              }
              return true;
            }
          }
        ]);

        if (currentSessionData) {
          await db.whatsAppSession.update({
            where: { session_name: sessionToUpdate },
            data: { phone_number: phoneNumber.trim() || null }
          });
          console.log(`\n✅ Número de teléfono actualizado: ${phoneNumber.trim() || '(eliminado)'}`);
        } else {
          console.log('\n⚠️ Esta sesión no existe en la base de datos.');
          console.log('💡 Solo las sesiones en la DB pueden tener número de teléfono.\n');
        }
        break;
      }

      case 'status': {
        const { status } = await inquirer.prompt([
          {
            type: 'list',
            name: 'status',
            message: 'Selecciona el nuevo estado:',
            choices: [
              { name: 'qr_pending - Esperando escaneo de QR', value: 'qr_pending' },
              { name: 'connecting - Conectando', value: 'connecting' },
              { name: 'connected - Conectado', value: 'connected' },
              { name: 'disconnected - Desconectado', value: 'disconnected' },
              { name: 'error - Error', value: 'error' }
            ],
            default: currentSessionData?.status || 'qr_pending'
          }
        ]);

        if (currentSessionData) {
          await db.whatsAppSession.update({
            where: { session_name: sessionToUpdate },
            data: { status }
          });
          console.log(`\n✅ Estado actualizado: "${currentSessionData.status}" → "${status}"`);
        } else {
          console.log('\n⚠️ Esta sesión no existe en la base de datos.');
          console.log('💡 Solo las sesiones en la DB pueden tener estado.\n');
        }
        break;
      }
    }
  } catch (err) {
    console.error('\n❌ Error actualizando cliente:', err.message);
    if (err.code === 'P2002') {
      console.log('💡 Ya existe un cliente con ese nombre en la base de datos.');
    }
  }
}

