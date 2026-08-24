import { describe, expect, it } from 'vitest';
import {
  mergeTrackingLocation,
  normalizeDeliveryTrackingData,
  trackingEventMatches,
} from './deliveryTracking';

describe('deliveryTracking', () => {
  it('normaliza somente um contrato de rastreamento válido', () => {
    expect(normalizeDeliveryTrackingData({ order: { id: 0 }, locations: [] })).toBeNull();
    expect(
      normalizeDeliveryTrackingData({
        order: {
          id: 91,
          restaurantId: 7,
          status: 'saiu_para_entrega',
          routeEstimate: {
            durationSeconds: 600,
            distanceMeters: 3200,
            provider: 'OSRM',
            routeCoordinates: [{ latitude: -3.7, longitude: -38.5 }],
            destination: { latitude: -3.8, longitude: -38.6, label: 'Rua do cliente' },
          },
        },
        locations: [{ latitude: -3.71, longitude: -38.51 }],
      }),
    ).toMatchObject({
      order: {
        id: 91,
        restaurantId: 7,
        status: 'SAIU_PARA_ENTREGA',
        routeEstimate: { destination: { label: 'Rua do cliente' } },
      },
      locations: [{ latitude: -3.71, longitude: -38.51 }],
    });
  });

  it('filtra eventos pelo pedido e restaurante, mantendo compatibilidade sem restaurantId', () => {
    expect(trackingEventMatches({ orderId: 91, restaurantId: 7 }, 91, 7)).toBe(true);
    expect(trackingEventMatches({ orderId: 91 }, 91, 7)).toBe(true);
    expect(trackingEventMatches({ orderId: 91, restaurantId: 8 }, 91, 7)).toBe(false);
    expect(trackingEventMatches({ orderId: 92, restaurantId: 7 }, 91, 7)).toBe(false);
  });

  it.each(['ENTREGUE', 'CANCELADO'])(
    'ignora novas posições após o status terminal %s',
    (status) => {
      const current = normalizeDeliveryTrackingData({
        order: { id: 91, status },
        locations: [{ latitude: -3.7, longitude: -38.5 }],
      })!;
      expect(mergeTrackingLocation(current, { latitude: -3.8, longitude: -38.6 })).toBe(current);
    },
  );
});
