# 📦 Carpeta Legacy

Esta carpeta contiene archivos antiguos que fueron refactorizados y ya no se usan en el código actual.

## 📄 Archivos

### `index.js.old`
- **Fecha de refactorización**: 2026-01-02
- **Razón**: Código monolítico refactorizado a estructura modular en `src/`
- **Estado**: ❌ No se usa - Solo para referencia histórica
- **Reemplazado por**: 
  - `src/index.js` (entry point)
  - `src/services/sessionManager.js` (gestión de sesiones)
  - `src/services/messageHandler/` (procesamiento de mensajes)
  - `src/routes/index.js` (rutas HTTP)
  - `src/config/index.js` (configuración)
  - `src/utils/logger/` (logging)

### `index.js.old2`
- **Fecha de limpieza**: 2026-01-XX
- **Razón**: Archivo antiguo en la raíz del proyecto, duplicado de `index.js.old`
- **Estado**: ❌ No se usa

### `sessionManagerMenu.js.old`
- **Fecha de refactorización**: 2026-01-XX
- **Razón**: Menú de sesiones refactorizado a estructura modular
- **Estado**: ❌ No se usa
- **Reemplazado por**: `src/utils/menu/`

### `manage-sessions.js.old`
- **Fecha de limpieza**: 2026-01-XX
- **Razón**: Script independiente obsoleto, funcionalidad integrada en `npm start`
- **Estado**: ❌ No se usa
- **Reemplazado por**: Menú integrado en `src/utils/menu/`

### `showQRLinks.js.old`
- **Fecha de limpieza**: 2026-01-XX
- **Razón**: Handler obsoleto, funcionalidad integrada en otros handlers
- **Estado**: ❌ No se usa

### `migrate-sessions-to-db.js.old`
- **Fecha de limpieza**: 2026-01-XX
- **Razón**: Script de migración ya ejecutado, no necesario mantenerlo
- **Estado**: ❌ No se usa

### `wwebjs_auth_old/`
- **Fecha de limpieza**: 2026-01-XX
- **Razón**: Carpeta antigua de sesiones antes de la refactorización
- **Estado**: ❌ No se usa
- **Nota**: Las sesiones ahora se guardan en `sessions/[sessionId]/.wwebjs_auth/`

## ⚠️ Nota

Estos archivos se mantienen solo para referencia histórica. **NO deben ejecutarse** ya que pueden tener dependencias o configuraciones obsoletas.

Si necesitas consultar cómo funcionaba algo antes de la refactorización, puedes revisar estos archivos, pero siempre usa el código en `src/` para desarrollo.

