import { describe, expect, it } from 'vitest';
import {
  addDemoCartItem,
  createDemoOrder,
  createInitialDemoState,
  sanitizeDemoState,
} from './demoDomain';
import {
  cancelDemoTablePayment,
  confirmDemoTablePayment,
  createDemoTablePayment,
  demoTableAccount,
} from './demoTableAccount';
import { demoWaiterAccounts } from './demoEmployeeAdapter';
import { requestDemoTableService } from './demoTableService';

function scenario() {
  let state = { ...createInitialDemoState(), sessionAccountId: 'demo-cliente' };
  state = addDemoCartItem(state, { id: 'burger-classic', name: 'Burger Clássico', price: 32.9 });
  return createDemoOrder(state, { channel: 'TABLE', tableNumber: 8, paymentMethod: 'CASH' }).state;
}

describe('conta fictícia do cardápio QR', () => {
  it('paga apenas os itens deste cliente sem quitar o pedido de outro participante', () => {
    const result = createDemoTablePayment(scenario(), { selectionMode: 'MY_ITEMS', method: 'PIX' });
    expect(result.payment.totalCents).toBe(3290);
    expect(result.state.orders[0].paid).toBe(true);
    expect(demoTableAccount(result.state).summary.remainingCents).toBe(5990);
    expect(
      demoWaiterAccounts(result.state).find((account) => account.tableNumber === 8)?.summary
        .netPaidCents,
    ).toBe(3290);
  });
  it('divide o saldo em centavos, reserva dinheiro e só quita após confirmação do garçom', () => {
    const start = scenario();
    const first = createDemoTablePayment(start, {
      selectionMode: 'EQUAL_SPLIT',
      splitCount: 2,
      method: 'PIX',
    });
    expect(first.payment.totalCents).toBe(4640);
    const second = createDemoTablePayment(first.state, {
      selectionMode: 'FULL_ACCOUNT',
      method: 'CASH',
    });
    expect(demoTableAccount(second.state).summary).toMatchObject({
      netPaidCents: 4640,
      reservedCents: 4640,
      remainingCents: 4640,
    });
    expect(() =>
      createDemoTablePayment(second.state, { selectionMode: 'FULL_ACCOUNT', method: 'PIX' }),
    ).toThrow(/saldo/);
    const persisted = sanitizeDemoState(JSON.parse(JSON.stringify(second.state)));
    const pending = demoWaiterAccounts(persisted).find(
      (account) => account.tableNumber === 8,
    )!.pendingManualPayments;
    expect(pending).toHaveLength(1);
    expect(pending[0].publicId).toBe(second.payment.publicId);
    const paid = confirmDemoTablePayment(persisted, second.payment.publicId);
    expect(demoTableAccount(paid).summary).toMatchObject({
      netPaidCents: 9280,
      reservedCents: 0,
      remainingCents: 0,
    });
    expect(
      paid.orders.filter((order) => order.tableNumber === 8).every((order) => order.paid),
    ).toBe(true);
  });
  it('cancelar a reserva libera o saldo e pedir a conta mantém somente um chamado', () => {
    const result = createDemoTablePayment(scenario(), {
      selectionMode: 'FULL_ACCOUNT',
      method: 'CASH',
    });
    const canceled = cancelDemoTablePayment(result.state, result.payment.publicId);
    expect(demoTableAccount(canceled).summary.reservedCents).toBe(0);
    const requested = requestDemoTableService(requestDemoTableService(canceled, 'BILL'), 'BILL');
    expect(
      requested.calls.filter((call) => call.tableNumber === 8 && call.type === 'BILL'),
    ).toHaveLength(1);
    expect(demoTableAccount(requested).summary.status).toBe('CLOSING_REQUESTED');
  });
});
