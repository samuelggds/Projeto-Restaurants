import { OrderStatus, UserRole } from "@prisma/client";
import prisma from "../../../config/prisma.js";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

class GetCourierFinanceService {
  async execute({ courierId, restaurantId, role }: { courierId: number; restaurantId: number; role: string }) {
    if (String(role || "").toUpperCase() !== UserRole.MOTOQUEIRO) {
      throw new Error("Financeiro disponível somente para motoqueiros.");
    }
    const now = new Date();
    const today = startOfDay(now);
    const week = new Date(today);
    week.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const month = new Date(today.getFullYear(), today.getMonth(), 1);
    const baseWhere = {
      assignedCourierId: courierId,
      restaurantId,
      status: OrderStatus.ENTREGUE,
    } as const;

    const [todayData, weekData, monthData, pendingData, deliveries] = await Promise.all([
      prisma.order.aggregate({ where: { ...baseWhere, deliveredAt: { gte: today } }, _sum: { courierEarning: true }, _count: true }),
      prisma.order.aggregate({ where: { ...baseWhere, deliveredAt: { gte: week } }, _sum: { courierEarning: true }, _count: true }),
      prisma.order.aggregate({ where: { ...baseWhere, deliveredAt: { gte: month } }, _sum: { courierEarning: true }, _count: true }),
      prisma.order.aggregate({ where: { ...baseWhere, courierPaidAt: null }, _sum: { courierEarning: true }, _count: true }),
      prisma.order.findMany({
        where: baseWhere,
        select: { id: true, courierEarning: true, courierPaidAt: true, deliveredAt: true, deliveryStartedAt: true, city: true, district: true },
        orderBy: { deliveredAt: "desc" },
        take: 100,
      }),
    ]);

    const format = (entry: typeof todayData) => ({ amount: Number(entry._sum.courierEarning || 0), deliveries: entry._count });
    return {
      today: format(todayData),
      week: format(weekData),
      month: format(monthData),
      pending: format(pendingData),
      deliveries: deliveries.map((order) => ({ ...order, courierEarning: Number(order.courierEarning || 0) })),
    };
  }
}

export default new GetCourierFinanceService();
