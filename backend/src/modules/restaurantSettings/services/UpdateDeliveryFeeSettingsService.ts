import prisma from '../../../config/prisma.js';

type DeliveryFeeModeInput = 'FIXED' | 'DISTANCE';

type DeliveryFeeRangeInput = {
  id?: number;
  maxDistanceKm?: number;
  fee?: number;
  active?: boolean;
};

type UpdateDeliveryFeeSettingsPayload = {
  restaurantId: number | string;
  deliveryFeeMode?: DeliveryFeeModeInput | string;
  deliveryFeeRanges?: DeliveryFeeRangeInput[];
};

type NormalizedDeliveryFeeRange = {
  maxDistanceKm: number;
  fee: number;
  active: boolean;
};

function roundToTwoDecimals(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeMode(value: unknown): DeliveryFeeModeInput | undefined {
  if (value === undefined) return undefined;

  const mode = String(value || '')
    .trim()
    .toUpperCase();

  if (mode !== 'FIXED' && mode !== 'DISTANCE') {
    throw new Error('Forma de cálculo da taxa de entrega inválida.');
  }

  return mode;
}

function normalizeRanges(value: unknown): NormalizedDeliveryFeeRange[] | undefined {
  if (value === undefined) return undefined;

  if (!Array.isArray(value)) {
    throw new Error('As faixas da taxa de entrega devem ser uma lista.');
  }

  const ranges = value.map((rangeValue, index) => {
    if (!rangeValue || typeof rangeValue !== 'object') {
      throw new Error(`Faixa de entrega ${index + 1} inválida.`);
    }

    const range = rangeValue as DeliveryFeeRangeInput;
    const maxDistanceKm = roundToTwoDecimals(Number(range.maxDistanceKm));
    const fee = roundToTwoDecimals(Number(range.fee));

    if (!Number.isFinite(maxDistanceKm) || maxDistanceKm <= 0 || maxDistanceKm > 9999.99) {
      throw new Error(`A distância máxima da faixa ${index + 1} é inválida.`);
    }

    if (!Number.isFinite(fee) || fee < 0 || fee > 99999999.99) {
      throw new Error(`O valor da faixa ${index + 1} é inválido.`);
    }

    return {
      maxDistanceKm,
      fee,
      active: range.active !== false,
    };
  });

  const uniqueDistances = new Set(ranges.map((range) => range.maxDistanceKm.toFixed(2)));
  if (uniqueDistances.size !== ranges.length) {
    throw new Error('Não é permitido cadastrar duas faixas com a mesma distância máxima.');
  }

  return ranges.sort((first, second) => first.maxDistanceKm - second.maxDistanceKm);
}

class UpdateDeliveryFeeSettingsService {
  async execute({
    restaurantId,
    deliveryFeeMode,
    deliveryFeeRanges,
  }: UpdateDeliveryFeeSettingsPayload) {
    const normalizedRestaurantId = Number(restaurantId);

    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para configurar a taxa de entrega.');
    }

    const normalizedMode = normalizeMode(deliveryFeeMode);
    const normalizedRanges = normalizeRanges(deliveryFeeRanges);

    if (normalizedMode === undefined && normalizedRanges === undefined) {
      return null;
    }

    return prisma.$transaction(async (tx) => {
      const settings = await tx.restaurantSettings.findUnique({
        where: {
          restaurantId: normalizedRestaurantId,
        },
        select: {
          deliveryFeeMode: true,
        },
      });

      if (!settings) {
        throw new Error('Configurações não encontradas!');
      }

      const currentRanges =
        normalizedRanges === undefined
          ? await tx.deliveryFeeRange.findMany({
              where: {
                restaurantId: normalizedRestaurantId,
              },
              select: {
                maxDistanceKm: true,
                fee: true,
                active: true,
              },
              orderBy: {
                maxDistanceKm: 'asc',
              },
            })
          : normalizedRanges;

      const effectiveMode = normalizedMode ?? settings.deliveryFeeMode;
      const hasActiveRange = currentRanges.some((range) => range.active !== false);

      if (effectiveMode === 'DISTANCE' && !hasActiveRange) {
        throw new Error('Cadastre pelo menos uma faixa ativa para usar taxa por distância.');
      }

      if (normalizedMode !== undefined) {
        await tx.restaurantSettings.update({
          where: {
            restaurantId: normalizedRestaurantId,
          },
          data: {
            deliveryFeeMode: normalizedMode,
          },
        });
      }

      if (normalizedRanges !== undefined) {
        await tx.deliveryFeeRange.deleteMany({
          where: {
            restaurantId: normalizedRestaurantId,
          },
        });

        if (normalizedRanges.length > 0) {
          await tx.deliveryFeeRange.createMany({
            data: normalizedRanges.map((range) => ({
              restaurantId: normalizedRestaurantId,
              maxDistanceKm: range.maxDistanceKm,
              fee: range.fee,
              active: range.active,
            })),
          });
        }
      }

      const savedRanges = await tx.deliveryFeeRange.findMany({
        where: {
          restaurantId: normalizedRestaurantId,
        },
        select: {
          id: true,
          maxDistanceKm: true,
          fee: true,
          active: true,
        },
        orderBy: {
          maxDistanceKm: 'asc',
        },
      });

      return {
        deliveryFeeMode: effectiveMode,
        deliveryFeeRanges: savedRanges.map((range) => ({
          id: range.id,
          maxDistanceKm: Number(range.maxDistanceKm),
          fee: Number(range.fee),
          active: range.active,
        })),
      };
    });
  }
}

export default new UpdateDeliveryFeeSettingsService();
