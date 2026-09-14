import type { DemoState } from './demoDomain';

export function requestDemoTableService(
  state: DemoState,
  type: 'WAITER' | 'BILL',
  now = Date.now(),
) {
  const table = state.tables.find((item) => item.number === 8);
  if (!table?.occupied) throw new Error('Aguarde o garçom abrir a mesa 08.');
  const exists = state.calls.some(
    (call) => call.tableNumber === 8 && call.type === type && call.status !== 'RESOLVED',
  );
  return {
    ...state,
    tables:
      type === 'BILL'
        ? state.tables.map((item) =>
            item.number === 8 ? { ...item, closingRequested: true } : item,
          )
        : state.tables,
    calls: exists
      ? state.calls
      : [
          ...state.calls,
          {
            id: `demo-call-${now}-${type}`,
            tableNumber: 8,
            type,
            status: 'WAITING' as const,
            createdAt: new Date(now).toISOString(),
          },
        ],
  };
}
