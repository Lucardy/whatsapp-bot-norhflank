# 🔧 Arreglar Prisma Studio - Error de Autenticación

El error indica que Prisma Studio está intentando usar el usuario `postgres` en lugar de `whatsapp_user`.

## Solución: Verificar y corregir el archivo .env

### Paso 1: Verificar el contenido del .env en el VPS

En el terminal web del VPS, ejecuta:

```bash
cd ~/whatsapp-bot-norhflank
cat .env | grep DATABASE_URL
```

Deberías ver algo como:
```
DATABASE_URL="postgresql://whatsapp_user:8Wjnmyrq123-@localhost:5432/whatsapp_bot?schema=public"
```

### Paso 2: Si está mal, corregirlo

Si ves que usa `postgres` en lugar de `whatsapp_user`, edítalo:

```bash
nano .env
```

Busca la línea `DATABASE_URL` y asegúrate de que sea:
```
DATABASE_URL="postgresql://whatsapp_user:8Wjnmyrq123-@localhost:5432/whatsapp_bot?schema=public"
```

Guarda: `Ctrl + X`, luego `Y`, luego `Enter`

### Paso 3: Ejecutar Prisma Studio con el .env explícito

```bash
cd ~/whatsapp-bot-norhflank
npx dotenv -e .env -- npx prisma studio --port 5555 --hostname 0.0.0.0
```

O si `dotenv-cli` no está instalado:

```bash
cd ~/whatsapp-bot-norhflank
export $(cat .env | grep DATABASE_URL)
npx prisma studio --port 5555 --hostname 0.0.0.0
```

---

## Alternativa: Instalar dotenv-cli

Si quieres una solución más permanente:

```bash
npm install -g dotenv-cli
```

Luego siempre ejecuta:
```bash
dotenv -e .env -- npx prisma studio --port 5555 --hostname 0.0.0.0
```

---

## Verificar que funciona

Después de ejecutar Prisma Studio, deberías poder ver las tablas sin errores de autenticación.
