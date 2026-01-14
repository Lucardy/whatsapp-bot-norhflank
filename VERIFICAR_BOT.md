# ✅ Verificar que el Bot está Funcionando

## Comandos para verificar:

### 1. Ver el estado del bot
```bash
pm2 status
```

### 2. Ver los logs en tiempo real
```bash
pm2 logs whatsapp-bot
```
(Presiona `Ctrl + C` para salir)

### 3. Ver los últimos logs (sin tiempo real)
```bash
pm2 logs whatsapp-bot --lines 50
```

### 4. Ver información detallada
```bash
pm2 show whatsapp-bot
```

---

## ¿Qué buscar en los logs?

✅ **Señales de que funciona:**
- "Server running on port 3000" o similar
- "WhatsApp client ready"
- No hay errores de conexión a base de datos (si no está configurada, puede haber warnings, pero no debería fallar)

❌ **Señales de problemas:**
- "Error: Cannot connect to database"
- "EADDRINUSE: address already in use" (puerto ocupado)
- Errores de módulos faltantes

---

## Comandos útiles de PM2

```bash
# Reiniciar el bot
pm2 restart whatsapp-bot

# Detener el bot
pm2 stop whatsapp-bot

# Iniciar el bot (si está detenido)
pm2 start whatsapp-bot

# Eliminar el bot de PM2
pm2 delete whatsapp-bot
```
