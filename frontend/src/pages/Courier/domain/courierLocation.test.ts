import { describe, expect, it } from 'vitest';
import {
  buildCourierLocationPayload,
  courierTrackingPreferenceKey,
  describeGeolocationFailure,
  isValidCourierRoutePoint,
  mergeCourierRoutePoints,
  routePointFromPosition,
} from './courierLocation';

function position(latitude: number, longitude: number): GeolocationPosition {
  return {
    coords: {
      latitude,
      longitude,
      accuracy: 13.6,
      altitude: null,
      altitudeAccuracy: null,
      heading: Number.NaN,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp: 1,
    toJSON: () => ({}),
  };
}

describe('courierLocation', () => {
  it('valida e converte uma posição do celular em payload seguro', () => {
    const point = routePointFromPosition(position(-3.7319, -38.5267), '2026-08-24T20:00:00Z');
    expect(point).toMatchObject({ latitude: -3.7319, longitude: -38.5267, accuracy: 13.6 });
    expect(buildCourierLocationPayload(91, point!)).toEqual({
      orderId: 91,
      latitude: -3.7319,
      longitude: -38.5267,
      heading: null,
      speed: null,
      accuracy: 14,
      sentAt: '2026-08-24T20:00:00Z',
    });
    expect(isValidCourierRoutePoint({ latitude: 200, longitude: 0 })).toBe(false);
    expect(buildCourierLocationPayload(0, point!)).toBeNull();
  });

  it('remove pontos inválidos/duplicados e limita o histórico local', () => {
    expect(
      mergeCourierRoutePoints(
        [{ latitude: -3, longitude: -38, recordedAt: 'a' }],
        [
          { latitude: -3, longitude: -38, recordedAt: 'a' },
          { latitude: -3.1, longitude: -38.1, recordedAt: 'b' },
          { latitude: Number.NaN, longitude: -38 },
        ],
        2,
      ),
    ).toEqual([
      { latitude: -3, longitude: -38, recordedAt: 'a' },
      { latitude: -3.1, longitude: -38.1, recordedAt: 'b' },
    ]);
  });

  it('diferencia bloqueio, timeout e falha do GPS e vincula preferência à conta', () => {
    expect(describeGeolocationFailure({ code: 1 }).status).toBe('blocked');
    expect(describeGeolocationFailure({ code: 3 }).status).toBe('timeout');
    expect(describeGeolocationFailure({ code: 2 }).status).toBe('error');
    expect(courierTrackingPreferenceKey(44)).toBe('courier-location-tracking:44');
  });
});
