// Función para agregar nueva sesión/cliente
import inquirer from 'inquirer';
import fs from 'fs';
import { loadSessions, saveSessions, getSessionPath, getPort } from '../sessionHelpers.js';
import { validateSessionName, validateSessionType } from '../../../utils/validation.js';
import { ValidationError } from '../../../utils/errors.js';
import { handleError } from '../../../utils/errorHandler.js';

/**
 * Agrega una nueva sesión/cliente
 * @param {SessionManager|null} sessionManager - Manager de sesiones (null si el bot no está corriendo)
 */
export async function addSession(sessionManager = null) {
  console.log('\n➕ Agregar Nueva Sesión\n');

  const currentSessions = await loadSessions();

  // Primero preguntar el tipo de sesión
  const { sessionType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'sessionType',
      message: '¿Qué tipo de sesión quieres crear?',
      choices: [
        { 
          name: '📞 Número Maestro (Empresa) - Número principal donde se comunican los clientes', 
          value: 'master' 
        },
        { 
          name: '👤 Número de Cliente - WhatsApp de un cliente que usa el bot', 
          value: 'client' 
        }
      ]
    }
  ]);

  const isMaster = sessionType === 'master';
  const typeLabel = isMaster ? 'número maestro' : 'cliente';

  const { sessionName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'sessionName',
      message: `Ingresa el nombre del ${typeLabel} (sin espacios, solo letras, números y guiones):`,
      validate: (input) => {
        try {
          validateSessionName(input);
          if (currentSessions.includes(input)) {
            return 'Ya existe una sesión con ese nombre';
          }
          return true;
        } catch (error) {
          if (error instanceof ValidationError) {
            return error.message;
          }
          return 'Error validando el nombre';
        }
      }
    }
  ]);

  // Validar también el tipo de sesión
  try {
    validateSessionType(sessionType);
  } catch (error) {
    handleError(error, 'addSession');
    console.log(`❌ Error: ${error.message}`);
    return;
  }

  const typeEmoji = isMaster ? '📞' : '👤';
  const typeText = isMaster ? 'número maestro' : 'cliente';
  console.log(`\n${typeEmoji} Creando ${typeText} "${sessionName}"...`);

  // Si el bot está corriendo (sessionManager disponible), crear la sesión pero NO inicializarla
  if (sessionManager) {
    try {
      await sessionManager.createSession(sessionName, false); // false = no auto-inicializar
      console.log(`✅ ${isMaster ? 'Número maestro' : 'Cliente'} "${sessionName}" creado (sesión lista pero no iniciada)`);
    } catch (err) {
      console.log(`⚠️ Error creando sesión: ${err?.message || err}`);
    }
  }

  // Crear cliente y sesión en la base de datos si está disponible
  try {
    const { getPrisma } = await import('../../../config/database.js');
    const db = getPrisma();
    
    // Para sesiones maestro, crear un cliente especial o usar uno existente
    let client;
    if (isMaster) {
      // Buscar o crear un cliente especial para sesiones maestro
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
        console.log(`✅ Cliente especial "MASTER" creado en la base de datos`);
      }
    } else {
      // Para clientes normales, crear el cliente con el nombre de la sesión
      client = await db.client.findFirst({
        where: { name: sessionName }
      });
      
      if (!client) {
        client = await db.client.create({
          data: {
            name: sessionName,
            status: 'trial'
          }
        });
        console.log(`✅ Cliente "${sessionName}" creado en la base de datos`);
      }
    }
    
    // Verificar si la sesión ya existe
    const existingSession = await db.whatsAppSession.findUnique({
      where: { session_name: sessionName }
    });
    
    // Si no existe, crear la sesión con el tipo correspondiente
    if (!existingSession) {
      await db.whatsAppSession.create({
        data: {
          client_id: client.id,
          session_name: sessionName,
          session_type: isMaster ? 'master' : 'client',
          status: 'qr_pending'
        }
      });
      console.log(`✅ Sesión "${sessionName}" creada en la base de datos (tipo: ${isMaster ? 'maestro' : 'cliente'})`);
    } else {
      // Si ya existe, actualizar el tipo si es diferente
      const expectedType = isMaster ? 'master' : 'client';
      if (existingSession.session_type !== expectedType) {
        await db.whatsAppSession.update({
          where: { session_name: sessionName },
          data: { session_type: expectedType }
        });
        console.log(`✅ Tipo de sesión "${sessionName}" actualizado a ${expectedType}`);
      }
    }
  } catch (err) {
    // Si no hay DB o hay error, continuar con archivo
    console.log(`⚠️ No se pudo crear en la base de datos: ${err?.message || err}`);
  }

  // Guardar en configuración (archivo como backup)
  const sessions = [...currentSessions, sessionName];
  await saveSessions(sessions);

  console.log(`\n✅ ${isMaster ? 'Número maestro' : 'Cliente'} "${sessionName}" agregado exitosamente!`);
  
  if (isMaster) {
    console.log(`\n💡 Este es el número maestro de la empresa.`);
    console.log(`💡 Todos los clientes se comunicarán con este número.`);
  }
  
  // Crear carpeta de sesión si no existe
  const sessionPath = getSessionPath(sessionName);
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
    console.log(`📁 Carpeta creada: ${sessionPath}`);
  }

  console.log(`\n💡 Para iniciar la sesión y generar el QR, usa la opción "🚀 Iniciar sesión de un cliente" en el menú.\n`);
}

