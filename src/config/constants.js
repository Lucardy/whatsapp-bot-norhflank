// Constantes de configuración del sistema
// Todas las constantes mágicas del código están centralizadas aquí

// ============================================
// TIMEOUTS Y DELAYS (en milisegundos)
// ============================================

/** Tiempo de timeout para envío de mensajes (30 segundos) */
export const MESSAGE_SEND_TIMEOUT = 30 * 1000;

/** Delay entre mensajes de bienvenida (5 segundos) */
export const WELCOME_MESSAGE_DELAY = 5 * 1000;

/** Delay para registro de mensajes del bot (50 milisegundos) */
export const BOT_MESSAGE_REGISTER_DELAY = 50;

/** Delay entre inicializaciones de sesiones (2 segundos) */
export const SESSION_INIT_DELAY = 2 * 1000;

/** Delay para operaciones de eliminación de sesión (1-2 segundos) */
export const SESSION_DELETE_DELAY = 1 * 1000;
export const SESSION_DELETE_DELAY_LONG = 2 * 1000;

/** Delay para reconexión de sesiones (3 segundos) */
export const RECONNECT_DELAY = 3 * 1000;

/** Delay para operaciones de onboarding (2 segundos) */
export const ONBOARDING_DELAY = 2 * 1000;

/** Timeout para generación de QR (30 segundos) */
export const QR_GENERATION_TIMEOUT = 30 * 1000;

/** Timeout para espera de sesión en trial flow (30 segundos) */
export const TRIAL_SESSION_WAIT_TIMEOUT = 30 * 1000;

// ============================================
// CONVERSACIÓN Y MENSAJES
// ============================================

/** Tiempo de inactividad para resetear el estado de conversación (2 horas) */
/** Si el usuario no envía mensajes por este tiempo, se reinicia la conversación */
export const CONVERSATION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 horas

/** Tiempo de inactividad antes de reactivar el bot después de acción humana (30 minutos) */
export const HUMAN_INACTIVITY_TIMEOUT = 30 * 60 * 1000;

/** Ventana de tiempo para considerar un mensaje como enviado por el bot (15 segundos) */
export const BOT_MESSAGE_WINDOW = 15 * 1000;

/** Cooldown entre mensajes del mismo remitente (1.5 segundos) */
export const MESSAGE_COOLDOWN = 1500;

// ============================================
// VALIDACIÓN DE MENSAJES
// ============================================

/** Longitud mínima de mensaje de bot (3 caracteres) */
export const MIN_MESSAGE_LENGTH = 3;

/** Longitud máxima de mensaje de bot (2000 caracteres) */
export const MAX_MESSAGE_LENGTH = 2000;

// ============================================
// FILTROS DE MENSAJES
// ============================================

/** Tiempo máximo de antigüedad de mensaje para procesarlo (2 minutos) */
export const MAX_MESSAGE_AGE_MS = 2 * 60 * 1000;

/** Tiempo mínimo de uptime de sesión para procesar mensajes sin timestamp (5 segundos) */
export const MIN_SESSION_UPTIME_FOR_NO_TIMESTAMP = 5 * 1000;

// ============================================
// CACHE
// ============================================

/** TTL del cache de configuración (5 minutos) */
export const CONFIG_CACHE_TTL = 5 * 60 * 1000;

/** TTL del cache de cooldown (10 minutos) */
export const COOLDOWN_CACHE_TTL = 10 * 60 * 1000;

// ============================================
// HEARTBEAT Y MONITOREO
// ============================================

/** Intervalo de heartbeat para sesiones (10 segundos) */
export const HEARTBEAT_INTERVAL = 10 * 1000;

// ============================================
// PUERTO Y URLS
// ============================================

/** Puerto por defecto del servidor HTTP */
export const DEFAULT_PORT = 3000;

/** Base URL para QR codes */
export function getQRBaseUrl() {
  const port = process.env.PORT || DEFAULT_PORT;
  return `http://localhost:${port}`;
}

/** URL completa para QR de una sesión */
export function getQRUrl(sessionId) {
  return `${getQRBaseUrl()}/qr/${sessionId}`;
}

// ============================================
// CONVERSIÓN DE UNIDADES
// ============================================

/** Milisegundos en un segundo */
export const MS_PER_SECOND = 1000;

/** Milisegundos en un minuto */
export const MS_PER_MINUTE = 60 * 1000;

/** Milisegundos en una hora */
export const MS_PER_HOUR = 60 * 60 * 1000;

/** Milisegundos en un día */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

