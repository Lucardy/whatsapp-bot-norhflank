# 🔧 Solucionar Problemas de SSH

Si estás recibiendo "Permission denied" al intentar conectarte al VPS, sigue estos pasos:

## 🎯 Opción 1: Configurar SSH con Claves (Recomendado)

Esta es la forma más segura y no requiere contraseña cada vez.

### Paso 1: Ejecutar el script de configuración

```powershell
powershell -ExecutionPolicy Bypass -File scripts\configurar-ssh-local.ps1
```

Este script:
- Generará una clave SSH si no existe
- Te mostrará tu clave pública
- Configurará el archivo SSH config

### Paso 2: Copiar tu clave pública

El script te mostrará algo como:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... vps-whatsapp
```

**Copia TODO ese texto** (desde `ssh-ed25519` hasta el final).

### Paso 3: Agregar la clave al VPS

Tienes dos opciones:

#### Opción A: Usando el terminal web del VPS (más fácil)

1. Abre el terminal web de tu VPS
2. Ejecuta estos comandos:

```bash
# Crear directorio .ssh si no existe
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Agregar tu clave pública (REEMPLAZA con la clave que copiaste)
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... vps-whatsapp" >> ~/.ssh/authorized_keys

# Ajustar permisos
chmod 600 ~/.ssh/authorized_keys
```

#### Opción B: Si puedes conectarte de otra forma

Si tienes acceso al VPS por otro medio (panel web, etc.), puedes hacer lo mismo desde ahí.

### Paso 4: Probar la conexión

```powershell
ssh vps-whatsapp
```

O:

```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519_vps root@89.117.33.122
```

Si funciona, ya no te pedirá contraseña.

---

## 🎯 Opción 2: Usar Contraseña Directamente (Temporal)

Si necesitas conectarte AHORA y no puedes configurar claves, puedes usar la contraseña directamente en el comando SSH.

### Método 1: Usar sshpass (si está instalado)

```powershell
sshpass -p "vL3+3)kz)T7(55Vs@gO@" ssh -N -L 5433:localhost:5432 root@89.117.33.122
```

### Método 2: Script con contraseña

Puedo crear un script que use la contraseña automáticamente (menos seguro, pero funciona).

---

## 🎯 Opción 3: Verificar la Contraseña

Si la contraseña que estás usando no funciona:

1. Verifica en el archivo `scripts\conectar-vps.ps1` cuál es la contraseña correcta
2. O contacta a tu proveedor de VPS para resetear la contraseña

---

## 🔍 Verificar qué está pasando

Para ver más detalles del error:

```powershell
ssh -v root@89.117.33.122
```

El flag `-v` (verbose) te mostrará más información sobre por qué falla la conexión.

---

## ✅ Después de Configurar SSH

Una vez que puedas conectarte con:

```powershell
ssh vps-whatsapp
```

O:

```powershell
ssh root@89.117.33.122
```

Entonces el túnel SSH funcionará:

```powershell
ssh -N -L 5433:localhost:5432 vps-whatsapp
```

O:

```powershell
ssh -N -L 5433:localhost:5432 root@89.117.33.122
```

---

## 🆘 Si Nada Funciona

1. **Verifica que el VPS esté accesible:**
   ```powershell
   ping 89.117.33.122
   ```

2. **Verifica que el puerto SSH esté abierto:**
   ```powershell
   Test-NetConnection -ComputerName 89.117.33.122 -Port 22
   ```

3. **Contacta a tu proveedor de VPS** para verificar:
   - Que el usuario `root` esté habilitado
   - Que la autenticación por contraseña esté habilitada
   - Que el firewall permita conexiones SSH
