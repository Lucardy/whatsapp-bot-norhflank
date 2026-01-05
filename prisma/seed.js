// Script de seed para poblar la base de datos con datos iniciales
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('🌱 Iniciando seed de base de datos...');

  // 1. Crear planes básicos
  console.log('📋 Creando planes...');
  
  const planBasico = await prisma.plan.upsert({
    where: { name: 'básico' },
    update: {},
    create: {
      name: 'básico',
      price_monthly: 0,
      max_sessions: 1,
      max_messages_per_month: 500,
      features: {
        description: 'Plan básico para empezar',
        support: 'email'
      }
    }
  });

  const planPro = await prisma.plan.upsert({
    where: { name: 'pro' },
    update: {},
    create: {
      name: 'pro',
      price_monthly: 0,
      max_sessions: 3,
      max_messages_per_month: 2000,
      features: {
        description: 'Plan profesional',
        support: 'prioritario'
      }
    }
  });

  console.log('✅ Planes creados:', { planBasico, planPro });

  // 2. Crear clientes (unikuo y pablo)
  console.log('👥 Creando clientes...');

  const clienteUnikuo = await prisma.client.upsert({
    where: { name: 'Unikuo' },
    update: {},
    create: {
      name: 'Unikuo',
      contact_email: 'contacto@unikuoweb.com',
      status: 'active',
      plan_id: planPro.id,
      config: {
        create: {
          welcome_message: `👋 ¡Hola! 👋

Bienvenido a *Unikuo*, servicio de creación de páginas web. Estoy aquí para ayudarte.

¿Qué te gustaría saber?

1️⃣ Consultar precios
2️⃣ Información de nuestros trabajos
3️⃣ Ver nuestra página web
4️⃣ Hablar con un agente personal

Escribe el número de la opción que te interesa.`,
          menu_options: {
            options: [
              {
                key: '1',
                label: 'Consultar precios',
                response: `💰 *Nuestros Planes de Páginas Web*

Ofrecemos planes mensuales que incluyen:
• Diseño profesional
• Hosting y dominio
• Mantenimiento continuo
• Soporte técnico

📋 *Planes disponibles:*

• *Landing Page*: $24.000/mes
• *Catálogo Online*: $41.000/mes
• *Business Web*: $58.000/mes

💬 Para más detalles o consultas personalizadas, elige la opción 4 para hablar con un agente.`
              },
              {
                key: '2',
                label: 'Información de trabajos',
                response: `🎨 *Nuestros Trabajos*

Creamos páginas web profesionales y modernas para tu negocio. Nuestros servicios incluyen:

✨ *Lo que ofrecemos:*
• Diseño responsive (se adapta a móviles)
• Optimización para buscadores (SEO)
• Integración con redes sociales
• Formularios de contacto
• Panel de administración
• Actualizaciones de contenido

🚀 *Tecnologías que utilizamos:*
• Diseño moderno y profesional
• Velocidad optimizada
• Seguridad implementada

💡 Todos nuestros sitios incluyen mantenimiento continuo y soporte técnico.`
              },
              {
                key: '3',
                label: 'Ver página web',
                response: `🌐 *Nuestra Página Web*

Visita nuestro sitio para conocer más sobre nuestros servicios:

🔗 https://unikuoweb.com/

Allí encontrarás:
• Portafolio de trabajos
• Información detallada de servicios
• Casos de éxito
• Formulario de contacto

💬 ¿Tienes alguna pregunta? Elige la opción 4 para hablar con un agente.`
              },
              {
                key: '4',
                label: 'Hablar con agente',
                response: `👤 *Hablar con un Agente*

¡Perfecto! Un agente de Unikuo se comunicará contigo en la brevedad.

⏰ Te responderemos pronto por este mismo WhatsApp.

Mientras tanto, puedes revisar nuestras opciones anteriores si tienes alguna otra consulta.`
              }
            ],
            default_response: `👋 ¡Hola! 👋

Bienvenido a *Unikuo*, servicio de creación de páginas web. Estoy aquí para ayudarte.

¿Qué te gustaría saber?

1️⃣ Consultar precios
2️⃣ Información de nuestros trabajos
3️⃣ Ver nuestra página web
4️⃣ Hablar con un agente personal

Escribe el número de la opción que te interesa.`
          }
        }
      }
    }
  });

  const clientePablo = await prisma.client.upsert({
    where: { name: 'Pablo' },
    update: {},
    create: {
      name: 'Pablo',
      status: 'active',
      plan_id: planBasico.id,
      config: {
        create: {
          welcome_message: `👋 ¡Hola! 👋

Bienvenido a *Unikuo*, servicio de creación de páginas web. Estoy aquí para ayudarte.

¿Qué te gustaría saber?

1️⃣ Consultar precios
2️⃣ Información de nuestros trabajos
3️⃣ Ver nuestra página web
4️⃣ Hablar con un agente personal

Escribe el número de la opción que te interesa.`,
          menu_options: {
            options: [
              {
                key: '1',
                label: 'Consultar precios',
                response: `💰 *Nuestros Planes de Páginas Web*

Ofrecemos planes mensuales que incluyen:
• Diseño profesional
• Hosting y dominio
• Mantenimiento continuo
• Soporte técnico

📋 *Planes disponibles:*

• *Landing Page*: $24.000/mes
• *Catálogo Online*: $41.000/mes
• *Business Web*: $58.000/mes

💬 Para más detalles o consultas personalizadas, elige la opción 4 para hablar con un agente.`
              },
              {
                key: '2',
                label: 'Información de trabajos',
                response: `🎨 *Nuestros Trabajos*

Creamos páginas web profesionales y modernas para tu negocio. Nuestros servicios incluyen:

✨ *Lo que ofrecemos:*
• Diseño responsive (se adapta a móviles)
• Optimización para buscadores (SEO)
• Integración con redes sociales
• Formularios de contacto
• Panel de administración
• Actualizaciones de contenido

🚀 *Tecnologías que utilizamos:*
• Diseño moderno y profesional
• Velocidad optimizada
• Seguridad implementada

💡 Todos nuestros sitios incluyen mantenimiento continuo y soporte técnico.`
              },
              {
                key: '3',
                label: 'Ver página web',
                response: `🌐 *Nuestra Página Web*

Visita nuestro sitio para conocer más sobre nuestros servicios:

🔗 https://unikuoweb.com/

Allí encontrarás:
• Portafolio de trabajos
• Información detallada de servicios
• Casos de éxito
• Formulario de contacto

💬 ¿Tienes alguna pregunta? Elige la opción 4 para hablar con un agente.`
              },
              {
                key: '4',
                label: 'Hablar con agente',
                response: `👤 *Hablar con un Agente*

¡Perfecto! Un agente de Unikuo se comunicará contigo en la brevedad.

⏰ Te responderemos pronto por este mismo WhatsApp.

Mientras tanto, puedes revisar nuestras opciones anteriores si tienes alguna otra consulta.`
              }
            ],
            default_response: `👋 ¡Hola! 👋

Bienvenido a *Unikuo*, servicio de creación de páginas web. Estoy aquí para ayudarte.

¿Qué te gustaría saber?

1️⃣ Consultar precios
2️⃣ Información de nuestros trabajos
3️⃣ Ver nuestra página web
4️⃣ Hablar con un agente personal

Escribe el número de la opción que te interesa.`
          }
        }
      }
    }
  });

  console.log('✅ Clientes creados:', { clienteUnikuo, clientePablo });

  // 3. Crear sesiones de WhatsApp para cada cliente
  console.log('📱 Creando sesiones de WhatsApp...');

  const sessionUnikuo = await prisma.whatsAppSession.upsert({
    where: { session_name: 'unikuo' },
    update: {},
    create: {
      client_id: clienteUnikuo.id,
      session_name: 'unikuo',
      session_type: 'client',
      status: 'qr_pending'
    }
  });

  const sessionPablo = await prisma.whatsAppSession.upsert({
    where: { session_name: 'pablo' },
    update: {},
    create: {
      client_id: clientePablo.id,
      session_name: 'pablo',
      session_type: 'client',
      status: 'qr_pending'
    }
  });

  console.log('✅ Sesiones creadas:', { sessionUnikuo, sessionPablo });

  console.log('🎉 Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

