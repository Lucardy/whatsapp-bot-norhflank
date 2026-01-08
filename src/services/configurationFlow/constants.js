// Constantes del flujo de configuración

// Estados del flujo de configuración
export const ConfigStep = {
  IDLE: 'idle',
  SELECTING_OPTION: 'selecting_option',
  WELCOME: 'configuring_welcome',
  OPTION_LABEL: 'configuring_option_label',
  OPTION_RESPONSE: 'configuring_option_response',
  RESETTING: 'resetting',
  COMPLETED: 'completed'
};

// Máximo de opciones permitidas
export const MAX_OPTIONS = 8;

// Patrones de mensajes del bot que deben ser ignorados
export const BOT_MESSAGE_PATTERNS = [
  '⚙️ *Menú de Configuración*',
  'Modo Configuración Activado',
  '¿Qué quieres editar o configurar?',
  '*Editando:',
  '*Agregando:'
];

// Tiempo mínimo entre respuesta del bot y mensaje del usuario (en ms)
// Reducido a 300ms para permitir respuestas más rápidas del usuario
export const MIN_RESPONSE_DELAY = 300;

// Longitud máxima de mensaje para detectar si es respuesta del bot
export const BOT_MESSAGE_MAX_LENGTH = 200;

