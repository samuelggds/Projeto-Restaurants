import { describe, expect, it } from 'vitest';
import { demoCheckoutError } from './demoCheckout';
import { demoHomeData } from './demoCatalog';
import {
  addDemoCartItem,
  createDemoOrder,
  createInitialDemoState,
  getDemoCartTotal,
} from './demoDomain';
import { adminMockSettings } from '../../admin/data';
import { createDemoTablePayment, demoTableAccount } from './demoTableAccount';
import type { DemoHomeData } from './useDemoHomeData';

describe('checkout demonstrativo e configurações', () => {
  const state = addDemoCartItem(createInitialDemoState(), demoHomeData.products[0]);
  it('aplica disponibilidade, canais e pagamentos da loja', () => {
    expect(demoCheckoutError(state, demoHomeData, 'DELIVERY', 'PIX')).toBe('');
    expect(
      demoCheckoutError(state, { ...demoHomeData, isOpenForOrders: false }, 'DELIVERY', 'PIX'),
    ).toContain('fechado');
    expect(
      demoCheckoutError(state, { ...demoHomeData, acceptsDelivery: false }, 'DELIVERY', 'PIX'),
    ).toContain('tipo de pedido');
    expect(
      demoCheckoutError(state, { ...demoHomeData, acceptsPickup: false }, 'PICKUP', 'PIX'),
    ).toContain('tipo de pedido');
    expect(
      demoCheckoutError(state, { ...demoHomeData, tableOrderingEnabled: false }, 'TABLE', 'PIX'),
    ).toContain('tipo de pedido');
    expect(
      demoCheckoutError(state, { ...demoHomeData, acceptsPix: false }, 'DELIVERY', 'PIX'),
    ).toContain('pagamento');
    expect(
      demoCheckoutError(state, { ...demoHomeData, acceptsCard: false }, 'DELIVERY', 'CARD'),
    ).toContain('pagamento');
    expect(
      demoCheckoutError(state, { ...demoHomeData, minimumOrder: 50 }, 'DELIVERY', 'PIX'),
    ).toContain('mínimo');
    expect(demoCheckoutError(state, { ...demoHomeData, minimumOrder: 50 }, 'TABLE', 'PIX')).toBe(
      '',
    );
  });
  it('impede concluir com produto removido, estoque esgotado ou preço antigo', () => {
    expect(
      demoCheckoutError(state, { ...demoHomeData, products: [] }, 'DELIVERY', 'PIX'),
    ).toContain('indisponível');
    expect(
      demoCheckoutError(
        state,
        { ...demoHomeData, products: [{ ...demoHomeData.products[0], stock: 0 }] },
        'DELIVERY',
        'PIX',
      ),
    ).toContain('indisponível');
    expect(
      demoCheckoutError(
        state,
        { ...demoHomeData, products: [{ ...demoHomeData.products[0], price: 40 }] },
        'DELIVERY',
        'PIX',
      ),
    ).toContain('preço');
  });
});

