import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listOrders: vi.fn(),
  claimDelivery: vi.fn(),
  updateStatus: vi.fn(),
  getFinance: vi.fn(),
  getTracking: vi.fn(),
  getSettings: vi.fn(),
  navigate: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  listeners: new Map<string, (...args: unknown[]) => void>(),
  socket: {
    connected: true,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    volatile: { emit: vi.fn() },
  },
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('../../contexts/authContext', () => ({
  useAuth: () => ({
    user: {
      id: 44,
      name: 'Rita Entregadora',
      email: 'rita@test.local',
      role: 'MOTOQUEIRO',
      restaurantId: 7,
    },
    login: mocks.login,
    logout: mocks.logout,
  }),
}));
vi.mock('../../Services/ordersService', () => ({
  default: {
    listRestaurantOrders: mocks.listOrders,
    claimDelivery: mocks.claimDelivery,
    updateStatus: mocks.updateStatus,
    getCourierFinance: mocks.getFinance,
    getDeliveryTracking: mocks.getTracking,
  },
}));
vi.mock('../../Services/restaurantSettingsService', () => ({
  default: { getPublicSettings: mocks.getSettings },
}));
vi.mock('../../Services/socketService', () => ({
  acquireSocket: () => ({ socket: mocks.socket, release: vi.fn() }),
}));
vi.mock('../../features/employee-help/useEmployeeIssueNotifications', () => ({
  useEmployeeIssueNotifications: vi.fn(),
}));
vi.mock('../../features/employee-help/EmployeeHelpCenter', () => ({
  EmployeeHelpCenter: () => <div>Ajuda</div>,
}));
vi.mock('./components/DeliveryMap', () => ({ default: () => <div>Mapa</div> }));
vi.mock('./components/CourierSettlementsPanel', () => ({
  default: () => <div>Acertos para conferir</div>,
}));

import CourierWorkspace from './CourierWorkspace';
import { clearAuthSession, persistAuthSession } from '../../modules/auth/session/authSession';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function geoPosition(latitude = -3.7319, longitude = -38.5267): GeolocationPosition {
  return {
    coords: {
      latitude,
      longitude,
      accuracy: 12,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: 1,
    toJSON: () => ({}),
  };
}

function deliveryOrder(status = 'PRONTO') {
  return {
    id: 81,
    restaurantId: 7,
    type: 'DELIVERY',
    status,
    assignedCourierId: status === 'PRONTO' ? null : 44,
    createdAt: '2026-08-24T12:00:00Z',
    total: 39.9,
    paymentMethod: 'DINHEIRO',
    paid: false,
    user: { name: 'Cliente', phone: '85999991234' },
    address: 'Rua das Flores',
    number: '10',
    items: [
      {
        quantity: 1,
        price: 39.9,
        product: { name: 'Pizza montada' },
        customizations: [{ groupName: 'Massa', options: [{ name: 'Fina' }] }],
        ingredients: ['Bacon'],
        observation: 'Sem cebola',
      },
    ],
    observation: 'Tocar interfone',
    deliveryDistanceMeters: 3200,
    courierEarningPreview: { available: true, amount: 8.5 },
  };
}

async function flushUntil(condition: () => boolean) {
  for (let attempt = 0; attempt < 200 && !condition(); attempt += 1) {
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 5));
    });
  }
}

function clickByText(container: HTMLElement, selector: string, text: string) {
  const element = Array.from(container.querySelectorAll<HTMLElement>(selector)).find((candidate) =>
    candidate.textContent?.includes(text),
  );
  if (!element) throw new Error(`Elemento não encontrado: ${text}`);
  element.click();
  return element;
}

