// Exportar todos los modelos desde un solo lugar
// Los modelos se generan automáticamente por Prisma
export { PrismaClient } from '@prisma/client';

// Re-exportar tipos útiles
export {
  Plan,
  Client,
  WhatsAppSession,
  ClientConfig,
  User,
  Message
} from '@prisma/client';

