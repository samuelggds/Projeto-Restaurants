import { describe, expect, it, vi } from 'vitest';
import api from '../../Services/api';
import attendantApi, { normalizeAttendantWorkspace } from './attendantApi';

vi.mock('../../Services/api', () => ({ default: { get: vi.fn() } }));

describe('contratos de leitura do atendente', () => {
  it.each([
    null,
    {},
    { generatedAt: 'inválido', orders: [], calls: [], tables: [] },
    { generatedAt: '2026-09-09T12:00:00.000Z', orders: [], calls: [] },
  ])('rejeita snapshot incompleto em vez de anunciar fila vazia: %j', async (data) => {
    vi.mocked(api.get).mockResolvedValueOnce({ data });
    await expect(attendantApi.getWorkspace()).rejects.toThrow('validar os dados');
  });

  it('aceita uma operação realmente vazia com contrato completo', async () => {
    const data = { generatedAt: '2026-09-09T12:00:00.000Z', orders: [], calls: [], tables: [] };
    vi.mocked(api.get).mockResolvedValueOnce({ data });
    await expect(attendantApi.getWorkspace()).resolves.toEqual(data);
  });

  it.each([
    {},
    { id: 104, paid: true, total: 50 },
    { id: 103, total: 50 },
    { id: 103, paid: true, total: null },
  ])('rejeita detalhe sem identidade ou confirmação financeira: %j', async (data) => {
    vi.mocked(api.get).mockResolvedValueOnce({ data });
    await expect(attendantApi.getOrder(103)).rejects.toThrow('validar os detalhes');
  });

  it('aceita total decimal retornado pelo backend para o pedido consultado', async () => {
    const data = { id: 103, paid: true, total: '49.90' };
    vi.mocked(api.get).mockResolvedValueOnce({ data });
    await expect(attendantApi.getOrder(103)).resolves.toEqual(data);
  });

  it.each(['', '   ', true, [], -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'não converte um total inválido em valor financeiro confirmado: %j',
    async (total) => {
      vi.mocked(api.get).mockResolvedValueOnce({ data: { id: 103, paid: true, total } });
      await expect(attendantApi.getOrder(103)).rejects.toThrow('validar os detalhes');
    },
  );
});

describe('normalizeAttendantWorkspace', () => {
  it('normaliza o contrato operacional e descarta dados fora da allowlist', () => {
    const result = normalizeAttendantWorkspace({
      generatedAt: '2026-09-02T12:00:00.000Z',
      orders: [
        {
          id: 'order-1',
          orderId: 91,
          code: '#91',
          type: 'MESA',
          status: 'PRONTO',
          tableNumber: 8,
          customerName: '  Carla  ',
          createdAt: '2026-09-02T11:30:00.000Z',
          readyAt: '2026-09-02T11:55:00.000Z',
          address: 'não deve aparecer',
          total: 140,
          items: [{ quantity: 2, productName: 'Pizza', price: 70 }],
        },
      ],
      calls: [
        {
          id: 'call-1',
          tableNumber: 8,
          type: 'BILL',
          status: 'WAITING',
          assignedToId: null,
          assignedToName: null,
          requestedAt: '2026-09-02T11:58:00.000Z',
          assignedAt: null,
          resolvedAt: null,
        },
      ],
      tables: [
        {
          id: '8',
          tableNumber: 8,
          status: 'OPEN',
          openedAt: '2026-09-02T10:00:00.000Z',
          participantCount: 3,
          activeOrderCount: 1,
          activeCallCount: 1,
          sessionToken: 'não deve aparecer',
        },
      ],
    });

    expect(result.orders[0]).toEqual({
      id: 'order-1',
      orderId: 91,
      code: '#91',
      type: 'MESA',
      status: 'PRONTO',
      tableNumber: 8,
      customerName: 'Carla',
      createdAt: '2026-09-02T11:30:00.000Z',
      readyAt: '2026-09-02T11:55:00.000Z',
      items: [{ quantity: 2, productName: 'Pizza' }],
    });
    expect(result.calls[0]).toEqual({
      id: 'call-1',
      tableNumber: 8,
      type: 'BILL',
      status: 'WAITING',
      assignedToId: null,
      assignedToName: null,
      requestedAt: '2026-09-02T11:58:00.000Z',
      assignedAt: null,
      resolvedAt: null,
    });
    expect(JSON.stringify(result)).not.toMatch(/não deve aparecer|sessionToken|address|total/u);
  });

  it('ignora registros sem identidade operacional e mantém fallback seguro', () => {
    const result = normalizeAttendantWorkspace({
      orders: [{ id: '', orderId: 0, createdAt: 'inválido' }],
      calls: [{ id: '1', tableNumber: 0, requestedAt: 'inválido' }],
      tables: [{ tableNumber: 0, openedAt: 'inválido' }],
    });

    expect(result).toEqual({ generatedAt: '', orders: [], calls: [], tables: [] });
  });
});
