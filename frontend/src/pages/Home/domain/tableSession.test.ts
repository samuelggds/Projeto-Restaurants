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
  it('não confunde o número visível da mesa com o id interno', () => {
    expect(resolveTableRoute('4', null, null).routeTableId).toBeNull();
    expect(resolveTableRoute('4', null, null).mesaMode).toBe(true);
  });
  it('recusa uma sessão de outra mesa ou restaurante', () => {
    const session = { sessionToken: 'token', tableId: 4, restaurantId: 8 };
    expect(isTableSessionActive(session, true, 4, 8)).toBe(true);
    expect(isTableSessionActive(session, true, 5, 8)).toBe(false);
    expect(belongsToTableRoute(session, 4, 9)).toBe(false);
  });

  it('aceita a sessão pelo número da mesa quando o QR não possui id interno', () => {
    const session = {
      sessionToken: 'token',
      tableId: 22,
      tableNumber: 1,
      restaurantId: 3,
    };

    expect(isTableSessionActive(session, true, null, 3, 1)).toBe(true);
    expect(belongsToTableRoute(session, null, 3, 1)).toBe(true);
    expect(isTableSessionActive(session, true, 19, 3, 1)).toBe(true);
    expect(isTableSessionActive(session, true, null, 3, 2)).toBe(false);
  });

  it('recusa uma sessão expirada mesmo quando mesa e restaurante conferem', () => {
    const session = {
      sessionToken: 'token',
      tableId: 4,
      restaurantId: 8,
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
    };

    expect(isTableSessionActive(session, true, 4, 8)).toBe(false);
  });
});
