# 📚 Guía: Instalar Node.js en el VPS - Paso a Paso

Esta guía te explica **cada comando** y **por qué** lo ejecutamos, para que entiendas qué está pasando.

---

## 🔐 Paso 1: Conectarte al VPS

### 1.1 Abrir PowerShell

En Windows, abre PowerShell (puedes buscarlo en el menú inicio).

### 1.2 Conectarte por SSH

Ejecuta este comando:

```bash
ssh root@89.117.33.122
```

**¿Qué hace este comando?**
- `ssh` = Secure Shell, un protocolo para conectarse de forma segura a servidores remotos
- `root` = El usuario con el que te conectas (root es el administrador)
- `@` = Separador entre usuario y servidor
- `89.117.33.122` = La dirección IP de tu VPS

**Lo que pasará:**
1. Te pedirá la contraseña: `vL3+3)kz)T7(55Vs@gO@`
2. La primera vez te preguntará si confías en el servidor (escribe `yes` y presiona Enter)
3. Si todo está bien, verás algo como: `root@tu-servidor:~#`

**✅ Indicador de éxito:** Verás el prompt del servidor (algo como `root@...:~#`)

---

## 🔍 Paso 2: Verificar qué Sistema Operativo tienes

Antes de instalar Node.js, necesitamos saber qué sistema operativo tiene tu VPS.

### 2.1 Verificar el sistema operativo

```bash
cat /etc/os-release
```

**¿Qué hace este comando?**
- `cat` = "concatenate", muestra el contenido de un archivo
- `/etc/os-release` = Archivo que contiene información del sistema operativo

**Lo que verás:**
Probablemente verás algo como:
```
NAME="Ubuntu"
VERSION="22.04 LTS"
```
o
```
NAME="Debian"
VERSION="11"
```

**✅ Indicador de éxito:** Ves el nombre y versión del sistema operativo

---

## 📦 Paso 3: Actualizar el Sistema

Antes de instalar cualquier cosa nueva, es buena práctica actualizar el sistema.

### 3.1 Actualizar la lista de paquetes

```bash
apt update
```

**¿Qué hace este comando?**
- `apt` = Advanced Package Tool, el gestor de paquetes en Ubuntu/Debian
- `update` = Actualiza la lista de paquetes disponibles desde los repositorios

**¿Por qué es importante?**
Asegura que tengas la lista más reciente de software disponible.

**✅ Indicador de éxito:** Verás algo como "Reading package lists... Done"

### 3.2 Actualizar los paquetes instalados (opcional pero recomendado)

```bash
apt upgrade -y
```

**¿Qué hace este comando?**
- `upgrade` = Actualiza los paquetes instalados a sus versiones más recientes
- `-y` = Responde "yes" automáticamente a todas las preguntas (para no tener que confirmar cada paquete)

**⏱️ Tiempo:** Esto puede tardar unos minutos dependiendo de cuántos paquetes haya que actualizar.

**✅ Indicador de éxito:** Verás "Done" al final

---

## 🟢 Paso 4: Instalar Node.js 20

Tu proyecto requiere Node.js versión 20 (lo vimos en `package.json`). Vamos a instalarlo.

### 4.1 Agregar el repositorio de NodeSource

NodeSource es una empresa que mantiene repositorios oficiales de Node.js para Linux.

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
```

**¿Qué hace este comando?**
- `curl` = Herramienta para descargar archivos desde internet
- `-fsSL` = Flags que significan:
  - `-f` = Falla silenciosamente si hay error HTTP
  - `-s` = Modo silencioso (no muestra progreso)
  - `-S` = Muestra errores aunque esté en modo silencioso
  - `-L` = Sigue redirecciones
- `https://deb.nodesource.com/setup_20.x` = Script que configura el repositorio para Node.js 20
- `|` = Pipe, pasa la salida de un comando al siguiente
- `bash -` = Ejecuta el script descargado

**¿Por qué es necesario?**
Por defecto, Ubuntu/Debian no tiene Node.js 20 en sus repositorios oficiales. Este comando agrega el repositorio de NodeSource que sí lo tiene.

**✅ Indicador de éxito:** Verás mensajes sobre "Adding the NodeSource signing key" y "Running apt-get update"

### 4.2 Instalar Node.js

```bash
apt install -y nodejs
```

**¿Qué hace este comando?**
- `apt install` = Instala un paquete
- `nodejs` = El paquete de Node.js
- `-y` = Responde "yes" automáticamente

**✅ Indicador de éxito:** Verás "Setting up nodejs..." y finalmente "Done"

---

## ✅ Paso 5: Verificar la Instalación

Ahora vamos a verificar que Node.js se instaló correctamente.

### 5.1 Verificar la versión de Node.js

```bash
node --version
```

**¿Qué hace este comando?**
- `node` = El comando de Node.js
- `--version` = Muestra la versión instalada

**Lo que deberías ver:**
```
v20.x.x
```
(Donde x.x.x son números de versión, por ejemplo: v20.11.0)

**✅ Indicador de éxito:** Ves una versión que empieza con `v20`

### 5.2 Verificar la versión de npm

```bash
npm --version
```

**¿Qué hace este comando?**
- `npm` = Node Package Manager, viene incluido con Node.js
- `--version` = Muestra la versión

**Lo que deberías ver:**
Un número de versión como `10.2.4`

**✅ Indicador de éxito:** Ves un número de versión

---

## 🎯 Resumen de Comandos (Copia y Pega)

Si quieres ejecutarlos todos de una vez, aquí están en orden:

```bash
# 1. Verificar sistema operativo
cat /etc/os-release

# 2. Actualizar sistema
apt update
apt upgrade -y

# 3. Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 4. Verificar instalación
node --version
npm --version
```

---

## 🐛 Solución de Problemas

### Error: "curl: command not found"

**Problema:** curl no está instalado.

**Solución:**
```bash
apt install -y curl
```

### Error: "Permission denied"

**Problema:** No tienes permisos de administrador.

**Solución:** Asegúrate de estar conectado como `root`. Si no, usa `sudo` antes de cada comando:
```bash
sudo apt update
```

### Error: "E: Unable to locate package nodejs"

**Problema:** El repositorio de NodeSource no se agregó correctamente.

**Solución:** Ejecuta de nuevo el paso 4.1:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt update
apt install -y nodejs
```

---

## 📝 Notas Importantes

1. **Node.js vs nodejs:** En Linux, el paquete se llama `nodejs` pero el comando es `node`. Esto es normal.

2. **npm viene incluido:** Cuando instalas Node.js, npm se instala automáticamente. No necesitas instalarlo por separado.

3. **Versión correcta:** Asegúrate de que la versión sea 20.x.x. Si ves una versión menor (como 18.x o 16.x), el repositorio no se agregó correctamente.

---

## 🎉 ¡Siguiente Paso!

Una vez que tengas Node.js instalado, el siguiente paso será:
1. Instalar Git (si no está instalado)
2. Clonar tu repositorio de GitHub
3. Instalar las dependencias del proyecto
4. Configurar las variables de entorno

¿Listo para continuar? 🚀
