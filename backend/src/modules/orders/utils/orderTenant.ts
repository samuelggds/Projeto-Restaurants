type ResolveOrderRestaurantInput = {
  requestedRestaurantId?: number | string | null;
  contextRestaurantId?: number | string | null;
};

function positiveInteger(value: number | string | null | undefined) {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
}

/**
 * Resolve o tenant do pedido sem confiar no restaurantId enviado pelo cliente
 * quando a autenticação ou a sessão da mesa já definiu um restaurante.
 */
export function resolveOrderRestaurantId({
  requestedRestaurantId,
  contextRestaurantId,
}: ResolveOrderRestaurantInput) {
  const requested = positiveInteger(requestedRestaurantId);
  const context = positiveInteger(contextRestaurantId);

  if (context) {
    if (requested && requested !== context) {
      throw new Error('O restaurante informado não corresponde à sessão atual.');
    }

    return context;
  }

  if (requested) {
    return requested;
  }

  throw new Error('Restaurante não informado para o pedido.');
}
