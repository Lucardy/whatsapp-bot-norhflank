# 🔐 Configuración de Mercado Pago

## ✅ Credenciales Configuradas

### Modo TEST (Desarrollo)
- **Access Token**: `TEST-3163605064333883-033004-1902bb2bb7f9ac07ea2051a5721f4dc1-160013062`
- **Public Key**: `TEST-9cd15287-45c6-46c9-b245-4294e3fe8315`

## 📝 Notas Importantes

### Access Token (Backend)
- ✅ **Configurado en `.env`**
- Se usa para:
  - Generar links de pago
  - Verificar pagos
  - Recibir webhooks

### Public Key (Frontend - Futuro)
- ⚠️ **No se usa actualmente** (solo para frontend)
- Se usaría si implementas pagos directamente desde el frontend
- Por ahora, todos los pagos se generan desde el backend

## 🧪 Modo TEST vs Producción

### Modo TEST (Actual)
- ✅ No se realizan pagos reales
- ✅ Puedes probar todo el flujo sin riesgo
- ✅ Usa tarjetas de prueba de Mercado Pago

**Tarjetas de prueba:**
- Aprobada: `5031 7557 3453 0604` (CVV: 123)
- Rechazada: `5031 4332 1540 6351` (CVV: 123)

### Modo Producción (Cuando estés listo)
1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
2. Cambia de "Test" a "Producción"
3. Obtén tu **Access Token de Producción**
4. Reemplaza en `.env`:
   ```env
   MERCADOPAGO_ACCESS_TOKEN=APP_USR-... (token de producción)
   ```

## 🚀 Estado Actual

- ✅ Access Token configurado
- ✅ SDK de Mercado Pago instalado
- ✅ Base de datos actualizada
- ✅ Webhook endpoint creado
- ✅ Sistema listo para generar links de pago

## ⚠️ Próximos Pasos para Producción

1. **Obtener credenciales de producción** en Mercado Pago
2. **Configurar webhook** en el panel de Mercado Pago:
   - URL: `https://tu-dominio.com/webhooks/mercadopago`
   - Eventos: `payment`
3. **Actualizar variables de entorno**:
   ```env
   WEBHOOK_URL=https://tu-dominio.com/webhooks/mercadopago
   FRONTEND_URL=https://tu-dominio.com
   ```

## 🧪 Probar el Sistema

1. Inicia el bot: `npm start`
2. Crea un cliente suspendido (o usa uno existente)
3. El cliente verá links de pago en los mensajes
4. Al hacer clic, se abre Mercado Pago en modo TEST
5. Usa una tarjeta de prueba para completar el pago
6. El webhook recibirá la notificación y activará el cliente

## 📚 Documentación

Ver `GUIA_PAGOS_MERCADOPAGO.md` para más detalles sobre el flujo completo.
