# 📱 Guía de Multi-Sesión

## ¿Qué es esto?

El bot ahora soporta **múltiples cuentas de WhatsApp simultáneamente**. Cada cuenta tiene su propia sesión independiente y puede recibir/responder mensajes al mismo tiempo.

## 🚀 Configuración Rápida

### ⭐ Opción Recomendada: Menú Integrado

Ejecuta simplemente:

```bash
npm start
```

Esto abrirá un menú interactivo donde puedes:
- ▶️ Iniciar el bot directamente
- ⚙️ Gestionar sesiones (agregar, eliminar, listar, ver QR)
- ⚙️ Gestionar sesiones y luego iniciar el bot

**Todo está unificado en un solo comando!** 🎉

### Opción Alternativa: Gestor Separado

Si prefieres usar el gestor de sesiones por separado:

```bash
npm run manage
```

Esto abrirá el mismo menú de gestión de sesiones.

### Opción 2: Variable de Entorno

```bash
# Windows PowerShell
$env:SESSIONS="unikuo,cliente2,cliente3"
npm start

# Linux/Mac
export SESSIONS="unikuo,cliente2,cliente3"
npm start
```

### Opción 3: Archivo de Configuración

Edita `sessions-config.json`:
```json
{
  "sessions": ["unikuo", "cliente2", "cliente3"]
}
```

## 📁 Estructura de Carpetas

Las sesiones se guardan en:
```
sessions/
├── unikuo/
│   └── .wwebjs_auth/    (autenticación de WhatsApp)
├── cliente2/
│   └── .wwebjs_auth/
└── cliente3/
    └── .wwebjs_auth/
```

## 🔗 Endpoints HTTP

### Listar todas las sesiones
```
GET http://localhost:3000/sessions
```

### Ver QR de una sesión específica
```
GET http://localhost:3000/qr/unikuo
GET http://localhost:3000/qr/cliente2
```

### Estado de una sesión
```
GET http://localhost:3000/state/unikuo
```

### Estado de todas las sesiones
```
GET http://localhost:3000/state
```

### Reiniciar una sesión
```
POST http://localhost:3000/restart/unikuo
```

### Health Check
```
GET http://localhost:3000/health
```

## 📝 Ejemplo de Uso

### Usando el Gestor Interactivo

1. **Abrir el gestor:**
   ```bash
   npm run manage
   ```

2. **Agregar una sesión:**
   - Selecciona "➕ Agregar nueva sesión"
   - Ingresa un nombre (ej: "restaurante")
   - El sistema te mostrará el link del QR automáticamente

3. **Iniciar el bot:**
   ```bash
   npm start
   ```

4. **Escanear el QR:**
   - Abre el link que te mostró el gestor (ej: `http://localhost:3000/qr/restaurante`)
   - Escanea con la cuenta de WhatsApp correspondiente

5. **Verificar estado:**
   ```bash
   curl http://localhost:3000/state
   ```

### Flujo Completo

```bash
# 1. Gestionar sesiones
npm run manage

# 2. Iniciar el bot
npm start

# 3. En otra terminal, verificar estado
curl http://localhost:3000/state
```

## ⚙️ Variables de Entorno

| Variable | Descripción | Default |
|----------|-------------|---------|
| `SESSIONS` | Lista de sesiones separadas por coma | `unikuo` |
| `SESSION_BASE_DIR` | Carpeta base para sesiones | `./sessions` |
| `PORT` | Puerto del servidor HTTP | `3000` |

## 🔍 Logs

Cada log incluye el ID de la sesión entre corchetes:
```
[pid 1234] 🔧 [unikuo] Creando cliente WhatsApp...
[pid 1234] ✅ [unikuo] BOT IS READY | state = CONNECTED
[pid 1234] 📨 [restaurante] ========== MENSAJE RECIBIDO ==========
```

## ⚠️ Notas Importantes

1. **Cada sesión es independiente**: Si una se desconecta, las otras siguen funcionando
2. **Mismos mensajes por ahora**: Todas las sesiones responden con los mismos mensajes (personalización por cliente viene después)
3. **Carpeta sessions/**: Agrega `sessions/` a tu `.gitignore` para no subir las sesiones
4. **Recursos**: Cada sesión consume memoria y CPU, tenlo en cuenta al escalar

## 🐛 Troubleshooting

### Una sesión no se conecta
- Verifica los logs: `[sessionId]` para ver errores específicos
- Revisa que la carpeta de sesión tenga permisos de escritura
- Intenta reiniciar: `POST /restart/sessionId`

### QR no aparece
- Espera 10-15 segundos después de iniciar
- Verifica que la sesión esté en estado `qr_pending`
- Revisa los logs para errores

### Múltiples sesiones consumen mucha memoria
- Considera usar menos sesiones simultáneas
- En producción, considera separar en múltiples instancias

## 📚 Próximos Pasos

- [ ] Personalización de mensajes por cliente
- [ ] Base de datos para configuraciones
- [ ] Panel de administración
- [ ] Sistema de planes y pagos

