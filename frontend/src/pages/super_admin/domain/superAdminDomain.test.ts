import { describe, expect, it } from 'vitest';
import {
  normalizeEmail,
  passwordErrors,
  slugify,
  superAdminPath,
  toCsv,
  validateSettings,
  viewFromPath,
} from './superAdminDomain';
import type { PlatformSettings } from '../types';

const validSettings: PlatformSettings = {
  platformName: 'Peça Já',
  platformDomain: 'app.pecaja.com.br',
  supportEmail: 'suporte@pecaja.com.br',
  primaryColor: '#f4510b',
  locale: 'pt-BR',
  currency: 'BRL',
  timezone: 'America/Fortaleza',
  dateFormat: 'dd/MM/yyyy',
  allowRestaurantSignup: true,
  requireManualApproval: true,
  defaultTrialDays: 14,
  auditRetentionDays: 180,
  maintenanceMode: false,
  maintenanceMessage: 'Plataforma temporariamente indisponível.',
  version: 2,
  updatedAt: '2026-08-28T10:00:00.000Z',
};

describe('superAdminDomain', () => {
  it('resolve apenas rotas conhecidas do painel e gera links profundos', () => {
    expect(viewFromPath('/super_admin/restaurants')).toBe('restaurants');
    expect(viewFromPath('/super_admin/settings/')).toBe('settings');
    expect(viewFromPath('/super_admin/unknown')).toBe('overview');
    expect(superAdminPath('audit')).toBe('/super_admin/audit');
  });

  it('normaliza dados usados no cadastro sem perder caracteres relevantes', () => {
    expect(normalizeEmail('  SUPORTE@EXEMPLO.COM ')).toBe('suporte@exemplo.com');
    expect(slugify('  Pizzaria São João  ')).toBe('pizzaria-sao-joao');
  });

  it('protege exportações CSV contra fórmulas e escapa aspas', () => {
    const csv = toCsv(['Nome', 'Observação'], [['=2+2', 'Cliente "VIP"']]);

    expect(csv).toContain('"\'=2+2"');
    expect(csv).toContain('"Cliente ""VIP"""');
  });

  it('exige senha administrativa forte', () => {
    expect(passwordErrors('senha123')).toEqual(
      expect.arrayContaining([
        'Use pelo menos 16 caracteres.',
        'Inclua uma letra maiúscula.',
        'Inclua um símbolo.',
        'Evite senhas previsíveis.',
      ]),
    );
    expect(passwordErrors('UmaSenha#MuitoForte2026')).toEqual([]);
  });

  it('valida configurações persistidas e exige mensagem durante manutenção', () => {
    expect(validateSettings(validSettings)).toEqual([]);
    expect(
      validateSettings({
        ...validSettings,
        supportEmail: 'invalido',
        primaryColor: 'laranja',
        auditRetentionDays: 10,
        maintenanceMode: true,
        maintenanceMessage: 'curta',
      }),
    ).toEqual(
      expect.arrayContaining([
        'Informe um e-mail de suporte válido.',
        'A cor deve usar o formato #RRGGBB.',
        'A retenção de auditoria deve ficar entre 90 e 3.650 dias.',
        'Explique a manutenção em pelo menos 10 caracteres.',
      ]),
    );
  });
});
