# Sesiones Persistentes de WhatsApp

## ✅ Cómo Funciona

El bot está configurado para **guardar las sesiones de WhatsApp permanentemente**. Después de escanear el QR **una sola vez**, la sesión quedará guardada y no necesitarás escanearlo nuevamente.

## 📁 Estructura de Sesiones

Las sesiones se guardan en:
```
sessions/
├── unikuo/
│   └── .wwebjs_auth/          ← Datos de autenticación (se crea automáticamente)
│       ├── Default/
│       │   └── Local Storage/  ← Aquí se guarda la sesión
│       └── ...
└── pablo/
    └── .wwebjs_auth/          ← Datos de autenticación (se crea automáticamente)
        └── ...
```

## 🔄 Proceso

1. **Primera vez que ejecutas el bot:**
   - El bot genera un QR
   - Escaneas el QR con WhatsApp en tu celular
   - La sesión se guarda automáticamente en `sessions/[nombre]/.wwebjs_auth/`

2. **Próximas veces que ejecutas el bot:**
   - El bot lee la sesión guardada
   - Se conecta automáticamente **sin pedir QR**
   - ¡Listo para usar!

## 💾 Persistencia

- ✅ Las sesiones se guardan **localmente** en tu computadora
- ✅ Las sesiones se guardan **en GitHub** (si haces commit de la carpeta `sessions/`)
- ✅ Las sesiones funcionan en **producción** (Northflank) si están en el repositorio

## ⚠️ Importante

- **NO elimines** la carpeta `.wwebjs_auth/` dentro de cada sesión
- **NO elimines** la carpeta `sessions/` completa
- Si eliminas una sesión, tendrás que escanear el QR nuevamente

## 🔧 Si Necesitas Resetear una Sesión

Si por alguna razón necesitas resetear una sesión:

1. Detén el bot (`Ctrl+C`)
2. Elimina la carpeta de la sesión:
   ```bash
   # Windows PowerShell
   Remove-Item -Recurse -Force sessions\unikuo\.wwebjs_auth
   # O para pablo:
   Remove-Item -Recurse -Force sessions\pablo\.wwebjs_auth
   ```
3. Reinicia el bot
4. Escanea el QR nuevamente

## 📝 Notas

- La carpeta `.wwebjs_auth/` se crea automáticamente después de escanear el QR
- Cada sesión tiene su propia carpeta de autenticación
- Las sesiones son independientes entre sí

