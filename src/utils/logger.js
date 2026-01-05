// Re-exportar desde el nuevo sistema de logging (compatibilidad hacia atrás)
export {
  log,
  logSession,
  debug,
  warn,
  error,
  debugSession,
  warnSession,
  errorSession,
  LogLevel
} from './logger/index.js';

