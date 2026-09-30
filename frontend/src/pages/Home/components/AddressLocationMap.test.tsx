import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ordersService from '../../../Services/ordersService';
import { AddressLocationMap } from './AddressLocationMap';

vi.mock('../../../Services/ordersService', () => ({
  default: {
    getDeliveryAddressLocation: vi.fn(),
  },
}));

describe('AddressLocationMap', () => {
  beforeEach(() => {
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
      locationType: 'ROOFTOP',
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
          address={{
            address: 'Rua das Flores',
            number: '123',
            district: 'Centro',
            city: 'Fortaleza',
            state: 'CE',
            zipCode: '60000-000',
            complement: '',
          }}
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
});
