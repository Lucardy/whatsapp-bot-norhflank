// Lógica de generación y obtención de QR para el flujo de prueba gratuita
import { logSession } from '../../utils/logger/index.js';
import { verifySessionForNewClient, prepareSessionForClient } from './sessionManager.js';

/**
 * Obtiene el QR de una sesión existente o espera a que se genere
 * @param {Object} sessionManager - Instancia del SessionManager
 * @param {string} sessionName - Nombre de la sesión
 * @param {Object} result - Resultado de creación de cliente/sesión
 * @param {string} sessionId - ID de la sesión para logging
 * @returns {Promise<Object>} { qrDataURL: string|null, isSessionReady: boolean }
 */
export async function getQRForSession(sessionManager, sessionName, result, sessionId) {
  if (!sessionManager) {
    return { qrDataURL: null, isSessionReady: false };
  }
  
  try {
    logSession(sessionId, `🚀 Iniciando sesión para generar QR: ${sessionName}`);
    
    // Verificar si la sesión ya existe en el SessionManager
    let sessionData = sessionManager.getSession(sessionName);
    
    // Verificar en la base de datos si la sesión pertenece al cliente que se acaba de crear
    let verificationResult = { shouldReset: false, isReady: false, needsStart: false, qrDataURL: null };
    
    if (sessionData) {
      const { getSessionByName } = await import('../database/sessionService.js');
      const dbSession = await getSessionByName(sessionName);
      
      verificationResult = await verifySessionForNewClient({
        sessionData,
        dbSession,
        newClientId: result.client.id,
        newClientPhone: result.client.contact_phone,
        sessionId
      });
    }
    
    // Preparar la sesión (crear, resetear o iniciar según sea necesario)
    sessionData = await prepareSessionForClient({
      sessionManager,
      sessionName,
      verificationResult,
      sessionId
    });
    
    let qrDataURL = verificationResult.qrDataURL || null;
    let isSessionReady = verificationResult.isReady || false;
    
    // Esperar a que se genere el QR si la sesión se acaba de crear o resetear
    if (!isSessionReady && !qrDataURL && sessionData) {
      logSession(sessionId, `⏳ Esperando generación de QR para sesión: ${sessionName}`);
      // Esperar hasta 30 segundos para que se genere el QR
      const maxWaitTime = 30000;
      const startTime = Date.now();
      while (!qrDataURL && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (sessionData.lastQRDataURL) {
          qrDataURL = sessionData.lastQRDataURL;
          logSession(sessionId, `✅ QR generado para sesión: ${sessionName}`);
          break;
        }
        // Actualizar sessionData por si cambió
        sessionData = sessionManager.getSession(sessionName);
      }
      if (!qrDataURL) {
        logSession(sessionId, `⚠️ QR no generado después de ${maxWaitTime}ms`);
      }
    } else if (sessionData?.lastQRDataURL && !qrDataURL) {
      qrDataURL = sessionData.lastQRDataURL;
      logSession(sessionId, `✅ QR encontrado en sessionData: ${sessionName}`);
    }
    
    return { qrDataURL, isSessionReady };
  } catch (err) {
    logSession(sessionId, `⚠️ Error iniciando sesión para QR: ${err?.message || err}`);
    return { qrDataURL: null, isSessionReady: false };
  }
}

