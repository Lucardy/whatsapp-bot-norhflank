# 🤖 Bot Multi-Sesión de WhatsApp

Bot de WhatsApp que soporta múltiples cuentas simultáneamente, cada una con sus propias respuestas automatizadas.

## ✨ Características

- ✅ **Multi-sesión**: Soporta múltiples cuentas de WhatsApp simultáneamente
- ✅ **Gestión interactiva**: Menú para agregar/quitar sesiones fácilmente
- ✅ **Respuestas automáticas**: Sistema de menú con opciones personalizables
- ✅ **Persistencia**: Las sesiones se guardan y persisten entre reinicios
- ✅ **Monitoreo**: Endpoints HTTP para ver estado, QRs y health checks
- ✅ **Arquitectura modular**: Código organizado y escalable

## 🚀 Inicio Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Iniciar el bot (todo en uno)
```bash
npm start
```

Esto abrirá un **menú interactivo unificado** donde puedes:
- ▶️ Iniciar el bot directamente
- ⚙️ Gestionar sesiones (agregar, eliminar, listar, ver QR)
- ⚙️ Gestionar sesiones y luego iniciar el bot

**¡Todo está integrado en un solo comando!** 🎉

### 3. Escanear QR
Cuando el bot esté corriendo, abre el link del QR (ej: `http://localhost:3000/qr/unikuo`) y escanea con WhatsApp.

**Nota:** Si quieres iniciar el bot sin el menú (útil para producción), usa:
```bash
npm run start:direct
```

## 📁 Estructura del Proyecto

```
src/
├── config/          # Configuración del sistema
├── services/        # Lógica de negocio (SessionManager, MessageHandler)
├── routes/          # Endpoints HTTP
├── utils/           # Utilidades (logger)
└── index.js         # Entry point
```

Ver [STRUCTURE.md](./STRUCTURE.md) para más detalles.

## 🔗 Endpoints HTTP

- `GET /` - Estado general del bot
- `GET /sessions` - Lista todas las sesiones
- `GET /qr/:sessionId` - QR de una sesión específica
- `GET /state/:sessionId` - Estado de una sesión
- `GET /state` - Estado de todas las sesiones
- `GET /health` - Health check
- `POST /restart/:sessionId` - Reiniciar una sesión

## ⚙️ Configuración

### Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `SESSIONS` | Lista de sesiones separadas por coma | Lee de `sessions-config.json` |
| `SESSION_BASE_DIR` | Carpeta base para sesiones | `./sessions` |
| `PORT` | Puerto del servidor HTTP | `3000` |

### Archivo de Configuración

`sessions-config.json`:
```json
{
  "sessions": ["unikuo", "cliente2", "cliente3"]
}
```

## 🐳 Docker

```bash
docker build -t whatsapp-bot .
docker run -p 3000:3000 whatsapp-bot
```

## 📚 Documentación

- [STRUCTURE.md](./STRUCTURE.md) - Estructura del proyecto y arquitectura
- [MULTI_SESSION.md](./MULTI_SESSION.md) - Guía de multi-sesión
- [ROADMAP.md](./ROADMAP.md) - Plan de desarrollo futuro

## 🔧 Desarrollo

### Estructura Modular

El código está organizado en módulos con responsabilidades claras:

- **config/**: Configuración y carga de sesiones
- **services/**: Lógica de negocio (sesiones, mensajes)
- **routes/**: API HTTP
- **utils/**: Utilidades compartidas

### Agregar Nueva Funcionalidad

1. Identifica el módulo apropiado según la responsabilidad
2. Crea/edita el archivo en la carpeta correspondiente
3. Exporta funciones/clases desde el módulo
4. Importa donde sea necesario

## 🛣️ Roadmap

Ver [ROADMAP.md](./ROADMAP.md) para el plan completo de desarrollo, incluyendo:
- Base de datos
- Panel de administración
- Sistema de planes y pagos
- Personalización por cliente

## 📝 Notas

- Las sesiones se guardan en `sessions/` y se suben a GitHub para producción
- Cada sesión tiene su propia carpeta de autenticación
- Los QRs se generan automáticamente cuando es necesario
- El sistema reconecta automáticamente si una sesión se desconecta

## 📄 Licencia

Proyecto privado - Unikuo

