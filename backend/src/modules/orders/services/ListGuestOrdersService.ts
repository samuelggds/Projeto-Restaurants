import prisma from '../../../config/prisma.js';
import { verifyGuestOrderOwnershipToken } from '../utils/guestOrderOwnershipToken.js';

type GuestOrderProof = {
  orderId?: number | string;
  token?: string;
};

type ListGuestOrdersInput = {
  proofs: GuestOrderProof[];
  restaurantId?: number | string | null;
  search?: string | null;
};

function normalizeSearch(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizePhone(value: unknown) {
  return String(value || '').replace(/\D/gu, '');
}

class ListGuestOrdersService {
  async execute({ proofs, restaurantId, search }: ListGuestOrdersInput) {
    const uniqueProofs = new Map<number, string>();

    for (const proof of Array.isArray(proofs) ? proofs.slice(0, 50) : []) {
      const orderId = Number(proof?.orderId || 0);
      const token = String(proof?.token || '').trim();

      if (!Number.isInteger(orderId) || orderId <= 0 || !token || uniqueProofs.has(orderId)) {
        continue;
      }

      uniqueProofs.set(orderId, token);
    }

    if (!uniqueProofs.size) {
      return { orders: [], total: 0 };
    }

    const verified = [...uniqueProofs.entries()].flatMap(([orderId, token]) => {
      try {
        return [verifyGuestOrderOwnershipToken(token, orderId)];
      } catch {
        return [];
      }
    });

    if (!verified.length) {
      return { orders: [], total: 0 };
    }

    const normalizedRestaurantId = Number(restaurantId || 0);
    const orders = await prisma.order.findMany({
      where: {
        OR: verified.map((proof) => ({
          id: proof.orderId,
          publicId: proof.publicId,
        })),
        ...(Number.isInteger(normalizedRestaurantId) && normalizedRestaurantId > 0
          ? { restaurantId: normalizedRestaurantId }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        publicId: true,
        restaurantId: true,
        status: true,
        type: true,
        total: true,
        paid: true,
        paymentMethod: true,
        createdAt: true,
        updatedAt: true,
        deliveryStartedAt: true,
        deliveredAt: true,
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            phone: true,
          },
        },
        items: {
          select: {
            quantity: true,
            product: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    const publicIdByOrder = new Map(verified.map((proof) => [proof.orderId, proof.publicId]));
    const query = normalizeSearch(search);
    const queryDigits = normalizePhone(search);

    const safeOrders = orders
      .filter((order) => publicIdByOrder.get(order.id) === order.publicId)
      .filter((order) => {
        if (!query) return true;

        const byOrder =
          String(order.id).includes(query) ||
          String(order.publicId || '')
            .toLowerCase()
            .includes(query);
        const orderPhone = normalizePhone(order.user?.phone);
        const byPhone = queryDigits.length >= 4 && orderPhone.includes(queryDigits);

        return byOrder || byPhone;
      })
      .map(({ user: _user, ...order }) => ({
        ...order,
        total: Number(order.total || 0),
      }));

    return {
      orders: safeOrders,
      total: safeOrders.length,
    };
  }
}

export default new ListGuestOrdersService();
