import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import superAdminService from './superAdminService';
import type { PlatformSettings } from '../pages/super_admin/types';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('superAdminService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carrega o snapshot consolidado aceitando cancelamento', async () => {
    const controller = new AbortController();
    vi.mocked(api.get).mockResolvedValue({ data: { restaurants: [] } });

    await expect(superAdminService.getDashboard(controller.signal)).resolves.toEqual({
      restaurants: [],
    });
    expect(api.get).toHaveBeenCalledWith('/super-admin/dashboard', {
      signal: controller.signal,
    });
  });

  it('remove campos somente leitura ao salvar configurações', async () => {
    const settings: PlatformSettings = {
      platformName: 'Peça Já',
      platformDomain: 'app.pecaja.com.br',
      supportEmail: 'suporte@pecaja.com.br',
      primaryColor: '#f4510b',
      locale: 'pt-BR',
      currency: 'BRL',
      timezone: 'America/Fortaleza',
      dateFormat: 'DD/MM/AAAA',
      allowRestaurantSignup: true,
      requireManualApproval: true,
      defaultTrialDays: 14,
      auditRetentionDays: 180,
      maintenanceMode: false,
      maintenanceMessage: '',
      version: 4,
      updatedAt: '2026-08-28T10:00:00.000Z',
    };
    vi.mocked(api.put).mockResolvedValue({ data: settings });

    await superAdminService.updateSettings(settings);

    expect(api.put).toHaveBeenCalledWith(
      '/super-admin/settings',
      expect.not.objectContaining({ updatedAt: expect.anything() }),
    );
    expect(api.put).toHaveBeenCalledWith(
      '/super-admin/settings',
      expect.objectContaining({ version: 4, platformName: 'Peça Já' }),
    );
  });

  it('usa rotas explícitas para mudanças críticas e envia a justificativa', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });

    await superAdminService.updateRestaurantAccess(17, {
      active: false,
      reason: 'Solicitação formal do responsável legal.',
    });
    await superAdminService.updateRestaurantSubscription(17, {
      status: 'CANCELADA',
      reason: 'Contrato encerrado pelo cliente.',
    });
    await superAdminService.updateAdministratorAccess(33, {
      active: false,
      reason: 'Acesso revogado após troca de responsável.',
    });

    expect(api.patch).toHaveBeenNthCalledWith(1, '/super-admin/restaurants/17/access', {
      active: false,
      reason: 'Solicitação formal do responsável legal.',
    });
    expect(api.patch).toHaveBeenNthCalledWith(2, '/super-admin/restaurants/17/subscription', {
      status: 'CANCELADA',
      reason: 'Contrato encerrado pelo cliente.',
    });
    expect(api.patch).toHaveBeenNthCalledWith(3, '/super-admin/administrators/33/access', {
      active: false,
      reason: 'Acesso revogado após troca de responsável.',
    });
  });

  it('codifica o plano na URL e conversa pelo tenant selecionado', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    vi.mocked(api.get).mockResolvedValue({ data: { messages: [] } });
    vi.mocked(api.post).mockResolvedValue({ data: {} });

    await superAdminService.updatePlan('PREMIUM BR', {
      name: 'Premium',
      description: 'Plano completo',
      monthlyFee: 299.9,
      trialDays: 14,
      features: ['Suporte'],
      featured: true,
      active: true,
      version: 2,
    });
    await superAdminService.getSupportMessages(17);
    await superAdminService.sendSupportMessage(17, 'Como podemos ajudar?');

    expect(api.patch).toHaveBeenCalledWith('/super-admin/plans/PREMIUM%20BR', expect.any(Object));
    expect(api.get).toHaveBeenCalledWith('/ai-support/messages', {
      params: { restaurantId: 17 },
    });
    expect(api.post).toHaveBeenCalledWith('/super-admin/support/17/messages', {
      message: 'Como podemos ajudar?',
    });
  });
});
