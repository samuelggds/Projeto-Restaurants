import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import tableSessionService from '../../Services/tableSessionService';
import tablesService from '../../Services/tablesService';
import { connectTableWaitingSocket } from '../../Services/socketService';
import DigitalMenuEntryPage from './DigitalMenuEntryPage';

vi.mock('../../Services/tablesService', () => ({
  default: {
    resolvePublicTable: vi.fn(),
  },
}));

vi.mock('../../Services/tableSessionService', () => ({
  default: {
    joinOpenSession: vi.fn(),
  },
}));

vi.mock('../../Services/socketService', () => ({
  connectTableWaitingSocket: vi.fn(),
  disconnectTableWaitingSocket: vi.fn(),
}));

vi.mock('../Home/Home', () => ({
  default: () => <div>Fluxo funcional do cardápio</div>,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('DigitalMenuEntryPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('resolve tableNumber no restaurante e abre o fluxo funcional com o id interno correto', async () => {
    const tableToken = '0123456789abcdef0123456789abcdef';
    vi.mocked(tablesService.resolvePublicTable).mockResolvedValue({
      id: 91,
      number: 12,
      restaurantId: 7,
      restaurantSlug: 'restaurante-teste',
      tableOrderingEnabled: true,
      waiterCallEnabled: true,
      billRequestEnabled: true,
    });
    vi.mocked(tableSessionService.joinOpenSession).mockResolvedValue({
      sessionToken: 'sessao-segura',
      sessionId: 31,
      sessionPublicId: '323e4567-e89b-42d3-a456-426614174001',
      tableId: 91,
      tableNumber: 12,
      restaurantId: 7,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      tableOrderingEnabled: true,
      waiterCallEnabled: true,
      billRequestEnabled: true,
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[`/restaurante-teste/mesa/12?tk=${tableToken}`]}>
          <Routes>
            <Route path="/:restaurantSlug/mesa/:tableNumber" element={<DigitalMenuEntryPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    expect(tablesService.resolvePublicTable).toHaveBeenCalledWith(
      expect.objectContaining({
        tableNumber: 12,
        tableToken,
        slug: 'restaurante-teste',
      }),
    );
    expect(tableSessionService.joinOpenSession).toHaveBeenCalledWith(
      expect.objectContaining({ tableId: 91, tableNumber: 12, tableToken }),
    );
    expect(JSON.parse(localStorage.getItem('tableSession') || '{}')).toMatchObject({
      sessionToken: 'sessao-segura',
      sessionPublicId: '323e4567-e89b-42d3-a456-426614174001',
      tableId: 91,
      restaurantId: 7,
    });
    expect(container.textContent).toContain('Fluxo funcional do cardápio');
  });

  it('não abre cardápio quando o backend retorna outra mesa', async () => {
    const tableToken = '0123456789abcdef0123456789abcdef';
    vi.mocked(tablesService.resolvePublicTable).mockResolvedValue({
      id: 91,
      number: 13,
      restaurantId: 7,
      restaurantSlug: 'restaurante-teste',
      tableOrderingEnabled: true,
      waiterCallEnabled: true,
      billRequestEnabled: true,
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[`/restaurante-teste/mesa/12?tk=${tableToken}`]}>
          <Routes>
            <Route path="/:restaurantSlug/mesa/:tableNumber" element={<DigitalMenuEntryPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('não corresponde ao QR Code');
    expect(container.textContent).not.toContain('Fluxo funcional do cardápio');
  });

  it('usa o token como identidade principal quando o tid do QR está desatualizado', async () => {
    const tableToken = '0123456789abcdef0123456789abcdef';
    vi.mocked(tablesService.resolvePublicTable).mockResolvedValue({
      id: 91,
      number: 12,
      restaurantId: 7,
      restaurantSlug: 'restaurante-teste',
      tableOrderingEnabled: true,
      waiterCallEnabled: true,
      billRequestEnabled: true,
    });
    vi.mocked(tableSessionService.joinOpenSession).mockResolvedValue({
      sessionToken: 'sessao-segura',
      sessionId: 31,
      tableId: 91,
      tableNumber: 12,
      restaurantId: 7,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      tableOrderingEnabled: true,
      waiterCallEnabled: true,
      billRequestEnabled: true,
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[`/restaurante-teste/mesa/12?tid=12&tk=${tableToken}`]}>
          <Routes>
            <Route path="/:restaurantSlug/mesa/:tableNumber" element={<DigitalMenuEntryPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Fluxo funcional do cardápio');
  });

  it('orienta aguardar o garçom sem exibir campo de PIN quando a mesa está fechada', async () => {
    const tableToken = 'fedcba9876543210fedcba9876543210';
    vi.mocked(tablesService.resolvePublicTable).mockResolvedValue({
      id: 91,
      number: 12,
      restaurantId: 7,
      restaurantSlug: 'restaurante-teste',
      tableOrderingEnabled: true,
      waiterCallEnabled: true,
      billRequestEnabled: true,
    });
    vi.mocked(tableSessionService.joinOpenSession).mockRejectedValue({
      response: {
        data: {
          error:
            'Esta mesa ainda não foi aberta pelo garçom. Aguarde o atendimento e tente novamente.',
        },
      },
    });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[`/restaurante-teste/mesa/12?tk=${tableToken}`]}>
          <Routes>
            <Route path="/:restaurantSlug/mesa/:tableNumber" element={<DigitalMenuEntryPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Mesa aguardando abertura');
    expect(container.textContent).toContain('ainda não foi aberta pelo garçom');
    expect(container.textContent).not.toContain('PIN');
    expect(container.querySelector('button')?.textContent).toContain('Verificar novamente');
  });

  it('libera o cardápio automaticamente quando o garçom abre a mesa', async () => {
    vi.useFakeTimers();
    const tableToken = 'fedcba9876543210fedcba9876543210';
    vi.mocked(tablesService.resolvePublicTable).mockResolvedValue({
      id: 91,
      number: 12,
      restaurantId: 7,
      restaurantSlug: 'restaurante-teste',
      tableOrderingEnabled: true,
      waiterCallEnabled: true,
      billRequestEnabled: true,
    });
    vi.mocked(tableSessionService.joinOpenSession)
      .mockRejectedValueOnce({
        response: {
          data: {
            error:
              'Esta mesa ainda não foi aberta pelo garçom. Aguarde o atendimento e tente novamente.',
          },
        },
      })
      .mockResolvedValue({
        sessionToken: 'sessao-segura',
        sessionId: 31,
        tableId: 91,
        tableNumber: 12,
        restaurantId: 7,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        tableOrderingEnabled: true,
        waiterCallEnabled: true,
        billRequestEnabled: true,
      });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[`/mesa/12?rid=7&tk=${tableToken}`]}>
          <Routes>
            <Route path="/mesa/:tableNumber" element={<DigitalMenuEntryPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    expect(container.textContent).toContain('Mesa aguardando abertura');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_000);
    });

    expect(tableSessionService.joinOpenSession).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('Fluxo funcional do cardápio');
  });

  it('libera o cardápio em tempo real ao receber a abertura da mesa', async () => {
    const tableToken = 'fedcba9876543210fedcba9876543210';
    let handleOpened: ((payload: { tableId: number; restaurantId: number }) => void) | undefined;
    vi.mocked(connectTableWaitingSocket).mockReturnValue({
      on: vi.fn((event, handler) => {
        if (event === 'table:session-opened') handleOpened = handler;
      }),
      off: vi.fn(),
    } as never);
    vi.mocked(tablesService.resolvePublicTable).mockResolvedValue({
      id: 91,
      number: 12,
      restaurantId: 7,
      restaurantSlug: 'restaurante-teste',
      tableOrderingEnabled: true,
      waiterCallEnabled: true,
      billRequestEnabled: true,
    });
    vi.mocked(tableSessionService.joinOpenSession)
      .mockRejectedValueOnce({
        response: {
          data: {
            error:
              'Esta mesa ainda não foi aberta pelo garçom. Aguarde o atendimento e tente novamente.',
          },
        },
      })
      .mockResolvedValue({
        sessionToken: 'sessao-segura',
        sessionId: 31,
        tableId: 91,
        tableNumber: 12,
        restaurantId: 7,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        tableOrderingEnabled: true,
        waiterCallEnabled: true,
        billRequestEnabled: true,
      });

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[`/mesa/12?rid=7&tk=${tableToken}`]}>
          <Routes>
            <Route path="/mesa/:tableNumber" element={<DigitalMenuEntryPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    expect(container.textContent).toContain('Mesa aguardando abertura');
    expect(handleOpened).toBeTypeOf('function');

    await act(async () => {
      handleOpened?.({ tableId: 91, restaurantId: 7 });
    });

    expect(tableSessionService.joinOpenSession).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('Fluxo funcional do cardápio');
  });
});
