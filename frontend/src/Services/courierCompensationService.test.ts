import { beforeEach, describe, expect, it, vi } from 'vitest';

import api from './api';
import service from './courierCompensationService';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('courierCompensationService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carrega configuração sem permitir seleção de tenant pelo cliente', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { timezone: 'America/Sao_Paulo' } });
    await service.getConfiguration();
    expect(api.get).toHaveBeenCalledWith('/courier-compensation/admin/configuration');
  });

  it('salva regra padrão e fuso sem misturar taxa de entrega', async () => {
    vi.mocked(api.put).mockResolvedValue({ data: { ok: true } });
    await service.updateDefault(
      {
        model: 'FIXED_PER_DELIVERY',
        fixedAmount: 8,
        baseAmount: 0,
        includedDistanceMeters: 0,
        extraPerKmAmount: 0,
        ranges: [],
      },
      'America/Sao_Paulo',
    );
    expect(api.put).toHaveBeenCalledWith('/courier-compensation/admin/configuration', {
      model: 'FIXED_PER_DELIVERY',
      fixedAmount: 8,
      baseAmount: 0,
      includedDistanceMeters: 0,
      extraPerKmAmount: 0,
      ranges: [],
      timezone: 'America/Sao_Paulo',
    });
  });

  it('declara acerto somente com ids e metadados financeiros necessários', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { publicId: 'settlement' } });
    await service.createSettlement({ courierId: 31, orderIds: [9, 10], paymentMethod: 'PIX' });
    expect(api.post).toHaveBeenCalledWith('/courier-compensation/admin/settlements', {
      courierId: 31,
      orderIds: [9, 10],
      paymentMethod: 'PIX',
    });
  });

  it('confirma e contesta sempre pelo acerto autenticado', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { status: 'CONFIRMED' } });
    await service.confirmSettlement('abc');
    await service.disputeSettlement('def', 'Pedido 10 não confere');
    expect(api.post).toHaveBeenNthCalledWith(
      1,
      '/courier-compensation/courier/settlements/abc/confirm',
    );
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      '/courier-compensation/courier/settlements/def/dispute',
      { reason: 'Pedido 10 não confere' },
    );
  });
});
