# 💳 Guía de Integración de Pagos con Mercado Pago

## 📋 Resumen

Este sistema permite recibir pagos a través de Mercado Pago para reactivar cuentas suspendidas o activar nuevas suscripciones. Cuando un cliente paga, el sistema recibe una notificación automática (webhook) y reactiva la cuenta.

## 🔧 Configuración Inicial

### 1. Instalar dependencias

```bash
npm install mercadopago
```

### 2. Configurar variables de entorno

Agrega a tu archivo `.env`:

```env
# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=TU_ACCESS_TOKEN_DE_MERCADOPAGO

# URL del webhook (debe ser accesible desde internet)
WEBHOOK_URL=https://tu-dominio.com/webhooks/mercadopago

# URL del frontend (opcional, para redirección después del pago)
FRONTEND_URL=https://tu-dominio.com
```

### 3. Obtener Access Token de Mercado Pago

1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
2. Crea una aplicación
3. Obtén tu **Access Token** (producción o test)
4. Cópialo en `MERCADOPAGO_ACCESS_TOKEN`

### 4. Configurar Webhook en Mercado Pago

1. En el panel de Mercado Pago, ve a **Webhooks**
2. Configura la URL: `https://tu-dominio.com/webhooks/mercadopago`
3. Selecciona los eventos: `payment`

## 📊 Base de Datos

### Migración de Prisma

Ejecuta la migración para agregar los campos de pago:

```bash
npx prisma migrate dev --name add_payment_fields
```

Esto agregará a la tabla `clients`:
- `expires_at` - Fecha de vencimiento de la suscripción
- `mp_payment_id` - ID del último pago de Mercado Pago
- `last_payment_date` - Fecha del último pago

## 🔄 Flujo de Pago

### 1. Cliente suspendido solicita reactivación

Cuando un cliente con cuenta suspendida:
- Escribe "menú" → Ve mensaje con link de pago
- Elige opción 5 (prueba gratuita) → Ve mensaje con link de pago
- Intenta activar bot (opción 2) → Ve mensaje con link de pago

### 2. Generación del link de pago

El sistema genera un link único de Mercado Pago que incluye:
- ID del cliente (`external_reference`)
- URL del webhook para notificaciones
- Precio según el plan del cliente

### 3. Cliente paga

El cliente hace clic en el link, completa el pago en Mercado Pago.

### 4. Webhook recibe notificación

Cuando el pago se aprueba, Mercado Pago envía una notificación a:
```
POST /webhooks/mercadopago
```

El sistema:
1. Verifica el pago en Mercado Pago
2. Extrae el `clientId` del `external_reference`
3. Activa el cliente (status: 'active')
4. Establece `expires_at` (1 mes desde ahora por defecto)
5. Guarda `mp_payment_id` y `last_payment_date`

### 5. Cliente reactivado

El cliente puede usar el bot normalmente hasta que vuelva a vencer.

## ⚙️ Verificación Automática de Vencimientos

El sistema tiene un scheduler que verifica diariamente:

1. **Trials expirados**: Clientes en trial con más de 7 días → Se suspenden
2. **Suscripciones vencidas**: Clientes activos con `expires_at` pasado → Se suspenden

Ambas verificaciones se ejecutan a medianoche y envían notificaciones con links de pago.

## 🔗 Endpoints Disponibles

### Generar link de pago (API)

```
GET /payments/generate/:clientId?planId=1
```

**Ejemplo:**
```bash
curl http://localhost:3000/payments/generate/42
```

**Respuesta:**
```json
{
  "success": true,
  "paymentLink": "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=...",
  "preferenceId": "123456789"
}
```

### Webhook de Mercado Pago

```
POST /webhooks/mercadopago
```

Este endpoint es llamado automáticamente por Mercado Pago cuando hay cambios en un pago.

## 🧪 Testing

### Modo Test de Mercado Pago

Para probar sin hacer pagos reales:

1. Usa el **Access Token de TEST** de Mercado Pago
2. Usa tarjetas de prueba de Mercado Pago:
   - Aprobada: `5031 7557 3453 0604`
   - Rechazada: `5031 4332 1540 6351`

### Verificar webhook localmente

Usa [ngrok](https://ngrok.com/) para exponer tu servidor local:

```bash
ngrok http 3000
```

Luego configura el webhook en Mercado Pago con la URL de ngrok.

## 📝 Notas Importantes

1. **Seguridad**: El webhook debe ser accesible desde internet. Usa HTTPS en producción.

2. **Idempotencia**: El sistema verifica el estado del pago antes de activar, evitando activaciones duplicadas.

3. **Meses de suscripción**: Por defecto, cada pago activa 1 mes. Puedes ajustar esto en `paymentActivation.js`.

4. **Planes**: El precio se obtiene del plan del cliente. Si no tiene plan, usa $5000 por defecto.

5. **Logs**: Todos los eventos de pago se registran en los logs con el prefijo `[payments]`.

## 🚀 Próximos Pasos

- [ ] Configurar diferentes planes con precios
- [ ] Agregar notificaciones de pago exitoso al cliente
- [ ] Dashboard para ver pagos y suscripciones
- [ ] Historial de pagos por cliente
