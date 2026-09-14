import axios from 'axios';
import { describe, expect, it } from 'vitest';
import { createDemoAdminApi, type DemoAdminRuntime } from './demoAdminApi';
import { createInitialDemoState } from './demoDomain';

describe('renovação demonstrativa isolada', () => {
  it('persiste apenas o cartão fictício e alterna para Pix sem dados sensíveis', async () => {
    const state = createInitialDemoState();
    let runtime: DemoAdminRuntime | undefined;
    const connect = () =>
      axios.create({
        adapter: createDemoAdminApi(
          () => state,
          () => undefined,
          runtime,
          (next) => {
            runtime = structuredClone(next);
          },
        ),
      });
    let client = connect();
    expect((await client.get('/billing/recurring')).data.billingMethod).toBe('PIX');
    await expect(
      client.post('/billing/recurring/card', { cardToken: 'real-secret-token' }),
    ).rejects.toThrow('Use somente o cartão fictício');
    await client.post('/billing/recurring/card', {
      cardToken: 'demo-recurring-card-token',
      holder: 'Should not persist',
      cpf: '12345678901',
    });
    client = connect();
    expect((await client.get('/billing/recurring')).data).toMatchObject({
      billingMethod: 'CARD',
      status: 'AUTHORIZED',
      autoRenew: true,
      cardLast4: '4242',
    });
    expect(JSON.stringify(runtime)).not.toMatch(
      /real-secret-token|demo-recurring-card-token|Should not persist|12345678901/,
    );
    await client.put('/billing/recurring/pix');
    expect((await connect().get('/billing/recurring')).data).toMatchObject({
      billingMethod: 'PIX',
      autoRenew: false,
    });
  });
});
