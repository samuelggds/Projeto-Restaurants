import { describe, expect, it } from 'vitest';
import { adminMockSettings } from '../data';
import { validateOrderFlowSettings } from './orderFlowSettingsValidation';

describe('order flow settings validation', () => {
  it('aceita limites inteiros dentro das faixas operacionais', () => {
    expect(
      validateOrderFlowSettings({
        ...adminMockSettings,
        deliveryTime: 45,
        deliveryTimeMin: 30,
        deliveryTimeMax: 45,
        maxConcurrentOrders: 80,
      }),
    ).toEqual({});
  });

  it('rejeita valores fracionários ou acima do limite', () => {
    expect(
      validateOrderFlowSettings({
        ...adminMockSettings,
        deliveryTime: 2.5,
        deliveryTimeMin: 2.5,
        deliveryTimeMax: 300,
        maxConcurrentOrders: 501,
      }),
    ).toEqual({
      deliveryTimeMin: expect.any(String),
      deliveryTimeMax: expect.any(String),
      maxConcurrentOrders: expect.any(String),
    });
  });
});
