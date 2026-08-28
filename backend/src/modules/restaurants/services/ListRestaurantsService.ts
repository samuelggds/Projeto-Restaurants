import prisma from '../../../config/prisma.js';
import restaurantRepository from '../repositories/RestaurantRepository.js';
import platformPlanCatalogService from '../../billing/services/PlatformPlanCatalogService.js';

type ListedRestaurant = Awaited<ReturnType<typeof restaurantRepository.listAll>>[number];

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

export class ListRestaurantsService {
  constructor(
    private readonly repository: Pick<
      typeof restaurantRepository,
      'listAll'
    > = restaurantRepository,
    private readonly database: Pick<typeof prisma, 'order'> = prisma,
    private readonly planCatalog: Pick<
      typeof platformPlanCatalogService,
      'list'
    > = platformPlanCatalogService,
  ) {}

  async execute() {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [restaurants, revenueByRestaurant, plans] = await Promise.all([
      this.repository.listAll(),
      this.database.order.groupBy({
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
      }),
      this.planCatalog.list({ activeOnly: false }),
    ]);

    const revenueMap = new Map(
      revenueByRestaurant.map((item) => [item.restaurantId, Number(item._sum.total || 0)]),
    );
    const priceByPlan = new Map(plans.map((plan) => [plan.plan, plan.monthlyFee]));

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
      price: restaurant.subscription?.plan
        ? (priceByPlan.get(restaurant.subscription.plan) ?? null)
        : null,
      revenue: revenueMap.get(restaurant.id) || 0,
      nextBillingAt: restaurant.subscription?.currentPeriodEnd ?? null,
    }));
  }
}

export default new ListRestaurantsService();
