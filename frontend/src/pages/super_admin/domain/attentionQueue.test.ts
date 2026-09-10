import { describe, expect, it } from 'vitest';
import { mapSuperAdminDashboard } from '../adapters/superAdminDataAdapter';
import { buildAttentionQueue } from './attentionQueue';

const now = Date.parse('2026-09-10T12:00:00.000Z');
const trialRestaurant = (
  id: number,
  trialEndsAt: string | null,
  status = 'TESTE',
  active = true,
) => ({
  id,
  name: `Restaurante ${id}`,
  active,
  subscription: { status, trialEndsAt },
});

describe('buildAttentionQueue', () => {
  it('usa somente faturas carregadas em atraso, sem recalcular status pela data ou pelos totais', () => {
    const data = mapSuperAdminDashboard({
      metrics: { pendingInvoicesCount: 800, pendingInvoicesTotal: 120_000 },
      invoices: [
        { id: 1, status: 'PENDING', dueDate: '2020-01-01T00:00:00.000Z' },
        {
          id: 2,
          code: 'FAT-000002',
          restaurant: 'Aurora',
          status: 'OVERDUE',
          dueDate: '2026-09-09T00:00:00.000Z',
          value: 249.9,
        },
        { id: 3, status: 'PAID', dueDate: '2020-01-01T00:00:00.000Z' },
        { id: 4, status: 'CANCELED', dueDate: '2020-01-01T00:00:00.000Z' },
        { id: 5, status: 'REFUNDED', dueDate: '2020-01-01T00:00:00.000Z' },
      ],
    });

    expect(buildAttentionQueue(data, now)).toEqual([
      expect.objectContaining({
        key: 'billing:2',
        category: 'billing',
        title: 'Aurora',
        description: 'FAT-000002 · Fatura em atraso',
        amount: 249.9,
        target: { kind: 'invoice', id: 2 },
      }),
    ]);
  });

  it('inclui apenas conversas aguardando suporte conforme o status recebido', () => {
    const data = mapSuperAdminDashboard({
      tickets: [
        {
          id: 11,
          restaurant: 'Aurora',
          status: 'OPEN',
          subject: 'Dúvida na assinatura',
          lastMessageAt: '2026-09-09T10:00:00.000Z',
          lastSenderRole: 'ADMIN',
        },
        { id: 12, status: 'WAITING_CUSTOMER', lastSenderRole: 'SUPER_ADMIN' },
        { id: 13, status: 'CLOSED', lastSenderRole: 'ADMIN' },
      ],
    });

    expect(buildAttentionQueue(data, now)).toEqual([
      expect.objectContaining({
        key: 'support:11',
        category: 'support',
        description: 'Dúvida na assinatura',
        target: { kind: 'support', id: 11 },
      }),
    ]);
  });

  it('inclui o limite de sete dias e testes encerrados, excluindo datas inválidas e outros ciclos', () => {
    const cutoff = now + 7 * 86_400_000;
    const data = mapSuperAdminDashboard({
      restaurants: [
        trialRestaurant(1, new Date(cutoff).toISOString()),
        trialRestaurant(2, new Date(cutoff + 1).toISOString()),
        trialRestaurant(3, '2026-09-09T12:00:00.000Z'),
        trialRestaurant(4, new Date(now).toISOString()),
        trialRestaurant(5, 'data-inválida'),
        trialRestaurant(6, null),
        trialRestaurant(7, '2026-09-11T12:00:00.000Z', 'TESTE', false),
        trialRestaurant(8, '2026-09-11T12:00:00.000Z', 'ATIVA'),
        trialRestaurant(9, '2026-09-11T12:00:00.000Z', 'CANCELADA'),
        trialRestaurant(10, '2026-09-11T12:00:00.000Z', 'EXPIRADA'),
        { id: 11, active: true, subscription: null },
      ],
    });

    const queue = buildAttentionQueue(data, now);

    expect(queue.map((item) => item.key)).toEqual(['trial:3', 'trial:4', 'trial:1']);
    expect(queue[0]).toMatchObject({
      description: 'Período de teste encerrado · Revisar ciclo',
      target: { kind: 'restaurant', id: 3 },
    });
    expect(queue[1].description).toBe('Período de teste encerrado · Revisar ciclo');
    expect(queue[2].description).toBe('Teste termina em até 7 dias');
  });

  it.each([NaN, Infinity, -Infinity])(
    'ignora previsões de trial com relógio inválido (%s), preservando pendências explícitas',
    (invalidNow) => {
      const data = mapSuperAdminDashboard({
        restaurants: [trialRestaurant(1, '2026-09-11T12:00:00.000Z')],
        invoices: [{ id: 2, status: 'OVERDUE' }],
      });

      expect(buildAttentionQueue(data, invalidNow).map((item) => item.key)).toEqual(['billing:2']);
    },
  );

  it('respeita MFA efetivo por política e agrupa pendências de cada administrador ativo', () => {
    const data = mapSuperAdminDashboard({
      administrators: [
        {
          id: 1,
          status: 'ACTIVE',
          mfaEnabled: false,
          mfaRequired: true,
          effectiveMfa: true,
          mustChangePassword: false,
        },
        { id: 2, status: 'ACTIVE', effectiveMfa: false, mustChangePassword: false },
        { id: 3, status: 'ACTIVE', effectiveMfa: true, mustChangePassword: true },
        {
          id: 4,
          name: 'Ana',
          restaurant: 'Aurora',
          status: 'ACTIVE',
          effectiveMfa: false,
          mustChangePassword: true,
        },
        { id: 5, status: 'BLOCKED', effectiveMfa: false, mustChangePassword: true },
        { id: 6, status: 'ACTIVE', effectiveMfa: true, mustChangePassword: false },
      ],
    });

    const queue = buildAttentionQueue(data, now);

    expect(queue.map((item) => item.key)).toEqual(['access:2', 'access:3', 'access:4']);
    expect(queue[0].description).toBe('MFA não habilitado');
    expect(queue[1].description).toBe('Troca de senha pendente');
    expect(queue[2]).toMatchObject({
      title: 'Ana',
      description: 'Aurora · Troca de senha pendente · MFA não habilitado',
      target: { kind: 'administrator', id: 4 },
    });
  });

  it('ordena por categoria e data antiga, desempata de forma estável e preserva o snapshot', () => {
    const data = mapSuperAdminDashboard({
      tickets: [
        { id: 4, status: 'OPEN', lastMessageAt: 'inválida' },
        { id: 3, status: 'OPEN', lastMessageAt: '2026-09-09T12:00:00.000Z' },
        { id: 2, status: 'OPEN', lastMessageAt: '2026-09-08T12:00:00.000Z' },
        { id: 1, status: 'OPEN', lastMessageAt: '2026-09-08T12:00:00.000Z' },
      ],
      invoices: [
        { id: 2, status: 'OVERDUE', dueDate: '2026-09-07T12:00:00.000Z' },
        { id: 1, status: 'OVERDUE', dueDate: '2026-09-06T12:00:00.000Z' },
      ],
      restaurants: [trialRestaurant(1, '2026-09-05T12:00:00.000Z')],
      administrators: [{ id: 1, status: 'ACTIVE', effectiveMfa: false }],
    });
    const before = structuredClone(data);
    Object.freeze(data.tickets);
    Object.freeze(data.invoices);
    Object.freeze(data.restaurants);
    Object.freeze(data.administrators);

    const queue = buildAttentionQueue(data, now);
    const reorderedData = {
      ...data,
      tickets: [...data.tickets].reverse(),
      invoices: [...data.invoices].reverse(),
    };

    expect(queue.map((item) => item.key)).toEqual([
      'support:1',
      'support:2',
      'support:3',
      'support:4',
      'billing:1',
      'billing:2',
      'trial:1',
      'access:1',
    ]);
    expect(buildAttentionQueue(reorderedData, now)).toEqual(queue);
    expect(data).toEqual(before);
  });
});
