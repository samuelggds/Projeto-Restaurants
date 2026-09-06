import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendantWorkspace } from './AttendantWorkspace';
import type { AttendantWorkspaceSnapshot } from './types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot: AttendantWorkspaceSnapshot = {
  generatedAt: '2026-09-02T18:10:00.000Z',
  orders: [
    {
      id: 'order-91', orderId: 91, code: '#91', type: 'MESA', status: 'PRONTO', tableNumber: 8,
      customerName: 'Carla', createdAt: '2026-09-02T17:50:00.000Z', readyAt: '2026-09-02T18:05:00.000Z',
      items: [{ quantity: 2, productName: 'Pizza da casa' }],
    },
    {
      id: 'order-92', orderId: 92, code: '#92', type: 'DELIVERY', status: 'PENDENTE', tableNumber: null,
      customerName: 'Rui', createdAt: '2026-09-02T18:08:00.000Z', readyAt: null,
      items: [{ quantity: 1, productName: 'Calzone' }],
    },
  ],
  calls: [
    {
      id: 'call-1', tableNumber: 8, type: 'BILL', status: 'WAITING', assignedToId: null, assignedToName: null,
      requestedAt: '2026-09-02T17:45:00.000Z', assignedAt: null, resolvedAt: null,
    },
    {
      id: 'call-2', tableNumber: 3, type: 'WAITER', status: 'RESOLVED', assignedToId: 22, assignedToName: 'João',
      requestedAt: '2026-09-02T16:00:00.000Z', assignedAt: '2026-09-02T16:01:00.000Z', resolvedAt: '2026-09-02T16:05:00.000Z',
    },
  ],
  tables: [
    {
      id: '8', tableNumber: 8, status: 'CLOSING_REQUESTED', openedAt: '2026-09-02T16:00:00.000Z',
      participantCount: 3, activeOrderCount: 1, activeCallCount: 1,
    },
  ],
};

const workspaceState = { loading: false, refreshing: false, error: null, lastUpdatedAt: snapshot.generatedAt };

function changeInput(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('AttendantWorkspace legado', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.scrollTo = vi.fn();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(initialView: 'overview' | 'orders' | 'calls' = 'overview') {
    act(() => {
      root.render(
        <AttendantWorkspace
          attendantName="Ana Atendimento"
          restaurant={{ name: 'Pizzaria Teste', monogram: 'PT', primaryColor: '#e16a3d' }}
          snapshot={snapshot}
          workspaceState={workspaceState}
          initialView={initialView}
          onRefresh={vi.fn()}
          onLogout={vi.fn()}
        />,
      );
    });
  }

  it('continua renderizando o workspace anterior sem regressão', () => {
    render();
    expect(container.textContent).toContain('Chamados prioritários');
    expect(container.textContent).toContain('#91 · Mesa 8');
    expect(container.textContent).toContain('Conta solicitada');
  });

  it('mantém busca e filtros do workspace anterior', () => {
    render('orders');
    const search = container.querySelector<HTMLInputElement>('input[aria-label="Buscar pedidos"]');
    expect(search).not.toBeNull();
    act(() => changeInput(search!, 'delivery'));
    expect(container.textContent).toContain('#92');
    expect(container.textContent).not.toContain('#91');
  });
});
