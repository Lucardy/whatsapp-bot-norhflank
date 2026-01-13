// Templates HTML para las páginas de QR
export function renderQRNotFound(sessionId) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR - Sesión no encontrada</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .error { color: #d32f2f; background: white; padding: 20px; border-radius: 8px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="error">
        <h1>❌ Sesión "${sessionId}" no encontrada</h1>
        <p>La sesión no está configurada o el bot no se ha iniciado.</p>
        <p><a href="/sessions">Ver sesiones disponibles</a></p>
      </div>
    </body>
    </html>
  `;
}

export function renderQRConnected(sessionId) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR - ${sessionId}</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .success { color: #2e7d32; background: white; padding: 30px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .success h1 { margin-top: 0; }
        .success a { color: #1976d2; text-decoration: none; font-weight: bold; }
        .success a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="success">
        <h1>✅ Sesión "${sessionId}" conectada</h1>
        <p>🎉 ¡QR escaneado exitosamente!</p>
        <p>La sesión está activa y guardada. No necesitarás escanear el QR nuevamente.</p>
        <p><a href="/state/${sessionId}">Ver estado de la sesión</a></p>
        <p><small>Si quieres cambiar el WhatsApp, resetea la sesión desde el menú.</small></p>
      </div>
    </body>
    </html>
  `;
}

export function renderQRLoading(sessionId) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR - ${sessionId}</title>
      <meta charset="utf-8">
      <meta http-equiv="refresh" content="3">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .loading { color: #1976d2; background: white; padding: 30px; border-radius: 8px; display: inline-block; }
        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="loading">
        <h1>⏳ Generando QR para "${sessionId}"...</h1>
        <div class="spinner"></div>
        <p>Esperando a que el bot genere el código QR.</p>
        <p>Esta página se actualizará automáticamente cada 3 segundos.</p>
        <p><small>Si el bot no está corriendo, inícialo con: <code>npm start</code></small></p>
      </div>
    </body>
    </html>
  `;
}

export function renderQRPage(sessionId, qrDataURL) {
  const qrBase64 = qrDataURL.split(',')[1];
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>QR - ${sessionId}</title>
      <meta charset="utf-8">
      <meta http-equiv="refresh" content="10">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .qr-container { background: white; padding: 30px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .qr-container img { max-width: 400px; height: auto; border: 2px solid #ddd; border-radius: 4px; }
        .instructions { margin-top: 20px; color: #666; }
        .refresh { margin-top: 15px; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="qr-container">
        <h1>📱 Escanea este QR con WhatsApp</h1>
        <p><strong>Sesión:</strong> ${sessionId}</p>
        <img src="data:image/png;base64,${qrBase64}" alt="QR Code">
        <div class="instructions">
          <p>1. Abre WhatsApp en tu celular</p>
          <p>2. Ve a <strong>Configuración → Dispositivos vinculados</strong></p>
          <p>3. Toca <strong>"Vincular un dispositivo"</strong></p>
          <p>4. Escanea este código QR</p>
        </div>
        <div class="refresh">
          <p>Esta página se actualiza automáticamente cada 10 segundos</p>
          <p><a href="/qr/${sessionId}">Recargar ahora</a> | <a href="/state/${sessionId}">Ver estado</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

