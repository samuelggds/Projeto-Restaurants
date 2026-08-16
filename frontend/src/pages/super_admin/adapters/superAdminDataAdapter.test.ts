import { describe, expect, it } from 'vitest';
import { buildPlatformMetrics, derivePlans, mapRestaurantTenant } from './superAdminDataAdapter';

describe('superAdminDataAdapter', () => {
  it('normaliza um restaurante da plataforma', () => {
    expect(
      mapRestaurantTenant({
        id: 1,
        name: 'North',
        status: 'Ativo',
        owner: { name: 'Samuel' },
        subscription: { plan: 'BASICO' },
      }),
    ).toMatchObject({ id: '1', status: 'ACTIVE', responsible: 'Samuel', plan: 'BASICO' });
  });
  it('contabiliza restaurantes por plano', () => {
    const restaurant = mapRestaurantTenant({
      id: 1,
      status: 'Ativo',
      subscription: { plan: 'BASICO' },
    });
    expect(derivePlans([restaurant]).find((plan) => plan.id === 'BASICO')?.restaurants).toBe(1);
  });
  it('calcula MRR e status', () => {
    const restaurant = {
      ...mapRestaurantTenant({ id: 1, status: 'Bloqueado' }),
      monthlyRevenue: 100,
    };
    expect(buildPlatformMetrics([restaurant], {})).toMatchObject({
      mrr: 100,
      restaurantsBlocked: 1,
    });
  });
});
