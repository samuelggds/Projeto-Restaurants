import type { AdminSettings } from '../types';

export type OrderFlowSettingsErrors = Partial<
  Record<'deliveryTime' | 'maxConcurrentOrders', string>
>;

function isIntegerInRange(value: number, minimum: number, maximum: number) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

export function validateOrderFlowSettings(settings: AdminSettings): OrderFlowSettingsErrors {
  const errors: OrderFlowSettingsErrors = {};

  if (!isIntegerInRange(settings.deliveryTime, 1, 240)) {
    errors.deliveryTime = 'Informe um tempo inteiro entre 1 e 240 minutos.';
  }

  if (!isIntegerInRange(settings.maxConcurrentOrders, 1, 500)) {
    errors.maxConcurrentOrders = 'Informe um limite inteiro entre 1 e 500 pedidos.';
  }

  return errors;
}
