export const RESTAURANT_CLOSED_MESSAGE =
  'O restaurante está fechado no momento e não está recebendo pedidos.';

export function assertRestaurantIsOpenForOrders(isOpenForOrders: unknown) {
  if (isOpenForOrders === false) {
    throw new Error(RESTAURANT_CLOSED_MESSAGE);
  }
}
