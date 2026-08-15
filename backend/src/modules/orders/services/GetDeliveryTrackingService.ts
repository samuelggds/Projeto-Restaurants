import { UserRole } from "@prisma/client";
import prisma from "../../../config/prisma.js";

class GetDeliveryTrackingService {
  async execute({ orderId, userId, restaurantId, role }: { orderId: number | string; userId: number; restaurantId: number | null; role: string }) {
    const id = Number(orderId);
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true, userId: true, restaurantId: true, assignedCourierId: true,
        status: true, type: true, address: true, number: true, district: true,
        city: true, state: true, createdAt: true, deliveryStartedAt: true, deliveredAt: true,
        assignedCourier: { select: { id: true, name: true, phone: true, avatar: true } },
        restaurant: { select: { settings: { select: { averageDeliveryTime: true } } } },
      },
    });
    if (!order) throw new Error("Pedido não encontrado.");
    const normalizedRole = String(role || "").toUpperCase();
    const allowed =
      order.userId === userId ||
      (normalizedRole === UserRole.MOTOQUEIRO && order.assignedCourierId === userId) ||
      (normalizedRole === UserRole.ADMIN && order.restaurantId === restaurantId);
    if (!allowed) throw new Error("Você não pode acompanhar esta entrega.");

    const locations = await prisma.deliveryLocation.findMany({
      where: { orderId: id },
      orderBy: { recordedAt: "desc" },
      take: 1000,
      select: { latitude: true, longitude: true, heading: true, speed: true, accuracy: true, recordedAt: true },
    });
    locations.reverse();
    const preparationMinutes = Math.max(0, Number(order.restaurant.settings?.averageDeliveryTime || 0));
    const estimatedArrival = preparationMinutes
      ? new Date(order.createdAt.getTime() + preparationMinutes * 60_000).toISOString()
      : null;
    const { restaurant: _restaurant, ...trackingOrder } = order;
    return {
      order: { ...trackingOrder, estimatedArrival },
      locations: locations.map((point) => ({ ...point, latitude: Number(point.latitude), longitude: Number(point.longitude) })),
      latestLocation: locations.length
        ? { ...locations[locations.length - 1], latitude: Number(locations[locations.length - 1].latitude), longitude: Number(locations[locations.length - 1].longitude) }
        : null,
    };
  }
}

export default new GetDeliveryTrackingService();