describe('CourierWorkspace integration', () => {
  let container: HTMLDivElement;
  let root: Root;
  let watchSuccess: PositionCallback | null;
  let now: number;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.socket.connected = true;
    clearAuthSession();
    localStorage.clear();
    persistAuthSession({ id: 44, role: 'MOTOQUEIRO' }, 'courier-token');
    mocks.listeners.clear();
    mocks.socket.on.mockImplementation((event: string, listener: (...args: unknown[]) => void) => {
      mocks.listeners.set(event, listener);
      return mocks.socket;
    });
    mocks.socket.off.mockReturnValue(mocks.socket);
    mocks.getSettings.mockResolvedValue({
      restaurant: { name: 'Restaurante Teste' },
      primaryColor: '#d64d08',
    });
    mocks.getFinance.mockResolvedValue({
      today: { amount: 0, deliveries: 0 },
      week: { amount: 0, deliveries: 0 },
      month: { amount: 0, deliveries: 0 },
      pending: { amount: 0, deliveries: 0 },
      deliveries: [],
    });
    mocks.getTracking.mockResolvedValue({ order: { id: 81 }, locations: [] });
    watchSuccess = null;
    mocks.getCurrentPosition.mockImplementation((success: PositionCallback) =>
      success(geoPosition()),
    );
    mocks.watchPosition.mockImplementation((success: PositionCallback) => {
      watchSuccess = success;
      return 77;
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: mocks.getCurrentPosition,
        watchPosition: mocks.watchPosition,
        clearWatch: mocks.clearWatch,
      },
    });
    now = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('filtra Delivery, exibe montagem e permite ativar GPS ao retirar', async () => {
    mocks.listOrders.mockResolvedValue([
      deliveryOrder(),
      { ...deliveryOrder(), id: 99, type: 'MESA' },
    ]);
    mocks.claimDelivery.mockResolvedValue({ ...deliveryOrder('SAIU_PARA_ENTREGA'), paid: true });
    mocks.updateStatus.mockResolvedValue({
      ...deliveryOrder('ENTREGUE'),
      paid: true,
      deliveredAt: '2026-08-24T13:00:00Z',
    });

    await act(async () => root.render(<CourierWorkspace />));
    await flushUntil(() => container.textContent?.includes('Pedidos aguardando você') === true);
    await act(async () => clickByText(container, 'button', 'Para retirar'));
    await flushUntil(() => container.textContent?.includes('Pedido #81') === true);
    expect(container.textContent).not.toContain('Pedido #99');

    await act(async () =>
      container.querySelector<HTMLButtonElement>('button[aria-label^="Ver detalhes"]')?.click(),
    );
    expect(container.textContent).toContain('Pizza montada');
    expect(container.textContent).toContain('Massa: Fina');
    expect(container.textContent).toContain('Itens escolhidos: Bacon');
    expect(container.textContent).toContain('Observação do item: Sem cebola');
    expect(container.textContent).toContain('Tocar interfone');
    const earningBar = container.querySelector<HTMLElement>('[title="Valor calculado pelo servidor"]');
    expect(earningBar?.textContent).toContain('Ganho');
    expect(earningBar?.textContent?.replaceAll('\u00a0', ' ')).toContain('R$ 8,50');
    expect(container.textContent).toContain('Rota calculada: 3.2 km');

    await act(async () => clickByText(container, 'button', 'Retirar e iniciar entrega'));
    await flushUntil(() =>
      container.textContent?.includes('Compartilhar localização durante a entrega?') === true,
    );
    expect(mocks.claimDelivery).not.toHaveBeenCalled();

    await act(async () =>
      clickByText(container, '[role="dialog"] button', 'Ativar localização'),
    );
    await flushUntil(() => mocks.claimDelivery.mock.calls.length === 1);
    expect(mocks.getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(mocks.claimDelivery).toHaveBeenCalledWith(
      81,
      expect.objectContaining({
        latitude: -3.7319,
        longitude: -38.5267,
        sentAt: expect.any(String),
      }),
    );
    expect(mocks.watchPosition).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Localização ativa nesta conta');

    now = 6_000;
    await act(async () => watchSuccess?.(geoPosition(-3.732, -38.527)));
    expect(mocks.socket.volatile.emit).toHaveBeenCalledWith(
      'delivery:location:update',
      expect.objectContaining({ orderId: 81, latitude: -3.732, longitude: -38.527 }),
      expect.any(Function),
    );

    const codeInput = container.querySelector<HTMLInputElement>(
      'input[placeholder="Código de 4 dígitos"]',
    );
    expect(codeInput).toBeTruthy();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(codeInput, '1234');
      codeInput?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => clickByText(container, 'button', 'Marcar como Entregue'));
    await flushUntil(() => mocks.updateStatus.mock.calls.length === 1);
    expect(mocks.updateStatus).toHaveBeenCalledWith(81, 'ENTREGUE', '1234');
    expect(mocks.clearWatch).toHaveBeenCalledWith(77);
    expect(localStorage.getItem('courier-location-tracking:44')).toBeNull();
  });

  it('permite retirar sem GPS mesmo quando a permissão de localização é negada', async () => {
    mocks.listOrders.mockResolvedValue([deliveryOrder()]);
    mocks.claimDelivery.mockResolvedValue(deliveryOrder('SAIU_PARA_ENTREGA'));
    mocks.getCurrentPosition.mockImplementation(
      (_success: PositionCallback, error: PositionErrorCallback) =>
        error({ code: 1, message: 'denied' } as GeolocationPositionError),
    );

    await act(async () => root.render(<CourierWorkspace />));
    await flushUntil(() => container.textContent?.includes('Pedidos aguardando você') === true);
    await act(async () => clickByText(container, 'button', 'Para retirar'));
    await flushUntil(() => container.textContent?.includes('Retirar e iniciar entrega') === true);
    await act(async () => clickByText(container, 'button', 'Retirar e iniciar entrega'));
    await flushUntil(() =>
      container.textContent?.includes('Compartilhar localização durante a entrega?') === true,
    );

    await act(async () =>
      clickByText(container, '[role="dialog"] button', 'Ativar localização'),
    );
    await flushUntil(() => container.textContent?.includes('A localização foi bloqueada') === true);
    expect(mocks.claimDelivery).not.toHaveBeenCalled();
    expect(mocks.watchPosition).not.toHaveBeenCalled();

    await act(async () => clickByText(container, 'button', 'Continuar sem localização'));
    await flushUntil(() => mocks.claimDelivery.mock.calls.length === 1);
    expect(mocks.claimDelivery).toHaveBeenCalledWith(81, undefined);
    expect(container.textContent).toContain('iniciada sem compartilhamento de localização');
  });

  it('mostra erro de carregamento e permite tentar novamente', async () => {
    mocks.listOrders
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce([deliveryOrder()]);
    await act(async () => root.render(<CourierWorkspace />));
    await flushUntil(() => container.textContent?.includes('Confira a conexão') === true);
    await act(async () => clickByText(container, 'button', 'Tentar novamente'));
    await flushUntil(() => mocks.listOrders.mock.calls.length === 2);
    expect(container.textContent).not.toContain('Confira a conexão');
  });

  it('descarta pedidos e eventos de outro restaurante', async () => {
    mocks.listOrders.mockResolvedValue([
      deliveryOrder(),
      { ...deliveryOrder(), id: 82, restaurantId: 8 },
    ]);

    await act(async () => root.render(<CourierWorkspace />));
    await flushUntil(() => container.textContent?.includes('Pedidos aguardando você') === true);
    await act(async () => clickByText(container, 'button', 'Para retirar'));
    expect(container.textContent).toContain('Pedido #81');
    expect(container.textContent).not.toContain('Pedido #82');

    await act(async () =>
      mocks.listeners.get('order:status-changed')?.({
        ...deliveryOrder(),
        id: 83,
        restaurantId: 8,
      }),
    );
    expect(container.textContent).not.toContain('Pedido #83');
  });

  it('mostra pedidos acumulados em blocos de 10 e permite voltar aos primeiros 10', async () => {
    mocks.listOrders.mockResolvedValue(
      Array.from({ length: 21 }, (_, index) => ({
        ...deliveryOrder('ENTREGUE'),
        id: 100 + index,
      })),
    );

    await act(async () => root.render(<CourierWorkspace />));
    await flushUntil(() => container.textContent?.includes('Pedidos aguardando você') === true);
    await act(async () => clickByText(container, 'button', 'Histórico'));
    await flushUntil(() => container.textContent?.includes('Exibindo 10 de 21 pedidos') === true);
    expect(container.querySelectorAll('button[aria-label^="Ver detalhes do pedido"]')).toHaveLength(
      10,
    );

    await act(async () => clickByText(container, 'button', 'Mostrar mais 10'));
    expect(container.querySelectorAll('button[aria-label^="Ver detalhes do pedido"]')).toHaveLength(
      20,
    );
    await act(async () => clickByText(container, 'button', 'Mostrar mais 10'));
    expect(container.querySelectorAll('button[aria-label^="Ver detalhes do pedido"]')).toHaveLength(
      21,
    );

    await act(async () => clickByText(container, 'button', 'Voltar para 10'));
    expect(container.querySelectorAll('button[aria-label^="Ver detalhes do pedido"]')).toHaveLength(
      10,
    );
  });

  it('abre Histórico, Perfil e Ajuda pelo menu Mais da navegação inferior', async () => {
    mocks.listOrders.mockResolvedValue([]);

    await act(async () => root.render(<CourierWorkspace />));
    await flushUntil(() => container.textContent?.includes('Pedidos aguardando você') === true);
    await act(async () => clickByText(container, 'button', 'Mais'));

    expect(container.querySelector('[aria-label="Mais opções do motoqueiro"]')).toBeTruthy();
    expect(container.textContent).toContain('Histórico');
    expect(container.textContent).toContain('Meu perfil');
    expect(container.textContent).toContain('Central de ajuda');

    await act(async () => clickByText(container, 'button', 'Central de ajuda'));
    await flushUntil(() => container.textContent?.includes('Ajuda') === true);
    expect(container.querySelector('[aria-label="Mais opções do motoqueiro"]')).toBeNull();
  });

  it('não enfileira posições offline e reenvia somente a posição atual ao reconectar', async () => {
    mocks.socket.connected = false;
    localStorage.setItem('courier-location-tracking:44', 'enabled');
    mocks.listOrders.mockResolvedValue([deliveryOrder('SAIU_PARA_ENTREGA')]);

    await act(async () => root.render(<CourierWorkspace />));
    await flushUntil(() => mocks.watchPosition.mock.calls.length === 1);
    await act(async () => watchSuccess?.(geoPosition(-3.74, -38.54)));
    expect(mocks.socket.volatile.emit).not.toHaveBeenCalled();

    mocks.socket.connected = true;
    await act(async () => mocks.listeners.get('connect')?.());
    expect(mocks.socket.volatile.emit).toHaveBeenCalledTimes(1);
    expect(mocks.socket.volatile.emit).toHaveBeenCalledWith(
      'delivery:location:update',
      expect.objectContaining({ orderId: 81, latitude: -3.74, longitude: -38.54 }),
      expect.any(Function),
    );
  });
});