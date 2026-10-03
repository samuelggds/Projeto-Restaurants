import { normalizeIntegerInRange } from './adminSettingsValidation.js';

type DeliveryTimeRangeInput = {
  deliveryTimeMin?: string | number | null;
  deliveryTimeMax?: string | number | null;
  averageDeliveryTime?: string | number | null;
};

export type NormalizedDeliveryTimeRange = {
  deliveryTimeMin: number | null;
  deliveryTimeMax: number | null;
  averageDeliveryTime: string | null;
};

function parseLegacyDeliveryTime(value: unknown) {
  const values = String(value ?? '')
    .match(/\d+/g)
    ?.map(Number)
    .filter((item) => Number.isInteger(item) && item > 0);

  if (!values?.length) return null;

  const minimum = normalizeIntegerInRange(values[0], 'Tempo mínimo de entrega', 1, 240);
  const maximum = normalizeIntegerInRange(
    values.length > 1 ? values[1] : values[0],
    'Tempo máximo de entrega',
    1,
    240,
  );

  if (maximum < minimum) {
    throw new Error('O tempo máximo de entrega deve ser maior ou igual ao tempo mínimo.');
  }

  return { minimum, maximum };
}

export function normalizeDeliveryTimeRangeInput(
  input: DeliveryTimeRangeInput,
): NormalizedDeliveryTimeRange | undefined {
  const hasRangeInput =
    input.deliveryTimeMin !== undefined || input.deliveryTimeMax !== undefined;

  if (hasRangeInput) {
    if (input.deliveryTimeMin === null && input.deliveryTimeMax === null) {
      return {
        deliveryTimeMin: null,
        deliveryTimeMax: null,
        averageDeliveryTime: null,
      };
    }

    if (
      input.deliveryTimeMin === undefined ||
      input.deliveryTimeMin === null ||
      input.deliveryTimeMax === undefined ||
      input.deliveryTimeMax === null
    ) {
      throw new Error('Informe o tempo mínimo e o tempo máximo de entrega.');
    }

    const minimum = normalizeIntegerInRange(
      input.deliveryTimeMin,
      'Tempo mínimo de entrega',
      1,
      240,
    );
    const maximum = normalizeIntegerInRange(
      input.deliveryTimeMax,
      'Tempo máximo de entrega',
      1,
      240,
    );

    if (maximum < minimum) {
      throw new Error('O tempo máximo de entrega deve ser maior ou igual ao tempo mínimo.');
    }

    return {
      deliveryTimeMin: minimum,
      deliveryTimeMax: maximum,
      // Mantido durante a transição para clientes antigos que ainda leem o campo legado.
      averageDeliveryTime: String(minimum),
    };
  }

  if (input.averageDeliveryTime === undefined) return undefined;

  if (
    input.averageDeliveryTime === null ||
    String(input.averageDeliveryTime).trim() === ''
  ) {
    return {
      deliveryTimeMin: null,
      deliveryTimeMax: null,
      averageDeliveryTime: null,
    };
  }

  const legacy = parseLegacyDeliveryTime(input.averageDeliveryTime);
  if (!legacy) {
    throw new Error('Informe um tempo de entrega válido entre 1 e 240 minutos.');
  }

  return {
    deliveryTimeMin: legacy.minimum,
    deliveryTimeMax: legacy.maximum,
    averageDeliveryTime: String(legacy.minimum),
  };
}

export function resolveDeliveryTimeRange(input: DeliveryTimeRangeInput) {
  const minimum = Number(input.deliveryTimeMin);
  const maximum = Number(input.deliveryTimeMax);

  if (
    Number.isInteger(minimum) &&
    minimum >= 1 &&
    minimum <= 240 &&
    Number.isInteger(maximum) &&
    maximum >= minimum &&
    maximum <= 240
  ) {
    return { minimum, maximum };
  }

  try {
    return parseLegacyDeliveryTime(input.averageDeliveryTime);
  } catch {
    return null;
  }
}

export function formatDeliveryTimeRange(
  input: DeliveryTimeRangeInput,
  includeUnit = true,
) {
  const range = resolveDeliveryTimeRange(input);
  if (!range) return null;

  const value =
    range.minimum === range.maximum
      ? String(range.minimum)
      : `${range.minimum}-${range.maximum}`;

  return includeUnit ? `${value} min` : value;
}
