import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendantOperationCenterV2 } from './AttendantOperationCenterV2';
import type { AttendantOrder, AttendantWorkspaceSnapshot } from './types';
import attendantApi from './attendantApi';

vi.mock('./attendantApi', () => ({
  default: { getOrder: vi.fn(), completePickup: vi.fn(), updateCallStatus: vi.fn() },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function order(id: number, status: AttendantOrder['status'], createdAt: string): AttendantOrder {
  return {
    id: String(id),
    orderId: id,
    code: `#${id}`,
    type: 'RETIRADA',
    status,
    tableNumber: null,
    customerName: `Cliente ${id}`,
    createdAt,
    readyAt: null,
    items: [{ quantity: 1, productName: 'Prato do dia' }],
  };
}

const snapshot: AttendantWorkspaceSnapshot = {
  generatedAt: '2026-09-09T15:00:00.000Z',
  orders: [
    order(101, 'PENDENTE', '2026-09-08T12:00:00.000Z'),
    order(102, 'PREPARANDO', '2026-09-09T14:10:00.000Z'),
    order(103, 'PRONTO', '2026-09-09T14:00:00.000Z'),
    order(104, 'PENDENTE', '2026-09-09T14:55:00.000Z'),
    order(105, 'PRONTO', '2026-09-08T14:00:00.000Z'),
  ],
  calls: [
    {
      id: '201',
      tableNumber: 7,
      type: 'WAITER',
      status: 'WAITING',
      assignedToId: null,
      assignedToName: null,
      requestedAt: '2026-09-08T14:00:00.000Z',
      assignedAt: null,
      resolvedAt: null,
    },
    {
      id: '202',
      tableNumber: 8,
      type: 'BILL',
      status: 'WAITING',
      assignedToId: null,
      assignedToName: null,
      requestedAt: '2026-09-09T14:50:00.000Z',
      assignedAt: null,
      resolvedAt: null,
    },
    {
      id: '203',
      tableNumber: 9,
      type: 'WAITER',
      status: 'IN_PROGRESS',
      assignedToId: 7,
      assignedToName: 'Ana',
      requestedAt: '2026-09-09T14:40:00.000Z',
      assignedAt: null,
      resolvedAt: null,
    },
    {
      id: '204',
      tableNumber: 10,
      type: 'WAITER',
      status: 'RESOLVED',
      assignedToId: 7,
      assignedToName: 'Ana',
      requestedAt: '2026-09-08T14:00:00.000Z',
      assignedAt: null,
      resolvedAt: '2026-09-09T14:00:00.000Z',
    },
  ],
  tables: [
    {
      id: '301',
      tableNumber: 11,
      status: 'OPEN',
      openedAt: '2026-09-08T14:00:00.000Z',
      participantCount: 2,
      activeOrderCount: 1,
      activeCallCount: 0,
    },
    {
      id: '302',
      tableNumber: 12,
      status: 'OPEN',
      openedAt: '2026-09-09T14:00:00.000Z',
      participantCount: 2,
      activeOrderCount: 1,
      activeCallCount: 0,
    },
  ],
};

describe('AttendantOperationCenterV2 priority navigation', () => {
  let container: HTMLDivElement;
  let root: Root;
  const refresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(data = snapshot) {
    act(() =>
      root.render(
        <AttendantOperationCenterV2
          attendantId={7}
          attendantName="Ana"
          restaurantId={1}
          restaurant={{ name: 'Restaurante', monogram: 'R', primaryColor: '#d64d08' }}
          snapshot={data}
          workspaceState={{
            loading: false,
            refreshing: false,
            error: null,
            lastUpdatedAt: data.generatedAt,
          }}
          onRefresh={refresh}
          onLogout={vi.fn()}
        />,
      ),
    );
  }

  function button(label: string, parent: ParentNode = container) {
    const target = [...parent.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.textContent?.trim() === label,
    );
    expect(target, `Botão ${label}`).toBeTruthy();
    return target!;
  }

  function priority(label: string) {
    const target = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
      (item) => item.querySelector('small')?.textContent === label,
    );
    expect(target).toBeTruthy();
    return target!;
  }

  function home() {
    const nav = container.querySelector('[aria-label="Navegação do atendente"]')!;
    act(() => button('Visão geral', nav).click());
  }

  function rows() {
    return [...container.querySelectorAll('main article')].map((item) => item.textContent);
  }

  it('abre só pedidos prontos ou demorando, coerentes com a contagem do cartão', () => {
    render();
    expect(priority('Prontos agora').querySelector('strong')?.textContent).toBe('2');
    act(() => priority('Prontos agora').click());
    expect(button('Prontos').getAttribute('aria-pressed')).toBe('true');
    expect(rows()).toHaveLength(2);
    expect(rows().join(' ')).toContain('#103');
    expect(rows().join(' ')).toContain('#105');
    expect(rows().join(' ')).not.toContain('#102');

    home();
    expect(priority('Pedidos demorando').querySelector('strong')?.textContent).toBe('2');
    act(() => priority('Pedidos demorando').click());
    expect(button('Atrasados').getAttribute('aria-pressed')).toBe('true');
    expect(rows()).toHaveLength(2);
    expect(rows().join(' ')).toContain('#101');
    expect(rows().join(' ')).toContain('#102');
    expect(rows().join(' ')).not.toContain('#104');
  });

  it('oferece os três tipos de pendência antiga e permite ampliar cada filtro novamente', () => {
    render();
    expect(priority('Pendências antigas').querySelector('strong')?.textContent).toBe('4');

    const openBreakdown = () => {
      const trigger = priority('Pendências antigas');
      act(() => trigger.click());
      const region = container.querySelector(
        '[role="region"][aria-label="Pendências de dias anteriores"]',
      )!;
      expect(trigger.getAttribute('aria-controls')).toBe(region.id);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(region.querySelectorAll('button')).toHaveLength(3);
      return region;
    };

    let region = openBreakdown();
    act(() => button('Pedidos antigos2', region).click());
    expect(button('Pendências anteriores').getAttribute('aria-pressed')).toBe('true');
    expect(rows()).toHaveLength(2);
    expect(rows().join(' ')).toContain('#101');
    expect(rows().join(' ')).toContain('#105');
    act(() => button('Todos os dias').click());
    expect(rows()).toHaveLength(5);

    home();
    region = openBreakdown();
    act(() => button('Chamados antigos1', region).click());
    expect(button('Pendências anteriores').getAttribute('aria-pressed')).toBe('true');
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toContain('Mesa 07');
    expect(rows().join(' ')).not.toContain('Mesa 10');
    act(() => button('Todos os dias').click());
    expect(rows()).toHaveLength(3);

    home();
    region = openBreakdown();
    act(() => button('Mesas abertas desde dias anteriores1', region).click());
    expect(button('Pendências anteriores').getAttribute('aria-pressed')).toBe('true');
    expect(rows()).toHaveLength(1);
    expect(container.querySelector('main article header strong')?.textContent).toBe('11');
    act(() => button('Todos os dias').click());
    expect(rows()).toHaveLength(2);
  });

  it('mostra todas as categorias antigas mesmo sem pedidos antigos', () => {
    render({ ...snapshot, orders: [], tables: [] });
    expect(priority('Pendências antigas').querySelector('strong')?.textContent).toBe('1');
    act(() => priority('Pendências antigas').click());
    const region = container.querySelector('[aria-label="Pendências de dias anteriores"]')!;
    expect(button('Pedidos antigos0', region)).toBeTruthy();
    expect(button('Mesas abertas desde dias anteriores0', region)).toBeTruthy();
    act(() => button('Chamados antigos1', region).click());
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toContain('Mesa 07');
  });

  it('abre chamados aguardando sem incluir os já assumidos e mantém sua ação real', async () => {
    vi.mocked(attendantApi.updateCallStatus).mockResolvedValue({});
    render();
    act(() => priority('Chamados aguardando').click());
    expect(button('Aguardando').getAttribute('aria-pressed')).toBe('true');
    expect(rows()).toHaveLength(2);
    expect(rows().join(' ')).not.toContain('Mesa 09');
    await act(async () => button('Assumir chamado').click());
    expect(attendantApi.updateCallStatus).toHaveBeenCalledWith('201', 'IN_PROGRESS');
    expect(refresh).toHaveBeenCalledOnce();
    act(() => button('Aguardando / em atendimento').click());
    expect(rows()).toHaveLength(3);
  });

  it('a navegação principal volta a mostrar todos os pedidos após usar um atalho', () => {
    render();
    act(() => priority('Prontos agora').click());
    expect(rows()).toHaveLength(2);
    const nav = container.querySelector('[aria-label="Navegação do atendente"]')!;
    act(() => button('Pedidos', nav).click());
    expect(button('Todos').getAttribute('aria-pressed')).toBe('true');
    expect(rows()).toHaveLength(5);
  });

  it('preserva a consulta e o bloqueio de retirada não paga no drawer extraído', async () => {
    vi.mocked(attendantApi.getOrder).mockResolvedValue({
      id: 103,
      type: 'RETIRADA',
      status: 'PRONTO',
      paid: false,
      total: 35,
      items: [],
    });
    render();
    act(() => priority('Prontos agora').click());
    const ready = [...container.querySelectorAll('main article')].find((item) =>
      item.textContent?.includes('#103'),
    )!;
    await act(async () => button('Ver detalhes', ready).click());
    const dialog = container.querySelector('[role="dialog"]')!;
    expect(attendantApi.getOrder).toHaveBeenCalledWith(103);
    expect(dialog.textContent).toContain('Pagamento ainda não confirmado');
    expect(button('Confirmar retirada entregue', dialog).disabled).toBe(true);
    expect(attendantApi.completePickup).not.toHaveBeenCalled();
  });
});
