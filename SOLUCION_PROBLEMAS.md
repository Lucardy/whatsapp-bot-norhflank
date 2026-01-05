# Solución de Problemas Comunes

## 🔴 Error: Puerto 3000 en uso (EADDRINUSE)

### Síntoma
```
Error: listen EADDRINUSE: address already in use :::3000
```

### Causa
Hay otra instancia del bot corriendo en segundo plano o en otra terminal.

### Solución Rápida

**Windows PowerShell:**
```powershell
# Opción 1: Usar el script incluido
npm run kill

# Opción 2: Manualmente
Get-Process -Name node | Where-Object {$_.Path -like "*whatsapp*"} | Stop-Process

# Opción 3: Cerrar todos los procesos de Node.js (cuidado, cierra TODOS)
Get-Process -Name node | Stop-Process -Force
```

**Linux/Mac:**
```bash
# Buscar y cerrar procesos del bot
ps aux | grep "node.*whatsapp-bot" | grep -v grep | awk '{print $2}' | xargs kill -9
```

**O cambiar el puerto:**
Edita `.env` y cambia:
```env
PORT=3001
```

## 📱 Sesión de WhatsApp sigue activa aunque cerré el bot

### ¿Es normal?
**Sí, es completamente normal.** Esto sucede porque:

1. **WhatsApp Web mantiene sesiones activas**: Cuando escaneas el QR, WhatsApp Web crea una sesión que puede seguir activa en tu teléfono incluso si el bot se desconecta.

2. **La sesión se guarda en tu teléfono**: WhatsApp guarda la sesión en tu celular, no en el servidor del bot.

3. **El bot puede reconectarse**: Cuando reinicias el bot, puede reconectarse a la sesión existente si los datos de autenticación están guardados.

### ¿Cómo verificar si el bot está corriendo?

**Windows:**
```powershell
# Ver procesos de Node.js
Get-Process -Name node

# Ver qué puerto está usando
netstat -ano | findstr :3000
```

**Linux/Mac:**
```bash
# Ver procesos de Node.js
ps aux | grep node

# Ver qué puerto está usando
lsof -i :3000
```

### ¿Cómo cerrar la sesión de WhatsApp?

Si quieres cerrar la sesión de WhatsApp Web desde tu celular:

1. Abre WhatsApp en tu celular
2. Ve a **Configuración → Dispositivos vinculados**
3. Encuentra la sesión del bot
4. Toca **"Cerrar sesión"** o **"Desvincular"**

Esto forzará a que el bot necesite escanear el QR nuevamente la próxima vez que se inicie.

## 🔄 El bot no responde a mensajes

### Posibles causas:

1. **El bot no está corriendo**: Verifica que el proceso esté activo
2. **La sesión se desconectó**: Revisa los logs para ver si hay errores de conexión
3. **El mensaje es muy antiguo**: El bot ignora mensajes de más de 5 minutos
4. **Es un mensaje de grupo o estado**: El bot solo responde a mensajes individuales

### Solución:

1. Verifica los logs en la consola
2. Revisa el estado de la sesión: `http://localhost:3000/state/unikuo`
3. Reinicia la sesión: `POST http://localhost:3000/restart/unikuo`

## 🚫 No puedo acceder a http://localhost:3000

### Posibles causas:

1. **El bot no está corriendo**: Inicia el bot con `npm start`
2. **El puerto está bloqueado**: Verifica el firewall
3. **Otra aplicación usa el puerto 3000**: Cambia el puerto en `.env`

### Solución:

```powershell
# Verificar si algo está usando el puerto 3000
netstat -ano | findstr :3000

# Si hay algo, cierra ese proceso o cambia el puerto
```

## 💾 La sesión no se guarda

### Verificar:

1. **Carpeta `.wwebjs_auth` existe**: Debe estar en `sessions/[nombre-sesion]/.wwebjs_auth/`
2. **Permisos de escritura**: Asegúrate de que el bot tenga permisos para escribir
3. **Espacio en disco**: Verifica que haya espacio suficiente

### Solución:

```powershell
# Verificar que existe la carpeta
Test-Path "sessions\unikuo\.wwebjs_auth"

# Si no existe, el bot la creará automáticamente al escanear el QR
```

## 🔍 Comandos Útiles

### Ver procesos del bot
```powershell
Get-Process -Name node | Where-Object {$_.Path -like "*whatsapp*"}
```

### Cerrar todos los procesos del bot
```powershell
npm run kill
```

### Ver qué está usando el puerto 3000
```powershell
netstat -ano | findstr :3000
```

### Reiniciar el bot completamente
```powershell
# 1. Cerrar procesos
npm run kill

# 2. Iniciar de nuevo
npm start
```

