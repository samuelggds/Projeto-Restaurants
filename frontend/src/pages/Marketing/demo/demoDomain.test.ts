import { describe, expect, it } from 'vitest';
import {
  DEMO_DEFAULT_PASSWORD,
  addDemoCartItem,
  authenticateDemoAccount,
  createDemoOrder,
  createInitialDemoState,
  registerDemoAccount,
  toggleDemoOrderPaid,
  updateDemoCallStatus,
  updateDemoOrderStatus,
} from './demoDomain';

describe('demoDomain', () => {
  it('expõe somente os seis perfis permitidos na demonstração, sem SUPER_ADMIN', () => {
    const state = createInitialDemoState(1_700_000_000_000);
    const roles = state.accounts.map((account) => account.role).sort();

    expect(roles).toEqual(
      ['ADMIN', 'ATENDENTE', 'CLIENTE', 'COZINHA', 'GARCOM', 'MOTOQUEIRO'].sort(),
    );
    expect(roles).not.toContain('SUPER_ADMIN');
  });

  it('entra com os seis perfis demonstrativos usando a senha padrão', () => {
    const state = createInitialDemoState(1_700_000_000_000);
    expect(state.accounts).toHaveLength(6);

    for (const account of state.accounts) {
      const result = authenticateDemoAccount(state, account.email, DEMO_DEFAULT_PASSWORD);
      expect(result.account.role).toBe(account.role);
      expect(result.state.sessionAccountId).toBe(account.id);
    }
  });

  it('cria uma conta isolada e não armazena a senha em texto puro', () => {
    const state = createInitialDemoState(1_700_000_000_000);
    const result = registerDemoAccount(
      state,
      {
        name: 'Samuel Demo',
        email: 'samuel@example.com',
        password: 'senha123',
        role: 'ADMIN',
      },
      1_700_000_000_100,
    );

    expect(result.account.email).toBe('samuel@example.com');
    expect(result.account.role).toBe('ADMIN');
    expect(result.account.passwordFingerprint).not.toBe('senha123');
    expect(result.state.sessionAccountId).toBe(result.account.id);
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
