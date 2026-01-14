# 🔧 Solución: Permission Denied en SSH

Si recibes "Permission denied" al intentar conectarte, aquí están las posibles causas y soluciones:

---

## 🔍 Paso 1: Verificar Información de Acceso en Hostinger

### 1.1 Revisar el Panel de Control de Hostinger

1. **Inicia sesión en tu cuenta de Hostinger**
2. Ve a **VPS** → **Tu VPS** → **Acceso SSH** o **SSH Access**
3. Verifica:
   - ✅ **Usuario SSH** (puede ser `root`, `ubuntu`, `admin`, o otro)
   - ✅ **Contraseña SSH** (puede ser diferente a la contraseña del panel)
   - ✅ **Puerto SSH** (puede ser 22, 2222, u otro)
   - ✅ **IP del servidor**

### 1.2 Verificar si SSH está habilitado

En algunos VPS de Hostinger, el acceso SSH puede estar deshabilitado por defecto. Busca una opción para **"Habilitar SSH"** o **"Enable SSH Access"**.

---

## 🔑 Paso 2: Verificar Usuario Correcto

El usuario puede NO ser `root`. Prueba estos usuarios comunes:

```bash
# Opción 1: root (el que ya probaste)
ssh root@89.117.33.122

# Opción 2: ubuntu (común en Ubuntu)
ssh ubuntu@89.117.33.122

# Opción 3: admin
ssh admin@89.117.33.122

# Opción 4: usuario con el nombre de tu VPS
ssh tu-nombre-vps@89.117.33.122
```

---

## 🔌 Paso 3: Verificar Puerto SSH

El puerto puede no ser el estándar (22). Prueba:

```bash
# Puerto estándar
ssh -p 22 root@89.117.33.122

# Puerto alternativo común
ssh -p 2222 root@89.117.33.122
```

---

## 🔐 Paso 4: Resetear Contraseña SSH desde Hostinger

Si la contraseña no funciona:

1. Ve al panel de Hostinger
2. Busca **"Reset SSH Password"** o **"Cambiar contraseña SSH"**
3. Genera una nueva contraseña
4. **Copia la nueva contraseña** (Hostinger te la mostrará)
5. Intenta conectarte de nuevo

---

## 📋 Paso 5: Usar el Acceso Web SSH (Alternativa)

Hostinger suele ofrecer un **terminal web** o **Web SSH**:

1. Ve al panel de Hostinger
2. Busca **"Web Terminal"**, **"Browser SSH"**, o **"Terminal Web"**
3. Inicia sesión desde ahí
4. Una vez dentro, puedes configurar el acceso SSH normal

---

## 🆘 Paso 6: Contactar Soporte de Hostinger

Si nada funciona:

1. Contacta el soporte de Hostinger
2. Pide:
   - Usuario SSH correcto
   - Contraseña SSH (o que la reseteen)
   - Puerto SSH
   - Verificar que SSH esté habilitado

---

## ✅ Verificación Rápida

**Información que necesitas confirmar:**

- [ ] ¿Cuál es el usuario SSH correcto? (root, ubuntu, otro?)
- [ ] ¿Cuál es la contraseña SSH exacta? (puede ser diferente a la del panel)
- [ ] ¿Cuál es el puerto SSH? (22, 2222, otro?)
- [ ] ¿Está SSH habilitado en el panel de Hostinger?

---

## 💡 Próximos Pasos

Una vez que puedas conectarte:

1. Configuraremos autenticación por clave SSH (más seguro y sin contraseña)
2. Instalaremos Node.js
3. Configuraremos el despliegue automático

---

## 📞 ¿Qué información tienes del panel de Hostinger?

Por favor, revisa tu panel de Hostinger y comparte:
1. ¿Qué usuario SSH muestra?
2. ¿Hay alguna opción para ver/resetear la contraseña SSH?
3. ¿Hay un terminal web disponible?
