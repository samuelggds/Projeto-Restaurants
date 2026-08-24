import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WaiterProvider } from '../WaiterContext';
import type { EmployeeWorkspaceData, RestaurantTable } from '../types';
import {
  WaiterCallsPage,
  WaiterDeliveriesPage,
  WaiterOverviewPage,
  WaiterTablesPage,
} from './WaiterPages';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const employee = {
  id: '4',
  name: 'Ana Garçom',
  email: 'ana@restaurant.test',
  role: 'WAITER' as const,
  shift: '18:00',
};
const restaurant = {
  restaurantName: 'Restaurante Teste',
  monogram: 'RT',
  primaryColor: '#d64d08',
  restaurantId: 7,
  slug: 'restaurante-teste',
};
const freeTable: RestaurantTable = {
  id: '91',
  number: 12,
  status: 'FREE',
  guests: 0,
  total: 0,
};
const occupiedTable: RestaurantTable = {
  ...freeTable,
  status: 'OCCUPIED',
  sessionId: '31',
  guests: 2,
  total: 58,
  openedAt: '18:30',
};

function changeInput(element: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(
    element,
    value,
  );
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}
const data: EmployeeWorkspaceData = {
  orders: [
    {
      id: '#14',
      channel: 'TABLE',
      reference: 'Mesa 12',
      customer: 'Cliente teste',
      items: ['2× Pizza'],
      createdAt: '18:31',
      elapsed: '08:30',
      status: 'PRONTO',
      total: 58,
    },
  ],
  tables: [occupiedTable],
  calls: [
    {
      id: '8',
      tableNumber: 12,
      type: 'WAITER',
      status: 'WAITING',
      elapsed: '03:20',
    },
    {
      id: '9',
      tableNumber: 7,
      type: 'BILL',
      status: 'RESOLVED',
      elapsed: '01:10',
      resolvedAt: new Date().toISOString(),
    },
  ],
};

describe('waiter operational pages', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function renderPage(page: React.ReactNode, overrides: Partial<EmployeeWorkspaceData> = {}) {
    const currentData = { ...data, ...overrides };
    act(() =>
      root.render(
        <WaiterProvider employee={employee} restaurant={restaurant} data={currentData}>
          {page}
        </WaiterProvider>,
      ),
    );
  }

  it('mostra somente métricas reais e substitui o antigo fluxo de PIN por mesas abertas', () => {
    renderPage(<WaiterOverviewPage />);

    expect(container.textContent).toContain('Prontos para entregar1');
    expect(container.textContent).toContain('Chamados aguardando1');
    expect(container.textContent).toContain('Mesas ocupadas1');
    expect(container.textContent).toContain('Mesas abertas');
    expect(container.textContent).not.toMatch(/PIN|código solicitado|gerar código/i);
  });

  it('usa a quantidade real de mesas na aba Para entregar e filtra pedidos', () => {
    renderPage(<WaiterDeliveriesPage />);
    expect(container.textContent).toContain('Mesas ocupadas1');
    expect(container.textContent).toContain('Mesa 12');

    const search = container.querySelector(
      '[aria-label="Buscar pedidos prontos"]',
    ) as HTMLInputElement;
    act(() => {
      changeInput(search, 'mesa inexistente');
    });
    expect(container.textContent).toContain('Nenhum pedido pronto para os filtros selecionados.');
  });

  it('abre e fecha mesa somente após o callback real e mostra bloqueio do backend', async () => {
    const onOpenTable = vi.fn(async () => ({ sessionId: '44' }));
    await act(async () =>
      root.render(
        <WaiterProvider
          employee={employee}
          restaurant={restaurant}
          data={{ ...data, tables: [freeTable] }}
          onOpenTable={onOpenTable}
        >
          <WaiterTablesPage />
        </WaiterProvider>,
      ),
    );
    const open = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Abrir mesa',
    );
    await act(async () => open?.click());
    expect(onOpenTable).toHaveBeenCalledWith('91');

    const onCloseTable = vi.fn(async () => {
      throw new Error('A mesa possui pedido ou pagamento pendente.');
    });
    await act(async () =>
      root.render(
        <WaiterProvider
          employee={employee}
          restaurant={restaurant}
          data={{ ...data, tables: [occupiedTable] }}
          onCloseTable={onCloseTable}
        >
          <WaiterTablesPage />
        </WaiterProvider>,
      ),
    );
    const close = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Fechar mesa',
    );
    await act(async () => close?.click());
    expect(onCloseTable).toHaveBeenCalledWith('31');
    expect(container.textContent).toContain('A mesa possui pedido ou pagamento pendente.');
  });

  it('não simula abertura quando o endpoint não foi conectado', async () => {
    renderPage(<WaiterTablesPage />, { tables: [freeTable] });
    const open = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Abrir mesa',
    );
    await act(async () => open?.click());

    expect(container.textContent).toContain(
      'A abertura de mesas não está disponível neste momento.',
    );
    expect(container.textContent).toContain('LIVRE');
  });

  it('reflete imediatamente dados novos recebidos do polling sem manter mesas obsoletas', async () => {
    renderPage(<WaiterOverviewPage />, { tables: [freeTable] });
    expect(container.textContent).toContain('Nenhuma mesa aberta no momento.');

    await act(async () =>
      root.render(
        <WaiterProvider
          employee={employee}
          restaurant={restaurant}
          data={{ ...data, tables: [occupiedTable] }}
        >
          <WaiterOverviewPage />
        </WaiterProvider>,
      ),
    );
    expect(container.textContent).toContain('Mesas abertas');
    expect(container.textContent).toContain('Fechar mesa');
  });

  it('permite somente abrir ou fechar a mesa sem expor ações administrativas do QR', () => {
    renderPage(<WaiterTablesPage />);
    expect(container.textContent).toContain('QR Codes administrados pelo restaurante.');
    expect(container.textContent).toContain('Fechar mesa');
    expect(container.textContent).not.toContain('Visualizar QR Code');
    expect(container.textContent).not.toContain('Imprimir QR');
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('busca chamados e confirma Atender pelo contrato de atualização', async () => {
    const onUpdateCall = vi.fn(async () => undefined);
    await act(async () =>
      root.render(
        <WaiterProvider
          employee={employee}
          restaurant={restaurant}
          data={data}
          onUpdateCall={onUpdateCall}
        >
          <WaiterCallsPage />
        </WaiterProvider>,
      ),
    );
    expect(container.textContent).toContain('Atendidos hoje1');
    const attend = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Atender',
    );
    await act(async () => attend?.click());
    expect(onUpdateCall).toHaveBeenCalledWith('8', 'IN_PROGRESS');

    const search = container.querySelector('[aria-label="Buscar chamados"]') as HTMLInputElement;
    act(() => {
      changeInput(search, 'mesa 99');
    });
    expect(container.textContent).toContain('Nenhum chamado aguardando atendimento.');
  });
});
