import { OrderStatus, UserRole } from '@prisma/client';
import courierAccessService from './CourierAccessService.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { getRestaurantPeriodBoundaries } from '../../courierCompensation/domain/restaurantTimePeriods.js';

class GetCourierFinanceService {
  async execute({
    courierId,
    restaurantId,
    role,
  }: {
    courierId: number;
    restaurantId: number;
    role: string;
  }) {
    if (String(role || '').toUpperCase() !== UserRole.MOTOQUEIRO) {
      throw new Error('Financeiro disponível somente para motoqueiros.');
    }
    await courierAccessService.assertActiveCourier(courierId, restaurantId);
    return withTenantDbContext(restaurantId, async (db) => {
      const settings = await db.restaurantSettings.findUnique({
        where: { restaurantId },
        select: { timezone: true },
      });
      const periods = getRestaurantPeriodBoundaries(
        new Date(),
        settings?.timezone || 'America/Sao_Paulo',
      );
      const baseWhere = {
        assignedCourierId: courierId,
        restaurantId,
        status: OrderStatus.ENTREGUE,
      } as const;

      const [todayData, weekData, monthData, pendingData, deliveries, pendingSettlements] =
        await Promise.all([
          db.order.aggregate({
            where: { ...baseWhere, deliveredAt: periods.today },
            _sum: { courierEarning: true },
            _count: true,
          }),
          db.order.aggregate({
            where: { ...baseWhere, deliveredAt: periods.week },
            _sum: { courierEarning: true },
            _count: true,
          }),
          db.order.aggregate({
            where: { ...baseWhere, deliveredAt: periods.month },
            _sum: { courierEarning: true },
            _count: true,
          }),
          db.order.aggregate({
            where: { ...baseWhere, courierPaidAt: null },
            _sum: { courierEarning: true },
            _count: true,
          }),
          db.order.findMany({
            where: baseWhere,
            select: {
              id: true,
              courierEarning: true,
              courierPaidAt: true,
              deliveredAt: true,
              deliveryStartedAt: true,
              deliveryDistanceMeters: true,
              courierCompensationModel: true,
              city: true,
              district: true,
              courierSettlementItems: {
                where: { restaurantId, active: true },
                select: {
                  settlement: { select: { publicId: true, status: true } },
                },
                take: 1,
              },
            },
            orderBy: { deliveredAt: 'desc' },
            take: 100,
          }),
          db.courierSettlement.count({
            where: {
              restaurantId,
              courierId,
              status: 'AWAITING_COURIER_CONFIRMATION',
            },
          }),
        ]);

      const format = (entry: typeof todayData) => ({
        amount: Number(entry._sum.courierEarning || 0),
        deliveries: entry._count,
      });
      return {
        timezone: periods.timeZone,
        today: format(todayData),
        week: format(weekData),
        month: format(monthData),
        pending: format(pendingData),
        pendingSettlements,
        deliveries: deliveries.map(({ courierSettlementItems, ...order }) => ({
          ...order,
          courierEarning: Number(order.courierEarning || 0),
          settlement: courierSettlementItems[0]?.settlement || null,
          financeStatus: order.courierPaidAt
            ? 'PAID'
            : courierSettlementItems[0]?.settlement.status || 'PENDING',
        })),
      };
    });
  }
}

export default new GetCourierFinanceService();
