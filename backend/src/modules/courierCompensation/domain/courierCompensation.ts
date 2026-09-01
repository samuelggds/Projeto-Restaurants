import { CourierCompensationModel } from '@prisma/client';

import { centsToMoney, moneyToCents } from './money.js';

export type CompensationRangeInput = {
  maxDistanceMeters: number;
  amount: unknown;
};

export type CompensationPolicyInput = {
  model: CourierCompensationModel | string;
  fixedAmount?: unknown;
  baseAmount?: unknown;
  includedDistanceMeters?: number;
  extraPerKmAmount?: unknown;
  ranges?: CompensationRangeInput[];
};

export type NormalizedCompensationPolicy = {
  model: CourierCompensationModel;
  fixedAmount: string;
  baseAmount: string;
  includedDistanceMeters: number;
  extraPerKmAmount: string;
  ranges: Array<{ maxDistanceMeters: number; amount: string }>;
};

function normalizeNonNegativeInteger(value: unknown, field: string) {
  const normalized = Number(value ?? 0);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new Error(`${field} deve ser um número inteiro não negativo.`);
  }
  return normalized;
}

export function normalizeCompensationPolicy(
  input: CompensationPolicyInput,
): NormalizedCompensationPolicy {
  if (!Object.values(CourierCompensationModel).includes(input.model as CourierCompensationModel)) {
    throw new Error('Modelo de remuneração inválido.');
  }

  const model = input.model as CourierCompensationModel;
  const ranges = (input.ranges || [])
    .map((range) => ({
      maxDistanceMeters: normalizeNonNegativeInteger(
        range.maxDistanceMeters,
        'A distância máxima da faixa',
      ),
      amount: centsToMoney(moneyToCents(range.amount, 'O valor da faixa')),
    }))
    .sort((a, b) => a.maxDistanceMeters - b.maxDistanceMeters);

  if (ranges.some((range) => range.maxDistanceMeters <= 0)) {
    throw new Error('Cada faixa precisa terminar em uma distância maior que zero.');
  }
  if (new Set(ranges.map((range) => range.maxDistanceMeters)).size !== ranges.length) {
    throw new Error('As faixas de distância não podem terminar na mesma distância.');
  }
  if (model === CourierCompensationModel.DISTANCE_RANGES && ranges.length === 0) {
    throw new Error('Cadastre pelo menos uma faixa de distância.');
  }

  return {
    model,
    fixedAmount: centsToMoney(moneyToCents(input.fixedAmount ?? 0, 'O valor fixo')),
    baseAmount: centsToMoney(moneyToCents(input.baseAmount ?? 0, 'O valor base')),
    includedDistanceMeters: normalizeNonNegativeInteger(
      input.includedDistanceMeters,
      'A distância incluída',
    ),
    extraPerKmAmount: centsToMoney(
      moneyToCents(input.extraPerKmAmount ?? 0, 'O adicional por quilômetro'),
    ),
    ranges,
  };
}

export function compensationRequiresDistance(model: CourierCompensationModel | string) {
  return (
    model === CourierCompensationModel.DISTANCE_RANGES ||
    model === CourierCompensationModel.BASE_PLUS_DISTANCE
  );
}

export function calculateCourierCompensation(
  input: CompensationPolicyInput,
  deliveryDistanceMeters: number | null | undefined,
) {
  const policy = normalizeCompensationPolicy(input);

  if (policy.model === CourierCompensationModel.FIXED_PER_DELIVERY) {
    return policy.fixedAmount;
  }

  if (!Number.isSafeInteger(deliveryDistanceMeters) || Number(deliveryDistanceMeters) < 0) {
    throw new Error('A distância segura da rota é necessária para calcular esta entrega.');
  }
  const distanceMeters = Number(deliveryDistanceMeters);

  if (policy.model === CourierCompensationModel.DISTANCE_RANGES) {
    const range = policy.ranges.find((entry) => distanceMeters <= entry.maxDistanceMeters);
    if (!range) {
      throw new Error('A distância desta entrega não está coberta pelas faixas configuradas.');
    }
    return range.amount;
  }

  const baseCents = moneyToCents(policy.baseAmount);
  const perKmCents = moneyToCents(policy.extraPerKmAmount);
  const excessMeters = Math.max(0, distanceMeters - policy.includedDistanceMeters);
  // Integer half-up rounding keeps the result deterministic and free from IEEE-754 drift.
  const extraCents = (BigInt(excessMeters) * perKmCents + 500n) / 1000n;
  return centsToMoney(baseCents + extraCents);
}
