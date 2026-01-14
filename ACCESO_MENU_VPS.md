# 🎛️ Acceder al Menú Interactivo en el VPS

## Opción 1: Detener PM2 y ejecutar manualmente

En el terminal web del VPS:

```bash
# Detener el bot
pm2 stop whatsapp-bot

# Ir al directorio del proyecto
cd ~/whatsapp-bot-norhflank

# Ejecutar con el menú (sin --skip-menu)
npm start
```

Esto te mostrará el menú interactivo donde puedes:
- Gestionar sesiones
- Gestionar clientes
- Iniciar el bot

**⚠️ IMPORTANTE:** Cuando termines, presiona `Ctrl + C` para detener el bot y luego:

```bash
# Volver a iniciar con PM2
pm2 start src/index.js --name "whatsapp-bot" -- --skip-menu
pm2 save
```

---

## Opción 2: Crear un script para gestionar

Puedes crear un script que te permita gestionar sin detener PM2 completamente.

---

## Nota sobre el Firewall

Si aún no puedes acceder desde fuera, puede ser que el puerto 3000 esté bloqueado por el firewall. Necesitarás abrirlo:

```bash
# Verificar si ufw está activo
ufw status

# Si está activo, abrir el puerto 3000
ufw allow 3000/tcp
```

O si usas otro firewall, consulta la documentación de Hostinger.
