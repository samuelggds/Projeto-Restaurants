import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ordersService from '../../../Services/ordersService';
import { ADDRESS_LOCATION_DEBOUNCE_MS, AddressLocationMap } from './AddressLocationMap';

const leafletMocks = vi.hoisted(() => ({
  setView: vi.fn(),
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({
    children,
    center,
    zoom,
  }: {
    children?: ReactNode;
    center?: [number, number];
    zoom?: number;
  }) => (
    <div
      data-testid="address-map-container"
      data-center={center?.join(',')}
      data-zoom={String(zoom ?? '')}
    >
      {children}
    </div>
  ),
  TileLayer: ({ url, attribution }: { url: string; attribution?: string }) => (
    <div data-testid="address-map-tiles" data-url={url} data-attribution={attribution} />
  ),
  CircleMarker: ({
    center,
  }: {
    center: [number, number];
  }) => <div data-testid="address-map-marker" data-center={center.join(',')} />,
  useMap: () => ({
    setView: leafletMocks.setView,
  }),
}));

vi.mock('../../../Services/ordersService', () => ({
  default: {
    getDeliveryAddressLocation: vi.fn(),
  },
}));

describe('AddressLocationMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const address = {
    address: 'Rua das Flores',
    number: '123',
    district: 'Centro',
    city: 'Fortaleza',
    state: 'CE',
    zipCode: '60000-000',
    complement: '',
  };

  it('renderiza o mapa por tiles usando somente a localização validada pelo backend', async () => {
    vi.mocked(ordersService.getDeliveryAddressLocation).mockResolvedValue({
      latitude: -3.7319,
      longitude: -38.5267,
      formattedAddress: 'Rua das Flores, 123 - Fortaleza - CE',
      partialMatch: false,
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <AddressLocationMap
          restaurantId={9}
          primaryColor="#d05632"
          address={address}
        />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(ordersService.getDeliveryAddressLocation).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 9,
        type: 'DELIVERY',
        address: 'Rua das Flores',
        number: '123',
        state: 'CE',
      }),
    );

    expect(container.querySelector('[data-testid="address-map-container"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="address-map-marker"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="address-map-tiles"]')).not.toBeNull();
    expect(container.querySelector('#gastronexa-google-maps')).toBeNull();
    expect(leafletMocks.setView).toHaveBeenCalledWith([-3.7319, -38.5267], 17, {
      animate: false,
    });
    expect(container.textContent).toContain('Localização encontrada');
    expect(container.textContent).toContain('Rua das Flores, 123 - Fortaleza - CE');

    act(() => root.unmount());
    container.remove();
  });

  it('não refaz geocodificação ao digitar somente o complemento', async () => {
    vi.mocked(ordersService.getDeliveryAddressLocation).mockResolvedValue({
      latitude: -3.7319,
      longitude: -38.5267,
      formattedAddress: 'Rua das Flores, 123 - Fortaleza - CE',
      partialMatch: false,
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<AddressLocationMap restaurantId={9} primaryColor="#d05632" address={address} />);
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ADDRESS_LOCATION_DEBOUNCE_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(ordersService.getDeliveryAddressLocation).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.render(
        <AddressLocationMap
          restaurantId={9}
          primaryColor="#d05632"
          address={{ ...address, complement: 'Apto 10' }}
        />,
      );
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ADDRESS_LOCATION_DEBOUNCE_MS * 2);
    });

    expect(ordersService.getDeliveryAddressLocation).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    container.remove();
  });

  it('preserva indisponibilidade da validação sem dizer que o endereço é inválido', async () => {
    vi.mocked(ordersService.getDeliveryAddressLocation).mockRejectedValue({
      response: {
        data: {
          code: 'ADDRESS_VALIDATION_UNAVAILABLE',
          error: 'detalhe interno que não deve ser exibido',
        },
      },
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <AddressLocationMap
          restaurantId={9}
          primaryColor="#d05632"
          address={address}
        />,
      );
      await Promise.resolve();
    });

    await act(async () => {
      await vi.runAllTimersAsync();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain(
      'Não conseguimos confirmar o endereço no mapa agora. Confira os dados; se estiverem corretos, você ainda poderá continuar com o pedido.',
    );
    expect(container.textContent).not.toContain('Não encontramos esse endereço no mapa');
    expect(container.textContent).not.toContain('detalhe interno');

    act(() => root.unmount());
    container.remove();
  });

  it('não solicita localização sem tenant identificado', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <AddressLocationMap
          restaurantId={null}
          primaryColor="#d05632"
          address={address}
        />,
      );
      await vi.runAllTimersAsync();
    });

    expect(ordersService.getDeliveryAddressLocation).not.toHaveBeenCalled();
    expect(container.textContent).toContain(
      'A localização ficará disponível assim que o restaurante for identificado.',
    );

    act(() => root.unmount());
    container.remove();
  });
});
