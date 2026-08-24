import tableRepository from '../repositories/TableRepository.js';

type ResolvePublicTablePayload = {
  tableNumber: number | string;
  tableId?: number | string | null;
  restaurantId?: number | string | null;
  restaurantSlug?: string | null;
};

export class PublicTableResolutionError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code = 'INVALID_TABLE_REFERENCE',
  ) {
    super(message);
  }
}

const positiveInteger = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

class ResolvePublicTableService {
  async execute({ tableNumber, tableId, restaurantId, restaurantSlug }: ResolvePublicTablePayload) {
    const normalizedTableNumber = positiveInteger(tableNumber);
    const normalizedTableId =
      tableId === undefined || tableId === null || String(tableId).trim() === ''
        ? null
        : positiveInteger(tableId);
    const normalizedRestaurantId =
      restaurantId === undefined || restaurantId === null || String(restaurantId).trim() === ''
        ? null
        : positiveInteger(restaurantId);
    const normalizedSlug = String(restaurantSlug || '')
      .trim()
      .toLowerCase();

    if (!normalizedTableNumber) {
      throw new PublicTableResolutionError('Número da mesa inválido.');
    }

    if (tableId !== undefined && tableId !== null && String(tableId).trim() && !normalizedTableId) {
      throw new PublicTableResolutionError('Identificador da mesa inválido.');
    }

    if (
      restaurantId !== undefined &&
      restaurantId !== null &&
      String(restaurantId).trim() &&
      !normalizedRestaurantId
    ) {
      throw new PublicTableResolutionError('Restaurante inválido.');
    }

    if (!normalizedRestaurantId && !normalizedSlug) {
      throw new PublicTableResolutionError(
        'O QR Code não identifica o restaurante. Escaneie o código oficial novamente.',
      );
    }

    if (normalizedSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
      throw new PublicTableResolutionError('Identificador do restaurante inválido.');
    }

    const table = await tableRepository.findPublicByReference({
      number: normalizedTableNumber,
      ...(normalizedRestaurantId ? { restaurantId: normalizedRestaurantId } : {}),
      ...(normalizedSlug ? { restaurantSlug: normalizedSlug } : {}),
    });

    if (!table || (normalizedTableId && table.id !== normalizedTableId)) {
      throw new PublicTableResolutionError(
        'Mesa não encontrada neste restaurante.',
        404,
        'TABLE_NOT_FOUND',
      );
    }

    const subscription = table.restaurant.subscription;
    const hasPremiumTableAccess =
      subscription?.plan === 'PREMIUM' &&
      (subscription.status === 'ATIVA' || subscription.status === 'TESTE');

    if (!hasPremiumTableAccess) {
      throw new PublicTableResolutionError(
        'O cardápio de mesa não está disponível para este restaurante.',
        403,
        'TABLE_MENU_UNAVAILABLE',
      );
    }

    const settings = table.restaurant.settings;

    return {
      id: table.id,
      number: table.number,
      restaurantId: table.restaurantId,
      restaurantSlug: table.restaurant.slug,
      tableOrderingEnabled: settings?.tableOrderingEnabled !== false,
      waiterCallEnabled: settings?.waiterCallEnabled !== false,
      billRequestEnabled: settings?.billRequestEnabled !== false,
    };
  }
}

export default new ResolvePublicTableService();
