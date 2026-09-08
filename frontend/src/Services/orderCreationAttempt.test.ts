import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withOrderCreationAttempt } from './orderCreationAttempt';
const { webcrypto } = await vi.importActual<{ webcrypto: Crypto }>('node:crypto');

vi.mock('../modules/auth/session/authSession', () => ({ getAuthSessionUserId: () => 7 }));
beforeEach(() => { localStorage.clear(); vi.stubGlobal('crypto', webcrypto); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('tentativa de criação', () => {
  it('mantém a chave após resposta perdida e usa outra após sucesso', async () => {
    const calls: Record<string, string>[] = [];
    const payload = { restaurantId: 7, items: [1] };
    await expect(withOrderCreationAttempt(payload, async (headers) => { calls.push(headers); throw new Error('network'); })).rejects.toThrow('network');
    await withOrderCreationAttempt(payload, async (headers) => { calls.push(headers); return { id: 1 }; });
    await withOrderCreationAttempt(payload, async (headers) => { calls.push(headers); return { id: 2 }; });
    expect(calls[1]['Idempotency-Key']).toBe(calls[0]['Idempotency-Key']);
    expect(calls[2]['Idempotency-Key']).not.toBe(calls[0]['Idempotency-Key']);
    expect(calls[0]['X-Order-Session']).toBeTruthy();
  });
  it('duplo clique compartilha a requisição em andamento', async () => {
    const send = vi.fn(async () => { await new Promise((resolve) => setTimeout(resolve, 15)); return { id: 3 }; });
    const results = await Promise.all([withOrderCreationAttempt({ id: 'double-click' }, send), withOrderCreationAttempt({ id: 'double-click' }, send)]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(results).toEqual([{ id: 3 }, { id: 3 }]);
  });
  it('deduplica antes do hash mesmo quando a primeira resposta chega antes do segundo hash', async () => {
    let releaseSecond = () => {};
    let digests = 0;
    vi.stubGlobal('crypto', {
      randomUUID: () => webcrypto.randomUUID(),
      subtle: {
        digest: () => {
          digests += 1;
          if (digests === 1) return Promise.resolve(new ArrayBuffer(32));
          return new Promise<ArrayBuffer>((resolve) => {
            releaseSecond = () => resolve(new ArrayBuffer(32));
          });
        },
      },
    });
    const send = vi.fn(async () => ({ id: 4 }));
    const first = withOrderCreationAttempt({ id: 'fast-response' }, send);
    const second = withOrderCreationAttempt({ id: 'fast-response' }, send);
    await first;
    releaseSecond();
    await second;
    expect(send).toHaveBeenCalledTimes(1);
    expect(digests).toBe(1);
  });
  it('preserva retry na aba em HTTP/LAN sem persistir o conteúdo pessoal do pedido', async () => {
    vi.stubGlobal('crypto', { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
    const payload = { customerName: 'Cliente LAN', address: 'Rua Privada 123', items: [4] };
    const calls: Record<string, string>[] = [];
    await expect(withOrderCreationAttempt(payload, async (headers) => {
      calls.push(headers);
      throw new Error('network');
    })).rejects.toThrow('network');
    await withOrderCreationAttempt(payload, async (headers) => { calls.push(headers); return { id: 5 }; });
    expect(calls[1]['Idempotency-Key']).toBe(calls[0]['Idempotency-Key']);
    expect(calls[0]['Idempotency-Key']).toMatch(/^[a-f0-9]{48}$/);
    expect(JSON.stringify(localStorage)).not.toContain('Rua Privada');
    expect(Object.keys(localStorage).some((key) => key.startsWith('order-creation-pending:'))).toBe(false);
  });
});
