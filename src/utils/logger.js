// Utilidad de logging con formato consistente
const PID = process.pid;

export const log = (...args) => {
  console.log(`[pid ${PID}]`, ...args);
};

export const logSession = (sessionId, ...args) => {
  console.log(`[pid ${PID}] [${sessionId}]`, ...args);
};

