// Templates HTML para las páginas de onboarding

/**
 * Renderiza la página de error para ID inválido
 * @param {number} clientId - ID del cliente (opcional)
 * @returns {string} HTML
 */
export function renderInvalidClientId(clientId = null) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error - ID Inválido</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .error { color: #d32f2f; background: white; padding: 20px; border-radius: 8px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="error">
        <h1>❌ ID de cliente inválido</h1>
      </div>
    </body>
    </html>
  `;
}

/**
 * Renderiza la página de error para cliente no encontrado
 * @param {number} clientId - ID del cliente
 * @returns {string} HTML
 */
export function renderClientNotFound(clientId) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cliente no encontrado</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .error { color: #d32f2f; background: white; padding: 20px; border-radius: 8px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="error">
        <h1>❌ Cliente no encontrado</h1>
        <p>El cliente con ID ${clientId} no existe.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Renderiza la página de error genérica
 * @param {string} errorMessage - Mensaje de error
 * @returns {string} HTML
 */
export function renderError(errorMessage) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .error { color: #d32f2f; background: white; padding: 20px; border-radius: 8px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="error">
        <h1>❌ Error</h1>
        <p>${errorMessage || 'Error interno del servidor'}</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Renderiza el panel de onboarding completo
 * @param {Object} params - Parámetros del panel
 * @param {string} params.clientName - Nombre del cliente
 * @param {number} params.clientId - ID del cliente
 * @param {boolean} params.isConnected - Si está conectado
 * @param {boolean} params.hasQR - Si tiene QR disponible
 * @param {string|null} params.qrImageUrl - URL de la imagen QR
 * @returns {string} HTML
 */
export function renderOnboardingPanel({ clientName, clientId, isConnected, hasQR, qrImageUrl }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Onboarding - ${clientName}</title>
      <meta charset="utf-8">
      <meta http-equiv="refresh" content="5">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header p { opacity: 0.9; }
        .content {
          padding: 40px;
        }
        .status-card {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 30px;
          border-left: 4px solid ${isConnected ? '#28a745' : '#ffc107'};
        }
        .status-card h2 {
          color: ${isConnected ? '#28a745' : '#ffc107'};
          margin-bottom: 10px;
          font-size: 20px;
        }
        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
          background: ${isConnected ? '#28a745' : '#ffc107'};
          color: white;
          margin-top: 10px;
        }
        .qr-section {
          text-align: center;
          margin: 30px 0;
        }
        .qr-section img {
          max-width: 300px;
          border: 3px solid #ddd;
          border-radius: 8px;
          padding: 10px;
          background: white;
        }
        .instructions {
          background: #e3f2fd;
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
        }
        .instructions h3 {
          color: #1976d2;
          margin-bottom: 15px;
        }
        .instructions ol {
          margin-left: 20px;
          line-height: 2;
        }
        .instructions li {
          margin-bottom: 10px;
        }
        .refresh-info {
          text-align: center;
          color: #666;
          font-size: 12px;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          margin-top: 15px;
          font-weight: bold;
          transition: background 0.3s;
        }
        .btn:hover {
          background: #5568d3;
        }
        .waiting {
          text-align: center;
          padding: 40px;
          color: #666;
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 Bienvenido, ${clientName}</h1>
          <p>Configura tu bot de WhatsApp en pocos pasos</p>
        </div>
        <div class="content">
          <div class="status-card">
            <h2>Estado de la Conexión</h2>
            <p>${isConnected ? '✅ Tu WhatsApp está conectado y funcionando' : '⏳ Esperando que escanees el código QR'}</p>
            <span class="status-badge">${isConnected ? 'CONECTADO' : 'PENDIENTE'}</span>
          </div>

          ${!isConnected ? `
            <div class="qr-section">
              ${hasQR ? `
                <h2>📱 Escanea este código QR</h2>
                <img src="${qrImageUrl}" alt="QR Code">
              ` : `
                <div class="waiting">
                  <div class="spinner"></div>
                  <h2>⏳ Generando código QR...</h2>
                  <p>Por favor espera unos segundos</p>
                </div>
              `}
            </div>

            <div class="instructions">
              <h3>📋 Instrucciones paso a paso:</h3>
              <ol>
                <li>Abre WhatsApp en tu celular</li>
                <li>Ve a <strong>Configuración → Dispositivos vinculados</strong></li>
                <li>Toca <strong>"Vincular un dispositivo"</strong></li>
                <li>Escanea el código QR que aparece arriba</li>
                <li>¡Listo! Tu bot estará funcionando automáticamente</li>
              </ol>
            </div>
          ` : `
            <div class="instructions">
              <h3>✅ ¡Todo listo!</h3>
              <p>Tu bot de WhatsApp está conectado y funcionando. Ahora puedes:</p>
              <ul style="margin-left: 20px; margin-top: 10px; line-height: 2;">
                <li>Enviar mensajes a tu número de WhatsApp para probar el bot</li>
                <li>Configurar las respuestas desde WhatsApp escribiendo "configurar" al número master</li>
                <li>Ver el estado de tu sesión en cualquier momento</li>
              </ul>
            </div>
          `}

          <div class="refresh-info">
            <p>Esta página se actualiza automáticamente cada 5 segundos</p>
            <a href="/api/clients/${clientId}/status" class="btn">Ver estado actual</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

