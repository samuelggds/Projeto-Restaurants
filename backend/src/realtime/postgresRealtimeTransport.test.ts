import assert from 'node:assert/strict';
import test from 'node:test';
import { PostgresRealtimeTransport } from './postgresRealtimeTransport.js';

for (const subscriber of [true, false]) {
  test(`relay recupera escrita sem tráfego HTTP (subscriber=${subscriber})`, async (t) => {
    let now = 20_000;
    t.mock.method(Date, 'now', () => now);
    let denyWrites = true;
    let probes = 0;
    const events: string[] = [];
    const db = {
      $queryRaw: async (sql: TemplateStringsArray) =>
        sql.join('').includes('MAX')
          ? [{ id: 0n }]
          : [
              { id: 1n, room: null, event: '__runtime_write_probe__', payload: [] },
              { id: 2n, room: null, event: 'order:updated', payload: [{ id: 1 }] },
            ],
      $executeRaw: async (sql: TemplateStringsArray, ...values: unknown[]) => {
        if (!sql.join('').includes('INSERT')) return 0;
        if (values.includes('__runtime_write_probe__')) probes++;
        if (denyWrites) throw new Error('synthetic write outage');
        return 1;
      },
    } as unknown as ConstructorParameters<typeof PostgresRealtimeTransport>[1];
    const local = {
      emit: (event: string) => {
        events.push(event);
      },
      to: () => local,
    };
    const relay = new PostgresRealtimeTransport(subscriber ? local : undefined, db);
    await relay.start();
    try {
      await relay.emit('order:updated', { id: 1 });
      assert.equal(relay.healthy(), false);
      await relay.poll();
      assert.equal(relay.healthy(), false, 'uma leitura não comprova a volta da escrita');
      assert.equal(probes, 1);
      denyWrites = false;
      now += 4_999;
      await relay.poll();
      assert.equal(probes, 1, 'tentativas de recuperação possuem intervalo');
      assert.equal(relay.healthy(), false);
      now++;
      await relay.poll();
      assert.equal(relay.healthy(), true);
      assert.equal(probes, 2);
      assert.equal(events.includes('__runtime_write_probe__'), false);
      if (subscriber) assert.ok(events.includes('order:updated'));
    } finally {
      await relay.stop();
    }
  });
}
