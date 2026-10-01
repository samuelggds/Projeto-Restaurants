import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ordersService from '../../../Services/ordersService';
import { ADDRESS_LOCATION_DEBOUNCE_MS, AddressLocationMap } from './AddressLocationMap';

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
    delete (window as typeof window & { google?: unknown }).google;
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

  it('inicializa o Google Maps sem colorScheme incompatível e mostra a localização validada', async () => {
    const mapOptions: Array<Record<string, unknown>> = [];
    class FakeMap {
      constructor(_element: HTMLElement, options: Record<string, unknown>) {
        mapOptions.push(options);
      }
      setCenter() {}
      setZoom() {}
      panTo() {}
    }
    class FakeMarker {
      constructor(_options: Record<string, unknown>) {}
      setPosition() {}
      setTitle() {}
    }
    class FakeGeocoder {
      geocode() {}
    }

    (window as typeof window & { google?: unknown }).google = {
      maps: {
        Map: FakeMap,
        Marker: FakeMarker,
        Geocoder: FakeGeocoder,
      },
    };

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

    await act(async () => {
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
    await vi.waitFor(() => {
      expect(mapOptions).toHaveLength(1);
    });
    expect(mapOptions[0]).not.toHaveProperty('colorScheme');
    expect(mapOptions[0]).toHaveProperty('styles');
    expect(container.textContent).toContain('Localização encontrada');
    expect(container.textContent).toContain('Rua das Flores, 123 - Fortaleza - CE');

    act(() => root.unmount());
    container.remove();
  });

  it('não refaz geocodificação ao digitar somente o complemento', async () => {
    class FakeMap {
      constructor(_element: HTMLElement, _options: Record<string, unknown>) {}
      setCenter() {}
      setZoom() {}
      panTo() {}
    }
    class FakeMarker {
      constructor(_options: Record<string, unknown>) {}
      setPosition() {}
      setTitle() {}
    }
    class FakeGeocoder {
      geocode() {}
    }

    (window as typeof window & { google?: unknown }).google = {
      maps: {
        Map: FakeMap,
        Marker: FakeMarker,
        Geocoder: FakeGeocoder,
      },
    };

    vi.mocked(ordersService.getDeliveryAddressLocation).mockResolvedValue({
      latitude: -3.7319,
      longitude: -38.5267,
      formattedAddress: 'Rua das Flores, 123 - Fortaleza - CE',
      partialMatch: false,
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const address = {
      address: 'Rua das Flores',
      number: '123',
      district: 'Centro',
      city: 'Fortaleza',
      state: 'CE',
      zipCode: '60000-000',
      complement: '',
    };

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
});
