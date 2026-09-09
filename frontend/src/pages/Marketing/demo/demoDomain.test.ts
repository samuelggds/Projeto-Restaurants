import { describe, expect, it } from 'vitest';
import {
  DEMO_DEFAULT_PASSWORD,
  addDemoCartItem,
  authenticateDemoAccount,
  createDemoOrder,
  createInitialDemoState,
  toggleDemoOrderPaid,
  updateDemoCallStatus,
  updateDemoOrderStatus,
} from './demoDomain';

describe('demoDomain', () => {
  it('carrega exatamente os seis perfis preparados para a demonstração', () => {
    const state = createInitialDemoState(1_700_000_000_000);
    const roles = state.accounts.map((account) => account.role).sort();

    expect(roles).toEqual(
      ['ADMIN', 'ATENDENTE', 'CLIENTE', 'COZINHA', 'GARCOM', 'MOTOQUEIRO'].sort(),
    );
    expect(state.accounts).toHaveLength(6);
  });

  it('entra em todas as contas preparadas usando a senha padrão', () => {
    const state = createInitialDemoState(1_700_000_000_000);

    for (const account of state.accounts) {
      const result = authenticateDemoAccount(state, account.email, DEMO_DEFAULT_PASSWORD);
      expect(result.account.role).toBe(account.role);
      expect(result.state.sessionAccountId).toBe(account.id);
      expect(account.passwordFingerprint).not.toBe(DEMO_DEFAULT_PASSWORD);
    }
  });

  it('mantém endereços de demonstração previsíveis para os três portais', () => {
    const state = createInitialDemoState(1_700_000_000_000);
    expect(state.accounts.find((account) => account.role === 'CLIENTE')?.email).toBe(
      'cliente@demo.gastronexa.com.br',
    );
    expect(state.accounts.find((account) => account.role === 'ADMIN')?.email).toBe(
      'admin@demo.gastronexa.com.br',
    );
    expect(state.accounts.filter((account) => ['ATENDENTE', 'GARCOM', 'COZINHA', 'MOTOQUEIRO'].includes(account.role))).toHaveLength(4);
  });

  it('leva o mesmo pedido do cliente até cozinha e entrega', () => {
    let state = createInitialDemoState(1_700_000_000_000);
    const customer = state.accounts.find((account) => account.role === 'CLIENTE');
    state = { ...state, sessionAccountId: customer?.id ?? null };
    state = addDemoCartItem(state, { id: 'burger-classic', name: 'Burger Clássico', price: 32.9 });
    state = addDemoCartItem(state, { id: 'fries', name: 'Batata crocante', price: 16.9 });

    const created = createDemoOrder(
      state,
      { channel: 'DELIVERY', paymentMethod: 'PIX' },
      1_700_000_010_000,
    );
    state = created.state;

    expect(created.order.status).toBe('PENDENTE');
    expect(created.order.total).toBeCloseTo(49.8);
    expect(state.cart).toEqual([]);

    state = updateDemoOrderStatus(state, created.order.id, 'PREPARANDO');
    state = updateDemoOrderStatus(state, created.order.id, 'PRONTO');
    state = updateDemoOrderStatus(state, created.order.id, 'SAIU_PARA_ENTREGA');
    state = updateDemoOrderStatus(state, created.order.id, 'ENTREGUE');

    expect(state.orders.find((order) => order.id === created.order.id)?.status).toBe('ENTREGUE');
  });

  it('permite confirmar pagamento e resolver chamado no cenário demonstrativo', () => {
    let state = createInitialDemoState(1_700_000_000_000);
    const unpaid = state.orders.find((order) => !order.paid);
    expect(unpaid).toBeTruthy();

    state = toggleDemoOrderPaid(state, unpaid!.id, true);
    expect(state.orders.find((order) => order.id === unpaid!.id)?.paid).toBe(true);

    const waitingCall = state.calls.find((call) => call.status === 'WAITING');
    expect(waitingCall).toBeTruthy();
    state = updateDemoCallStatus(state, waitingCall!.id, 'IN_PROGRESS');
    state = updateDemoCallStatus(state, waitingCall!.id, 'RESOLVED');
    expect(state.calls.find((call) => call.id === waitingCall!.id)?.status).toBe('RESOLVED');
  });
});
