// Lógica de generación de pairing code para el flujo de prueba gratuita
import { logSession } from '../../utils/logger/index.js';

/**
 * Normaliza y detecta el código de país de un número de teléfono para pairing code
 * Esta función es un wrapper simple que usa la función centralizada de normalización
 * @param {string} phoneNumber - Número de teléfono a normalizar
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<string>} Número normalizado con código de país
 */
export async function normalizePhoneForPairing(phoneNumber, sessionId) {
  // Usar la función centralizada de normalización
  const { normalizePhoneWithCountryCode } = await import('../../utils/validation/phoneValidator.js');
  return normalizePhoneWithCountryCode(phoneNumber, 'AR', sessionId);
}

/**
 * Genera un pairing code para una sesión usando eventos en lugar de polling
 * @param {Object} options - Opciones para generar el pairing code
 * @param {Object} options.sessionData - Datos de la sesión del SessionManager
 * @param {string} options.phoneNumber - Número de teléfono para el pairing code
 * @param {string} options.sessionId - ID de la sesión para logging
 * @param {Object} options.sessionManager - Instancia del SessionManager
 * @param {string} options.sessionName - Nombre de la sesión
 * @returns {Promise<string|null>} Pairing code generado o null si no se pudo generar
 */
export async function generatePairingCode({ sessionData, phoneNumber, sessionId, sessionManager, sessionName }) {
  if (!phoneNumber) {
    return null;
  }
  
  try {
    // Normalizar número para pairing code
    const phoneForPairing = await normalizePhoneForPairing(phoneNumber, sessionId);
    logSession(sessionId, `🔐 Generando pairing code para número: ${phoneForPairing} (original: ${phoneNumber})`);
    
    // Obtener la sesión del cliente
    let currentSessionData = sessionData;
    if (!currentSessionData) {
      currentSessionData = sessionManager.getSession(sessionName);
    }
    
    if (!currentSessionData?.client) {
      logSession(sessionId, `❌ Cliente no inicializado para sesión ${sessionName}`);
      return null;
    }
    
    const client = currentSessionData.client;
    
    // Verificar si ya está conectado
    try {
      const clientState = await client.getState().catch(() => null);
      if (clientState === 'CONNECTED') {
        logSession(sessionId, `✅ Cliente ya está conectado, no se necesita pairing code`);
        return null;
      }
    } catch (stateError) {
      // Si no podemos verificar el estado, continuar con el flujo basado en eventos
      logSession(sessionId, `ℹ️ No se pudo verificar estado, continuando con flujo basado en eventos`);
    }
    
    // Usar eventos en lugar de polling
    // El pairing code se puede pedir cuando se dispara el evento 'qr' o 'auth_failure'
    return new Promise((resolve, reject) => {
      let resolved = false;
      const maxWaitTime = 30000; // 30 segundos máximo
      
      // Timeout global
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          logSession(sessionId, `⚠️ Timeout esperando pairing code después de ${maxWaitTime}ms`);
          resolve(null);
        }
      }, maxWaitTime);
      
      // Función de limpieza
      const cleanup = () => {
        client.removeListener('ready', onReady);
        client.removeListener('qr', onQR);
        client.removeListener('auth_failure', onAuthFailure);
        clearTimeout(timeout);
      };
      
      // Evento: Cliente ya está conectado
      const onReady = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          logSession(sessionId, `✅ Cliente ya conectado, no se necesita pairing code`);
          resolve(null);
        }
      };
      
      // Evento: QR solicitado (momento perfecto para pedir pairing code)
      const onQR = async () => {
        if (!resolved) {
          try {
            logSession(sessionId, `🔐 Evento QR detectado - Solicitando pairing code para ${phoneForPairing}`);
            const code = await client.requestPairingCode(phoneForPairing);
            resolved = true;
            cleanup();
            logSession(sessionId, `✅ Pairing code generado: ${code}`);
            resolve(code);
          } catch (err) {
            const errorMsg = err?.message || err?.toString() || '';
            logSession(sessionId, `⚠️ Error al generar pairing code en evento QR: ${errorMsg}`);
            
            // Si el error es "Evaluation failed: t", la solicitud probablemente fue enviada
            // pero el código no se pudo extraer. En este caso, retornamos un valor especial
            if (errorMsg.includes('Evaluation failed') || errorMsg.includes('Evaluation failed: t')) {
              logSession(sessionId, `ℹ️ La solicitud fue enviada a WhatsApp pero el código no se pudo extraer`);
              logSession(sessionId, `ℹ️ El usuario debería revisar su WhatsApp móvil para ver el código`);
              resolved = true;
              cleanup();
              // Retornamos un string especial que indica que la solicitud fue enviada
              resolve('REQUEST_SENT');
            }
            // Continuar esperando otros eventos si no es el error esperado
          }
        }
      };
      
      // Evento: Autenticación fallida (también es un buen momento)
      const onAuthFailure = async () => {
        if (!resolved) {
          try {
            logSession(sessionId, `🔐 Evento auth_failure detectado - Solicitando pairing code para ${phoneForPairing}`);
            const code = await client.requestPairingCode(phoneForPairing);
            resolved = true;
            cleanup();
            logSession(sessionId, `✅ Pairing code generado: ${code}`);
            resolve(code);
          } catch (err) {
            const errorMsg = err?.message || err?.toString() || '';
            logSession(sessionId, `⚠️ Error al generar pairing code en evento auth_failure: ${errorMsg}`);
            
            // Si el error es "Evaluation failed: t", la solicitud probablemente fue enviada
            if (errorMsg.includes('Evaluation failed') || errorMsg.includes('Evaluation failed: t')) {
              logSession(sessionId, `ℹ️ La solicitud fue enviada a WhatsApp pero el código no se pudo extraer`);
              resolved = true;
              cleanup();
              resolve('REQUEST_SENT');
            }
            // Continuar esperando otros eventos si no es el error esperado
          }
        }
      };
      
      // Registrar listeners
      client.once('ready', onReady);
      client.once('qr', onQR);
      client.once('auth_failure', onAuthFailure);
      
      // Si el cliente ya está emitiendo QR, intentar inmediatamente
      // (puede que el evento ya se haya disparado antes de registrar el listener)
      // También verificar si el cliente está en proceso de autenticación
      setTimeout(async () => {
        if (!resolved) {
          try {
            // Verificar si ya hay un QR disponible (el evento ya se disparó)
            if (currentSessionData.lastQRDataURL) {
              logSession(sessionId, `🔐 QR ya disponible - Intentando generar pairing code para ${phoneForPairing}`);
              const code = await client.requestPairingCode(phoneForPairing);
              resolved = true;
              cleanup();
              logSession(sessionId, `✅ Pairing code generado: ${code}`);
              resolve(code);
              return;
            }
            
            // Si no hay QR pero el cliente no está conectado, intentar de todas formas
            // (el evento qr puede estar por dispararse)
            const clientState = await client.getState().catch(() => null);
            if (clientState !== 'CONNECTED' && clientState !== null) {
              logSession(sessionId, `🔐 Cliente en estado ${clientState} - Intentando generar pairing code para ${phoneForPairing}`);
              const code = await client.requestPairingCode(phoneForPairing);
              resolved = true;
              cleanup();
              logSession(sessionId, `✅ Pairing code generado: ${code}`);
              resolve(code);
            }
          } catch (err) {
            // Si falla, los eventos seguirán esperando
            logSession(sessionId, `ℹ️ No se pudo generar pairing code inmediatamente (${err?.message || err}), esperando eventos...`);
          }
        }
      }, 3000); // Esperar 3 segundos para ver si ya hay QR o si podemos intentar
      
    });
    
  } catch (error) {
    logSession(sessionId, `❌ Error en proceso de pairing code: ${error?.message || error}`);
    return null;
  }
}

