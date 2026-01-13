// Construcción y configuración del cliente WhatsApp
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { logSession } from '../../utils/logger/index.js';

/**
 * Crea la configuración de Puppeteer para WhatsApp
 * @returns {Object} Configuración de Puppeteer
 */
export function getPuppeteerConfig() {
  return {
    headless: true,
    executablePath: puppeteer.executablePath(),
    protocolTimeout: 300_000, // Aumentado a 5 minutos para conexiones lentas
    defaultViewport: { width: 800, height: 600, deviceScaleFactor: 1 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-zygote',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--no-first-run',
      '--no-default-browser-check',
      '--mute-audio',
      '--window-size=800,600',
      '--disable-web-security', // Ayuda con problemas de CORS
      '--disable-features=IsolateOrigins,site-per-process' // Ayuda con conexiones
      // Removido '--blink-settings=imagesEnabled=false' porque bloquea el envío de imágenes
    ]
  };
}

/**
 * Crea un nuevo cliente WhatsApp
 * @param {string} sessionId - ID de la sesión
 * @param {string} sessionPath - Ruta donde se guardará la sesión
 * @returns {Client} Cliente de WhatsApp configurado
 */
export function createWhatsAppClient(sessionId, sessionPath) {
  logSession(sessionId, '🔧 Creando cliente WhatsApp');
  logSession(sessionId, `📁 Ruta de sesión: ${sessionPath}`);
  
  // Asegurar que el directorio existe
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
    logSession(sessionId, `📁 Directorio de sesión creado: ${sessionPath}`);
  }
  
  // Verificar si ya existe una sesión guardada
  const authPath = path.join(sessionPath, '.wwebjs_auth');
  const hasSavedSession = fs.existsSync(authPath);
  if (hasSavedSession) {
    logSession(sessionId, `✅ Sesión guardada encontrada en: ${authPath}`);
  } else {
    logSession(sessionId, `⚠️ No se encontró sesión guardada en: ${authPath}`);
    logSession(sessionId, `   Se generará un nuevo QR al inicializar`);
  }
  
  // LocalAuth guardará los datos de autenticación en .wwebjs_auth/ dentro de sessionPath
  // Después de escanear el QR una vez, la sesión quedará guardada ahí permanentemente
  // La estructura será: sessions/[sessionId]/.wwebjs_auth/
  const client = new Client({
    authStrategy: new LocalAuth({ 
      dataPath: sessionPath
    }),
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/wa-version.json',
    },
    puppeteer: getPuppeteerConfig()
  });

  return client;
}

