import { describe, expect, it } from 'vitest';
import { belongsToTableRoute, isTableSessionActive, resolveTableRoute } from './tableSession';

describe('tableSession', () => {
  it('resolve os identificadores do QR Code', () => {
    expect(resolveTableRoute('4', '8', '12')).toEqual({
      routeTableNumber: 4,
      routeRestaurantId: 8,
      routeTableId: 12,
      mesaMode: true,
      hasRouteRestaurantId: true,
    });
  });
  it('usa o número da mesa como id quando necessário', () => {
    expect(resolveTableRoute('4', null, null).routeTableId).toBe(4);
  });
  it('recusa uma sessão de outra mesa ou restaurante', () => {
    const session = { sessionToken: 'token', tableId: 4, restaurantId: 8 };
    expect(isTableSessionActive(session, true, 4, 8)).toBe(true);
    expect(isTableSessionActive(session, true, 5, 8)).toBe(false);
    expect(belongsToTableRoute(session, 4, 9)).toBe(false);
  });
});
