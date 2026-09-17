import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractNavigationConnectTelemetry,
  parseNavigationDurationSeconds,
} from './NavigationConnectService.js';

test('parseNavigationDurationSeconds converte Duration protobuf em segundos', () => {
  assert.equal(parseNavigationDurationSeconds('125s'), 125);
  assert.equal(parseNavigationDurationSeconds('12.6s'), 13);
  assert.equal(parseNavigationDurationSeconds('0s'), 0);
  assert.equal(parseNavigationDurationSeconds('-1s'), null);
  assert.equal(parseNavigationDurationSeconds('invalid'), null);
});

test('extractNavigationConnectTelemetry normaliza localização e ETA', () => {
  const telemetry = extractNavigationConnectTelemetry({
    state: 'ENROUTE',
    execution: {
      location: {
        point: { latitude: -3.7319, longitude: -38.5267 },
        sourceTime: '2026-09-17T18:30:00Z',
      },
      destination: {
        point: { latitude: -3.7284, longitude: -38.519 },
      },
      remainingDuration: '420s',
      remainingDistanceMeters: 1850,
    },
    updateTime: '2026-09-17T18:30:01Z',
  });

  assert.deepEqual(telemetry, {
    state: 'ENROUTE',
    location: {
      latitude: -3.7319,
      longitude: -38.5267,
      recordedAt: '2026-09-17T18:30:00Z',
    },
    destination: {
      latitude: -3.7284,
      longitude: -38.519,
    },
    remainingDurationSeconds: 420,
    remainingDistanceMeters: 1850,
    updatedAt: '2026-09-17T18:30:01Z',
  });
});

test('extractNavigationConnectTelemetry rejeita coordenadas inválidas', () => {
  const telemetry = extractNavigationConnectTelemetry({
    state: 'NEW',
    execution: {
      location: { point: { latitude: 999, longitude: -38.5 } },
      remainingDuration: '30s',
    },
  });

  assert.equal(telemetry?.location, null);
  assert.equal(telemetry?.remainingDurationSeconds, 30);
});
