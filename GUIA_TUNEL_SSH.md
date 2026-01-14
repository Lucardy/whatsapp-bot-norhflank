# 🔐 Guía Completa: Túnel SSH para PostgreSQL

Esta guía te explica cómo crear un túnel SSH seguro para conectarte a la base de datos PostgreSQL del VPS desde tu máquina local.

## 🎯 ¿Qué es un túnel SSH?

Un túnel SSH es una conexión segura que redirige el tráfico de un puerto local a un puerto remoto a través de SSH. Es más seguro que abrir PostgreSQL directamente al internet.

**Ventajas:**
- ✅ Más seguro (no expones PostgreSQL directamente)
- ✅ No necesitas configurar firewall del VPS
- ✅ Encriptado con SSH
- ✅ Fácil de usar

## 🚀 Método Rápido (Recomendado)

### Paso 1: Crear el túnel SSH

Ejecuta en PowerShell:

```powershell
npm run tunnel:start
```

O directamente:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\tunel-ssh-postgres.ps1
```

### Paso 2: Configurar `.env.local`

Crea o edita el archivo `.env.local` en la raíz del proyecto:

```env
DATABASE_URL=postgresql://usuario:password@localhost:5433/whatsapp_bot?schema=public
```

**Nota:** El puerto `5433` es el puerto local del túnel. Si cambias el puerto en el script, usa ese puerto.

### Paso 3: Verificar que funciona

```powershell
npm run tunnel:status
```

Deberías ver:
```
✅ Túnel SSH está CORRIENDO
```

### Paso 4: Ejecutar el bot

```powershell
npm start
```

El bot usará automáticamente la base de datos del VPS a través del túnel SSH.

## 📋 Comandos Disponibles

### Iniciar el túnel
```powershell
npm run tunnel:start
```

### Verificar estado
```powershell
npm run tunnel:status
```

### Detener el túnel
```powershell
npm run tunnel:stop
```

## 🔧 Configuración Avanzada

### Cambiar el puerto local

Si el puerto `5433` está ocupado, puedes usar otro:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\tunel-ssh-postgres.ps1 -LocalPort 5434
```

Luego actualiza tu `.env.local`:
```env
DATABASE_URL=postgresql://usuario:password@localhost:5434/whatsapp_bot?schema=public
```

### Cambiar la configuración del VPS

Si tu VPS tiene una IP o usuario diferente, puedes especificarlo:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\tunel-ssh-postgres.ps1 -VpsHost "192.168.1.100" -VpsUser "tu_usuario"
```

## 🛠️ Método Manual (Si el script no funciona)

Si el script automático no funciona, puedes crear el túnel manualmente:

### Opción 1: Usando configuración SSH

Si ya configuraste SSH (con `scripts\configurar-ssh-local.ps1`):

```powershell
ssh -N -L 5433:localhost:5432 vps-whatsapp
```

### Opción 2: Usando IP y usuario directamente

```powershell
ssh -N -L 5433:localhost:5432 root@89.117.33.122
```

**Explicación del comando:**
- `-N`: No ejecutar comandos remotos, solo crear el túnel
- `-L 5433:localhost:5432`: Redirigir puerto local 5433 → VPS localhost:5432
- `root@89.117.33.122`: Usuario y host del VPS

### Mantener el túnel abierto

El túnel se mantiene abierto mientras la terminal esté abierta. Para cerrarlo, presiona `Ctrl+C`.

## 🔍 Verificar que el Túnel Funciona

### Método 1: Verificar procesos SSH

```powershell
Get-Process -Name ssh | Where-Object { $_.CommandLine -like "*5433*" }
```

### Método 2: Probar conexión con psql

Si tienes PostgreSQL instalado localmente:

```powershell
psql -h localhost -p 5433 -U whatsapp_user -d whatsapp_bot
```

### Método 3: Usar el script de estado

```powershell
npm run tunnel:status
```

## ❌ Solución de Problemas

### Error: "Puerto ya está en uso"

**Solución:** Usa otro puerto:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\tunel-ssh-postgres.ps1 -LocalPort 5434
```

### Error: "Connection refused" o "Connection timeout"

**Causas posibles:**
1. No puedes conectarte al VPS por SSH
2. PostgreSQL no está corriendo en el VPS
3. El puerto 5432 está bloqueado en el VPS

**Soluciones:**
1. Verifica que puedes conectarte: `ssh root@89.117.33.122`
2. En el VPS, verifica que PostgreSQL está corriendo:
   ```bash
   sudo systemctl status postgresql
   ```
3. Verifica que PostgreSQL escucha en localhost:
   ```bash
   sudo netstat -tlnp | grep 5432
   ```

### Error: "Permission denied"

**Solución:** Configura SSH sin contraseña:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\configurar-ssh-local.ps1
```

### El túnel se cierra automáticamente

**Solución:** Usa `screen` o `tmux` en el VPS, o ejecuta el túnel en una terminal que no cierres.

Para ejecutarlo en segundo plano en Windows, puedes usar:
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "ssh -N -L 5433:localhost:5432 root@89.117.33.122"
```

## 🔄 Flujo de Trabajo Recomendado

1. **Iniciar el túnel SSH:**
   ```powershell
   npm run tunnel:start
   ```

2. **Verificar que está corriendo:**
   ```powershell
   npm run tunnel:status
   ```

3. **Ejecutar el bot:**
   ```powershell
   npm start
   ```

4. **Cuando termines, detener el túnel:**
   ```powershell
   npm run tunnel:stop
   ```

## 📝 Notas Importantes

- ⚠️ El túnel debe estar corriendo **antes** de ejecutar `npm start`
- ⚠️ Si cierras la terminal donde corre el túnel, el túnel se cerrará
- ⚠️ El túnel solo redirige conexiones, no ejecuta comandos en el VPS
- ✅ Puedes tener múltiples túneles en diferentes puertos
- ✅ El túnel es seguro y encriptado

## 🆘 ¿Necesitas Ayuda?

Si tienes problemas:

1. Verifica que puedes conectarte al VPS: `ssh root@89.117.33.122`
2. Verifica el estado del túnel: `npm run tunnel:status`
3. Revisa los logs si hay errores
4. Prueba crear el túnel manualmente (ver sección "Método Manual")
