import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import tableAccountService from '../../../Services/tableAccountService';
import { WaiterProvider } from '../WaiterContext';
import type { EmployeeWorkspaceData, RestaurantTable } from '../types';
import {
  WaiterCallsPage,
  WaiterDeliveriesPage,
  WaiterOverviewPage,
  WaiterTablesPage,
} from './WaiterPages';
import { WaiterPaymentsPage } from './WaiterPaymentsPage';

const dialogMocks = vi.hoisted(() => ({ confirmDialog: vi.fn() }));

vi.mock('../../../components/AppDialog/context', () => ({
  useAppDialog: () => ({ confirmDialog: dialogMocks.confirmDialog }),
}));

vi.mock('../../../Services/tableAccountService', () => ({
  default: {
    getAdminSnapshot: vi.fn(),
    confirmManualPayment: vi.fn(),
  },
}));

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
  sessionStatus: 'OPEN',
  sessionId: '31',
  sessionPublicId: 'session-public-31',
  guests: 2,
  total: 58,
  openedAt: '18:30',
};
const closingRequestedTable: RestaurantTable = {
  ...occupiedTable,
  sessionStatus: 'CLOSING_REQUESTED',
  sessionId: '32',
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
  accounts: [],
};

describe('waiter operational pages', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    dialogMocks.confirmDialog.mockResolvedValue(true);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
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

  it('abre a aba operacional ao clicar ou usar o teclado no cartão de pedido pronto', () => {
    const onOpenOrder = vi.fn();
    renderPage(<WaiterOverviewPage onOpenOrder={onOpenOrder} />);

    const orderCard = container.querySelector(
      'article[role="button"][aria-label="Abrir pedido #14 em Para entregar"]',
    ) as HTMLElement;
    expect(orderCard).toBeTruthy();

    act(() => orderCard.click());
    expect(onOpenOrder).toHaveBeenLastCalledWith('#14');

    act(() =>
      orderCard.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    );
    expect(onOpenOrder).toHaveBeenCalledTimes(2);
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

  it('permite ao garçom confirmar a entrega de um pedido pronto à mesa', async () => {
    const onUpdateOrderStatus = vi.fn(async () => undefined);
    await act(async () =>
      root.render(
        <WaiterProvider
          employee={employee}
          restaurant={restaurant}
          data={data}
          onUpdateOrderStatus={onUpdateOrderStatus}
        >
          <WaiterDeliveriesPage />
        </WaiterProvider>,
      ),
    );

    expect(container.textContent).toContain('Depois de levar o pedido, confirme a entrega');
    const delivered = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Entregue à mesa',
    );
    await act(async () => delivered?.click());

    expect(onUpdateOrderStatus).toHaveBeenCalledWith('#14', 'ENTREGUE');
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
    expect(container.textContent).toContain('ABERTA');
    expect(container.textContent).toContain('Fechar mesa');
    expect(container.textContent).not.toContain('Visualizar QR Code');
    expect(container.textContent).not.toContain('Imprimir QR');
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('distingue conta solicitada de mesa aberta e permite finalizar a sessão correta', async () => {
    const onCloseTable = vi.fn(async () => undefined);
    await act(async () =>
      root.render(
        <WaiterProvider
          employee={employee}
          restaurant={restaurant}
          data={{ ...data, tables: [closingRequestedTable] }}
          onCloseTable={onCloseTable}
        >
          <WaiterTablesPage />
        </WaiterProvider>,
      ),
    );

    expect(container.textContent).toContain('CONTA SOLICITADA');
    expect(container.textContent).toContain('novos pedidos estão bloqueados');
    expect(container.textContent).not.toContain('Abra a mesa antes');

    const finalize = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Finalizar mesa',
    );
    await act(async () => finalize?.click());
    expect(onCloseTable).toHaveBeenCalledWith('32');
  });

  it('orienta o garçom a conferir pagamentos e confirmar a entrega operacional', async () => {
    const onCloseTable = vi.fn(async () => {
      throw new Error(
        'Não é possível fechar a mesa: existem pedidos ou pagamentos pendentes (#66).',
      );
    });
    await act(async () =>
      root.render(
        <WaiterProvider
          employee={employee}
          restaurant={restaurant}
          data={{ ...data, tables: [closingRequestedTable] }}
          onCloseTable={onCloseTable}
        >
          <WaiterTablesPage />
        </WaiterProvider>,
      ),
    );

    const finalize = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Finalizar mesa',
    );
    await act(async () => finalize?.click());

    expect(container.textContent).toContain('Ver conta e pagamentos');
    expect(container.textContent).toContain('Para entregar');
    expect(container.textContent).toContain('Entregue à mesa');
  });

  it('mostra a conta e permite confirmar somente dinheiro ou maquininha já recebidos', async () => {
    vi.mocked(tableAccountService.getAdminSnapshot).mockResolvedValue({
      summary: {
        consumedCents: 5800,
        netPaidCents: 0,
        processingCents: 5800,
        remainingCents: 5800,
      },
      paymentIntents: [
        {
          publicId: 'manual-payment',
          method: 'CARD_MACHINE',
          status: 'RESERVED',
          totalCents: 2900,
          createdAt: '2026-08-26T18:00:00.000Z',
          manualConfirmedAt: null,
          manualConfirmedByName: null,
        },
        {
          publicId: 'online-payment',
          method: 'PIX',
          status: 'PROCESSING',
          totalCents: 2900,
          createdAt: '2026-08-26T18:01:00.000Z',
          manualConfirmedAt: null,
          manualConfirmedByName: null,
        },
      ],
    });
    vi.mocked(tableAccountService.confirmManualPayment).mockResolvedValue({});

    renderPage(<WaiterTablesPage />);
    const openAccount = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Ver conta e pagamentos'),
    );
    await act(async () => openAccount?.click());

    expect(tableAccountService.getAdminSnapshot).toHaveBeenCalledWith('session-public-31');
    expect(container.textContent).toContain('Pix e cartão online');
    expect(container.textContent).toContain('Aguardando confirmação automática do provedor');
    const confirmButtons = [...container.querySelectorAll('button')].filter(
      (button) => button.textContent?.trim() === 'Confirmar valor recebido',
    );
    expect(confirmButtons).toHaveLength(1);

    await act(async () => confirmButtons[0]?.click());
    expect(dialogMocks.confirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Confirmar pagamento recebido?',
        description: expect.stringMatching(/R\$\s*29,00 em maquininha/),
        confirmLabel: 'Confirmar recebimento',
      }),
    );
    expect(tableAccountService.confirmManualPayment).toHaveBeenCalledWith('manual-payment');
    expect(tableAccountService.confirmManualPayment).not.toHaveBeenCalledWith('online-payment');
    expect(tableAccountService.getAdminSnapshot).toHaveBeenCalledTimes(2);
  });

  it('organiza pagamentos presenciais em fila e confirma pelo ledger sem ações administrativas', async () => {
    const onRefresh = vi.fn(async () => undefined);
    vi.mocked(tableAccountService.confirmManualPayment).mockResolvedValue({});
    await act(async () =>
      root.render(
        <WaiterProvider
          employee={employee}
          restaurant={restaurant}
          data={{
            ...data,
            accounts: [
              {
                tableSessionId: '31',
                sessionPublicId: 'session-public-31',
                tableId: '91',
                tableNumber: 12,
                openedAt: '2026-08-26T17:30:00.000Z',
                status: 'CLOSING_REQUESTED',
                openedByName: 'Ana Garçom',
                summary: {
                  consumedCents: 5800,
                  netPaidCents: 2900,
                  reservedCents: 2900,
                  processingCents: 0,
                  remainingCents: 2900,
                  participantsCount: 2,
                },
                itemsCount: 3,
                paymentCounts: { reserved: 1, processing: 0, online: 0, inPerson: 1 },
                pendingManualPayments: [
                  {
                    publicId: 'cash-payment',
                    method: 'CASH',
                    status: 'RESERVED',
                    totalCents: 2900,
                    createdAt: '2026-08-26T18:00:00.000Z',
                  },
                ],
              },
            ],
          }}
          onRefresh={onRefresh}
        >
          <WaiterPaymentsPage />
        </WaiterProvider>,
      ),
    );

    expect(container.textContent).toContain('Recebimentos para confirmar');
    expect(container.textContent).toContain('Mesa 12');
    expect(container.textContent).toMatch(/R\$\s*29,00/);
    expect(container.textContent).not.toMatch(/estornar|fechamento forçado|criar cobrança/i);

    const confirm = container.querySelector(
      'button[aria-label*="Confirmar Dinheiro"][aria-label*="Mesa 12"]',
    ) as HTMLButtonElement;
    await act(async () => confirm.click());

    expect(dialogMocks.confirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Confirmar pagamento recebido?',
        description: expect.stringMatching(/Mesa 12.*R\$\s*29,00.*dinheiro/),
      }),
    );
    expect(tableAccountService.confirmManualPayment).toHaveBeenCalledWith('cash-payment');
    expect(onRefresh).toHaveBeenCalledOnce();
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

  it('expande os concluídos de 10 em 10 e permite voltar para os primeiros 10', () => {
    const resolvedCalls = Array.from({ length: 16 }, (_, index) => ({
      id: String(index + 1),
      tableNumber: index + 1,
      type: 'WAITER' as const,
      status: 'RESOLVED' as const,
      elapsed: '01:00',
      resolvedAt: new Date().toISOString(),
    }));
    renderPage(<WaiterCallsPage />, { calls: resolvedCalls });

    expect(container.textContent).toContain('Exibindo 10 de 16 chamados');
    const next = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Mostrar mais 10',
    );
    act(() => next?.click());
    expect(container.textContent).toContain('Exibindo 16 de 16 chamados');

    const reset = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Voltar para 10',
    );
    act(() => reset?.click());

    expect(container.textContent).toContain('Exibindo 10 de 16 chamados');
  });
});
