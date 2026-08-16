import prisma from '../../../config/prisma.js';
import restaurantRepository from '../repositories/RestaurantRepository.js';
import { PlanType } from '@prisma/client';
import { PLAN_CONFIG } from '../../billing/config/planConfig.js';

type ListedRestaurant = Awaited<ReturnType<typeof restaurantRepository.listAll>>[number];

const PLAN_PRICES: Record<PlanType, number> = {
  BASICO: PLAN_CONFIG.BASICO.monthlyFee,
  PREMIUM: PLAN_CONFIG.PREMIUM.monthlyFee,
};

function getRestaurantStatus(restaurant: ListedRestaurant) {
  if (!restaurant.active) {
    return 'Bloqueado';
  }

  if (
    restaurant.subscription?.status === 'EXPIRADA' ||
    restaurant.subscription?.status === 'CANCELADA'
  ) {
    return 'Expirado';
  }

  if (!restaurant.subscription || restaurant.subscription?.status === 'TESTE') {
    return 'Aviso';
  }

  return 'Ativo';
}

class ListRestaurantsService {
  async execute() {
    const restaurants = await restaurantRepository.listAll();

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const revenueByRestaurant = await prisma.order.groupBy({
      by: ['restaurantId'],
      where: {
        paid: true,
        status: { not: 'CANCELADO' },
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
      _sum: {
        total: true,
      },
    });

    const revenueMap = new Map(
      revenueByRestaurant.map((item) => [item.restaurantId, Number(item._sum.total || 0)]),
    );

    return restaurants.map((restaurant) => ({
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      email: restaurant.email,
      city: restaurant.city,
      state: restaurant.state,
      cnpj: restaurant.cnpj,
      active: restaurant.active,
      createdAt: restaurant.createdAt,
      owner: restaurant.users?.[0] || null,
      subscription: restaurant.subscription || null,
      status: getRestaurantStatus(restaurant),
      uptime: restaurant.active ? 100 : 0,
      price: restaurant.subscription?.plan ? PLAN_PRICES[restaurant.subscription.plan] : 0,
      revenue: revenueMap.get(restaurant.id) || 0,
      nextBillingAt: restaurant.subscription?.currentPeriodEnd ?? null,
    }));
  }
}

export default new ListRestaurantsService();
