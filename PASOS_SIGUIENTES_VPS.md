# 🚀 Próximos Pasos en el VPS

## ✅ Completado
- [x] Node.js 20.20.0 instalado
- [x] npm 10.8.2 instalado

## 📋 Pasos Siguientes

### Paso 1: Verificar/Instalar Git
```bash
git --version
```

Si no está instalado:
```bash
apt install -y git
```

### Paso 2: Clonar tu repositorio de GitHub
```bash
cd ~
git clone https://github.com/Lucardy/whatsapp-bot-norhflank.git whatsapp-bot-norhflank
cd whatsapp-bot-norhflank
```

**⚠️ IMPORTANTE:** Reemplaza `TU_USUARIO` y `TU_REPOSITORIO` con los valores reales.

### Paso 3: Instalar dependencias del proyecto
```bash
npm install --production
```

### Paso 4: Generar Prisma Client
```bash
npx prisma generate
```

### Paso 5: Configurar variables de entorno
```bash
cp env.example .env
nano .env
```

Completa el archivo `.env` con tus valores reales (base de datos, tokens, etc.)

### Paso 6: Instalar PM2 (gestor de procesos)
```bash
npm install -g pm2
```

### Paso 7: Iniciar el bot con PM2
```bash
pm2 start npm --name "whatsapp-bot" -- start:direct
pm2 save
pm2 startup
```

El último comando te dará un comando para ejecutar, cópialo y ejecútalo.

---

## 🔐 Configurar Despliegue Automático

Después de estos pasos, configuraremos:
1. Claves SSH para GitHub Actions
2. Secrets en GitHub
3. Probar el despliegue automático
