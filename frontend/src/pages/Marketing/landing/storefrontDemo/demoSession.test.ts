import { describe, expect, it } from 'vitest';
import { getBagLines, getTotals, initialDemoSessions, updateDemoSession } from './demoSession';

const slug = 'forno-alto';
const id = 'margherita';
const address = {
  street: 'Rua das Flores',
  number: '12',
  district: 'Centro',
  city: 'Cidade Exemplo',
};

describe('vitrine de pedidos', () => {
  it('calcula o desconto nos produtos em centavos e soma a entrega uma vez', () => {
    let sessions = initialDemoSessions(0);
    sessions = updateDemoSession(sessions, { slug, type: 'add', id, quantity: 2 });
    const lines = getBagLines(slug, sessions[slug]);
    expect(getTotals(lines, true)).toEqual({
      subtotal: 9780,
      discount: 978,
      delivery: 500,
      total: 9302,
    });
    expect(getTotals([], true)).toEqual({ subtotal: 0, discount: 0, delivery: 0, total: 0 });
    expect(getBagLines('braseiro-burger', sessions['braseiro-burger'])).toEqual([]);
  });

  it('descarta produtos de outra vitrine e respeita o limite e a remoção de itens', () => {
    const start = initialDemoSessions(0);
    expect(updateDemoSession(start, { slug, type: 'add', id: 'brasa-bacon', quantity: 1 })).toBe(
      start,
    );
    let sessions = updateDemoSession(start, { slug, type: 'add', id, quantity: 98 });
    sessions = updateDemoSession(sessions, { slug, type: 'add', id, quantity: 2 });
    expect(sessions[slug].quantities[id]).toBe(99);
    sessions = updateDemoSession(sessions, { slug, type: 'quantity', id, quantity: 0 });
    expect(getBagLines(slug, sessions[slug])).toEqual([]);
  });

  it('salva um pedido apenas uma vez e mantém o histórico separado por loja', () => {
    const start = initialDemoSessions(0);
    const pay = { slug, type: 'pay', method: 'Pix', time: 5000 } as const;
    let sessions = updateDemoSession(start, { slug, type: 'add', id, quantity: 1 });
    expect(updateDemoSession(sessions, pay)).toBe(sessions);
    sessions = updateDemoSession(sessions, { slug, type: 'address', address });
    sessions = updateDemoSession(sessions, { slug, type: 'coupon', enabled: true });
    sessions = updateDemoSession(sessions, pay);
    expect(sessions[slug].orders[0]).toMatchObject({
      id: '602',
      total: 4901,
      method: 'Pix',
      destination: 'Rua das Flores, 12, Centro, Cidade Exemplo',
      items: [{ name: 'Margherita da casa', quantity: 1 }],
    });
    expect(sessions[slug].quantities).toEqual({});
    expect(sessions[slug].coupon).toBe(false);
    expect(updateDemoSession(sessions, pay)).toBe(sessions);
    expect(sessions['braseiro-burger']).toBe(start['braseiro-burger']);
  });
});
