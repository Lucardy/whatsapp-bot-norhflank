# 📱 Guía: Gestión de Clientes desde WhatsApp

## 🎯 ¿Qué es esto?

Ahora puedes gestionar todos tus clientes y sesiones directamente desde WhatsApp, sin necesidad de usar la terminal. Solo necesitas el número maestro.

---

## 🚀 Cómo Activar el Modo Administración

### Paso 1: Envía un mensaje a ti mismo
Desde el número maestro, envía un mensaje **a tu mismo número** (a ti mismo).

### Paso 2: Escribe una palabra clave
Escribe cualquiera de estas palabras:
- `admin`
- `gestionar`
- `gestion`
- `menu admin`
- `administrar`
- `🔐`

### Paso 3: ¡Listo!
El bot detectará que eres el dueño y te mostrará el menú de administración.

---

## 📋 Menú de Administración

Una vez activado, verás este menú:

```
🔐 MENÚ DE ADMINISTRACIÓN

📋 Opciones disponibles:

1️⃣ Ver clientes configurados
2️⃣ Agregar nuevo cliente/sesión
3️⃣ Iniciar sesión de un cliente
4️⃣ Cambiar WhatsApp de un cliente
5️⃣ Actualizar cliente existente
6️⃣ Eliminar cliente completamente

0️⃣ Salir del menú de administración

💡 Total de sesiones: X
✅ Bot está corriendo - Los cambios se aplicarán inmediatamente

Escribe el número de la opción que quieres realizar.
```

---

## 🔧 Operaciones Disponibles

### 1️⃣ Ver clientes configurados
**Comando:** `1` o `listar` o `ver`

Muestra una lista de todos los clientes y números maestro configurados, separados por tipo.

**Ejemplo:**
```
📋 Sesiones Configuradas

📞 NÚMEROS MAESTRO:
   1. unikuo4 🔑

👤 CLIENTES:
   1. pablo
   2. cliente1
```

---

### 2️⃣ Agregar nuevo cliente/sesión
**Comando:** `2` o `agregar` o `nuevo`

Permite crear una nueva sesión (maestro o cliente).

**Flujo:**
1. Elige el tipo: `1` para Maestro, `2` para Cliente
2. Ingresa el nombre (sin espacios, solo letras, números y guiones)
3. La sesión se crea automáticamente

**Ejemplo:**
```
Tú: 2
Bot: ➕ Agregar Nueva Sesión...
     ¿Qué tipo de sesión quieres crear?
     1️⃣ Número Maestro (Empresa)
     2️⃣ Número de Cliente
Tú: 2
Bot: 👤 Agregar Cliente...
     Ingresa el nombre del cliente...
Tú: nuevo_cliente
Bot: ✅ Cliente "nuevo_cliente" creado exitosamente...
```

---

### 3️⃣ Iniciar sesión de un cliente
**Comando:** `3` o `iniciar` o `start`

Genera el QR para una sesión existente.

**Flujo:**
1. Selecciona la sesión de la lista (escribe el número)
2. El bot iniciará la sesión y generará el QR
3. Te mostrará la URL del QR

**Ejemplo:**
```
Tú: 3
Bot: 📋 Selecciona una sesión:
     1. pablo
     2. cliente1
Tú: 1
Bot: 🚀 ✅ Sesión "pablo" iniciada.
     📱 Código QR disponible en:
     http://localhost:3000/qr/pablo
```

---

### 4️⃣ Cambiar WhatsApp de un cliente
**Comando:** `4` o `cambiar` o `reconectar`

Regenera el QR para cambiar el WhatsApp asociado a una sesión.

**Flujo:**
1. Selecciona la sesión
2. El bot resetea la autenticación
3. Genera un nuevo QR

**Ejemplo:**
```
Tú: 4
Bot: 📋 Selecciona una sesión...
Tú: 1
Bot: 🔄 ✅ QR regenerado para "pablo".
     📱 Nuevo código QR disponible en:
     http://localhost:3000/qr/pablo
```

---

### 5️⃣ Actualizar cliente existente
**Comando:** `5` o `actualizar` o `update`

⚠️ **En desarrollo** - Por ahora muestra un mensaje informativo.

---

### 6️⃣ Eliminar cliente completamente
**Comando:** `6` o `eliminar` o `borrar`

Elimina completamente una sesión y su cliente (si no tiene más sesiones).

**Flujo:**
1. Selecciona la sesión a eliminar
2. El bot elimina de SessionManager, DB y archivos físicos

**Ejemplo:**
```
Tú: 6
Bot: 📋 Selecciona una sesión...
Tú: 2
Bot: 🗑️ ✅ Sesión "cliente1" eliminada exitosamente.
```

---

### 0️⃣ Salir del menú
**Comando:** `0` o `salir` o `cancelar` o `exit`

Sale del modo administración y vuelve al comportamiento normal del bot.

---

## 💡 Tips y Trucos

1. **Navegación rápida**: Puedes escribir el número directamente sin esperar el menú completo
2. **Volver atrás**: Siempre puedes escribir `0` para volver al menú principal
3. **Múltiples operaciones**: El modo admin se mantiene activo hasta que salgas explícitamente
4. **Compatibilidad**: La terminal sigue funcionando igual que antes

---

## 🔒 Seguridad

- ✅ Solo funciona desde el número maestro
- ✅ Solo el dueño puede acceder (verifica que el mensaje sea a sí mismo)
- ✅ Los clientes normales no pueden acceder a esta funcionalidad
- ✅ No afecta el funcionamiento normal del bot

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo usar esto desde cualquier número?**
R: No, solo desde el número maestro y solo cuando te envías un mensaje a ti mismo.

**P: ¿Afecta esto a los clientes?**
R: No, los clientes siguen usando el bot normalmente. Esta funcionalidad es solo para administración.

**P: ¿Puedo seguir usando la terminal?**
R: Sí, la terminal sigue funcionando igual que antes. Puedes usar cualquiera de las dos opciones.

**P: ¿Qué pasa si escribo mal un comando?**
R: El bot te mostrará un mensaje de error y volverá a mostrar el menú principal.

---

## 🎉 ¡Listo para Usar!

Ya puedes gestionar todos tus clientes directamente desde WhatsApp. ¡Es más rápido y conveniente que usar la terminal!

