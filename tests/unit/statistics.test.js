// Tests para el servicio de estadísticas
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { formatStatisticsMessage } from '../../src/services/clientMenu/statisticsService.js';

describe('Statistics Service', () => {
  describe('formatStatisticsMessage', () => {
    it('debe formatear estadísticas completas correctamente', () => {
      const stats = {
        clientName: 'Test Client',
        status: 'trial',
        daysRemaining: 5,
        messagesToday: 10,
        messagesThisWeek: 50,
        messagesThisMonth: 200,
        mostUsedOption: 1,
        optionUsageCount: 45,
        isConnected: true,
        sessionStatus: 'connected',
        lastActivity: new Date(),
        botEnabled: true
      };
      
      const message = formatStatisticsMessage(stats);
      
      expect(message).toContain('📊 *Estadísticas de tu Bot*');
      expect(message).toContain('🟢 Conectado');
      expect(message).toContain('✅ Activado');
      expect(message).toContain('Hoy: *10*');
      expect(message).toContain('Esta semana: *50*');
      expect(message).toContain('Este mes: *200*');
      expect(message).toContain('Opción *1*');
      expect(message).toContain('5 día');
    });
    
    it('debe manejar estadísticas con bot desactivado', () => {
      const stats = {
        clientName: 'Test Client',
        status: 'active',
        daysRemaining: null,
        messagesToday: 0,
        messagesThisWeek: 0,
        messagesThisMonth: 0,
        mostUsedOption: null,
        optionUsageCount: 0,
        isConnected: false,
        sessionStatus: 'disconnected',
        lastActivity: new Date(),
        botEnabled: false
      };
      
      const message = formatStatisticsMessage(stats);
      
      expect(message).toContain('🔴 Desconectado');
      expect(message).toContain('⏸️ Desactivado');
      expect(message).toContain('Hoy: *0*');
    });
    
    it('debe manejar estadísticas nulas', () => {
      const message = formatStatisticsMessage(null);
      
      expect(message).toContain('❌ *Error al obtener estadísticas*');
    });
    
    it('debe mostrar días restantes de prueba correctamente', () => {
      const stats = {
        clientName: 'Test Client',
        status: 'trial',
        daysRemaining: 1,
        messagesToday: 5,
        messagesThisWeek: 20,
        messagesThisMonth: 80,
        mostUsedOption: 2,
        optionUsageCount: 20,
        isConnected: true,
        sessionStatus: 'connected',
        lastActivity: new Date(),
        botEnabled: true
      };
      
      const message = formatStatisticsMessage(stats);
      
      expect(message).toContain('1 día restante');
    });
    
    it('debe mostrar prueba finalizada cuando daysRemaining es 0', () => {
      const stats = {
        clientName: 'Test Client',
        status: 'trial',
        daysRemaining: 0,
        messagesToday: 0,
        messagesThisWeek: 0,
        messagesThisMonth: 0,
        mostUsedOption: null,
        optionUsageCount: 0,
        isConnected: true,
        sessionStatus: 'connected',
        lastActivity: new Date(),
        botEnabled: false
      };
      
      const message = formatStatisticsMessage(stats);
      
      expect(message).toContain('⚠️ *Prueba finalizada*');
    });
  });
});

