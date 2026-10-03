import type { AdminSettings } from '../types';

export type OrderFlowSettingsErrors = Partial<
  Record<'deliveryTimeMin' | 'deliveryTimeMax' | 'maxConcurrentOrders', string>
>;

function isIntegerInRange(value: number, minimum: number, maximum: number) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

export function validateOrderFlowSettings(settings: AdminSettings): OrderFlowSettingsErrors {
  const errors: OrderFlowSettingsErrors = {};

  if (!isIntegerInRange(settings.deliveryTimeMin, 1, 240)) {
    errors.deliveryTimeMin = 'Informe um tempo mínimo inteiro entre 1 e 240 minutos.';
  }

  if (!isIntegerInRange(settings.deliveryTimeMax, 1, 240)) {
    errors.deliveryTimeMax = 'Informe um tempo máximo inteiro entre 1 e 240 minutos.';
  } else if (
    isIntegerInRange(settings.deliveryTimeMin, 1, 240) &&
    settings.deliveryTimeMax < settings.deliveryTimeMin
  ) {
    errors.deliveryTimeMax = 'O tempo máximo deve ser maior ou igual ao tempo mínimo.';
  }

  if (!isIntegerInRange(settings.maxConcurrentOrders, 1, 500)) {
    errors.maxConcurrentOrders = 'Informe um limite inteiro entre 1 e 500 pedidos.';
  }

  return errors;
}
