// Constantes y tipos para el flujo de prueba gratuita

// Estados del flujo de prueba gratuita
export const TrialStep = {
  IDLE: 'idle',
  NAME: 'collecting_name',
  EMAIL: 'collecting_email',
  QR_PHONE: 'collecting_qr_phone',
  COMPLETED: 'completed'
};

// Mapa de sesiones en modo prueba gratuita: phoneNumber -> { step, data, sessionId }
export const trialSessions = new Map();