describe('pagamento antecipado da mesa na demonstração', () => {
  function fixture() {
    const initial = { ...createInitialDemoState(), orders: [], cart: [] };
    const previousOrder = createDemoOrder(addDemoCartItem(initial, demoHomeData.products[0]), {
      channel: 'TABLE',
      paymentMethod: 'CASH',
      tableNumber: 8,
    });
    const state = addDemoCartItem(previousOrder.state, demoHomeData.products[0]);
    const settings = {
      ...adminMockSettings.tableAccount,
      enabled: true,
      allowCash: true,
      allowOnlinePayment: true,
      timeZone: 'America/Sao_Paulo',
    };
    const data: DemoHomeData = { ...demoHomeData, tableAccount: settings };
    const projectedCents =
      demoTableAccount(state, 8, settings).summary.remainingCents +
      Math.round(getDemoCartTotal(state) * 100);
    return { state, settings, data, projectedCents };
  }

  it.each([
    ['vazio', null, false],
    ['zero', 0, true],
    ['igual ao saldo projetado', 'equal', false],
    ['acima do saldo projetado', 'higher', false],
    ['abaixo do saldo projetado', 'lower', true],
  ] as const)('aplica o limite %s', (_, threshold, blocked) => {
    const { state, data, settings, projectedCents } = fixture();
    settings.requirePrepaymentAboveCents =
      threshold === 'equal'
        ? projectedCents
        : threshold === 'higher'
          ? projectedCents + 1
          : threshold === 'lower'
            ? projectedCents - 1
            : threshold;
    const error = demoCheckoutError(state, data, 'TABLE', 'CASH', {
      settlementMode: 'TABLE_ACCOUNT',
    });
    expect(Boolean(error)).toBe(blocked);
    if (blocked) expect(error).toContain('saldo em aberto somado a este pedido');
  });

  it('considera pagamentos confirmados e não trata reservas como quitação', () => {
    const { state, data, settings, projectedCents } = fixture();
    settings.requirePrepaymentAboveCents = projectedCents - 1;
    const reserved = createDemoTablePayment(
      state,
      { method: 'CASH', selectionMode: 'FULL_ACCOUNT' },
      Date.now(),
      8,
      settings,
    ).state;
    expect(
      demoCheckoutError(reserved, data, 'TABLE', 'CASH', { settlementMode: 'TABLE_ACCOUNT' }),
    ).toContain('limite');
    const partiallyPaid = createDemoTablePayment(
      state,
      { method: 'PIX', selectionMode: 'EQUAL_SPLIT', splitCount: 2 },
      Date.now(),
      8,
      settings,
    ).state;
    expect(
      demoCheckoutError(partiallyPaid, data, 'TABLE', 'CASH', { settlementMode: 'TABLE_ACCOUNT' }),
    ).toBe('');
  });

  it.each([
    ['antes do início', '2026-09-11T20:59:00Z', false],
    ['no início', '2026-09-11T21:00:00Z', true],
    ['antes do fim', '2026-09-12T01:59:00Z', true],
    ['no fim', '2026-09-12T02:00:00Z', false],
    ['no dia não selecionado', '2026-09-12T21:00:00Z', false],
  ] as const)('aplica a janela comum %s no fuso do restaurante', (_, date, blocked) => {
    const { state, data, settings } = fixture();
    settings.prepaymentWindows = [{ weekdays: [5], startsAtMinute: 1080, endsAtMinute: 1380 }];
    const error = demoCheckoutError(state, data, 'TABLE', 'CASH', {
      settlementMode: 'TABLE_ACCOUNT',
      now: new Date(date),
    });
    expect(Boolean(error)).toBe(blocked);
    if (blocked) expect(error).toContain('Neste horário');
  });

  it.each([
    ['antes do início', '2026-09-12T00:59:00Z', false],
    ['no início', '2026-09-12T01:00:00Z', true],
    ['após a meia-noite', '2026-09-12T04:00:00Z', true],
    ['no fim', '2026-09-12T05:00:00Z', false],
    ['na madrugada anterior', '2026-09-11T04:00:00Z', false],
  ] as const)('aplica o período de sexta 22h–02h %s', (_, date, blocked) => {
    const { state, data, settings } = fixture();
    settings.prepaymentWindows = [{ weekdays: [5], startsAtMinute: 1320, endsAtMinute: 120 }];
    expect(
      Boolean(
        demoCheckoutError(state, data, 'TABLE', 'CASH', {
          settlementMode: 'TABLE_ACCOUNT',
          now: new Date(date),
        }),
      ),
    ).toBe(blocked);
  });

  it('muda o horário conforme o fuso configurado e combina limite OU períodos', () => {
    const { state, data, settings } = fixture();
    const now = new Date('2026-09-11T21:30:00Z');
    settings.prepaymentWindows = [{ weekdays: [5], startsAtMinute: 1080, endsAtMinute: 1140 }];
    const account = { settlementMode: 'TABLE_ACCOUNT' as const, now };
    expect(demoCheckoutError(state, data, 'TABLE', 'CASH', account)).toContain('Neste horário');
    settings.timeZone = 'UTC';
    expect(demoCheckoutError(state, data, 'TABLE', 'CASH', account)).toBe('');
    settings.requirePrepaymentAboveCents = 0;
    expect(demoCheckoutError(state, data, 'TABLE', 'CASH', account)).toContain('limite');
    settings.timeZone = 'America/Sao_Paulo';
    expect(demoCheckoutError(state, data, 'TABLE', 'CASH', account)).toContain('Neste horário');
  });

  it('mantém a revisão e o pagamento imediato disponíveis quando o limite exige antecipação', () => {
    const { state, data, settings } = fixture();
    settings.requirePrepaymentAboveCents = 0;
    expect(demoCheckoutError(state, data, 'TABLE', 'CASH')).toBe('');
    expect(
      demoCheckoutError(state, data, 'TABLE', 'CASH', { settlementMode: 'TABLE_ACCOUNT' }),
    ).toContain('pagar este pedido agora');
    for (const payment of ['PIX', 'CARD'] as const)
      expect(demoCheckoutError(state, data, 'TABLE', payment, { settlementMode: 'PAY_NOW' })).toBe(
        '',
      );
  });

  it('respeita conta desativada e pagamento online desativado sem bloquear conta sem antecipação', () => {
    const { state, data, settings } = fixture();
    settings.allowOnlinePayment = false;
    expect(demoCheckoutError(state, data, 'TABLE', 'PIX', { settlementMode: 'PAY_NOW' })).toContain(
      'pagamento online',
    );
    expect(
      demoCheckoutError(state, data, 'TABLE', 'CASH', { settlementMode: 'TABLE_ACCOUNT' }),
    ).toBe('');
    settings.enabled = false;
    for (const settlementMode of ['TABLE_ACCOUNT', 'PAY_NOW'] as const)
      expect(demoCheckoutError(state, data, 'TABLE', 'PIX', { settlementMode })).toContain(
        'conta por mesa está desativada',
      );
  });
});
