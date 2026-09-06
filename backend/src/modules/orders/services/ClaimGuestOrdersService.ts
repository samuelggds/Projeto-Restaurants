import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { verifyGuestOrderOwnershipToken } from '../utils/guestOrderOwnershipToken.js';

type GuestOrderProof = {
  orderId?: number | string;
  token?: string;
};

type ClaimGuestOrdersInput = {
  requesterUserId: number | string;
  requesterRole: string;
  requesterRestaurantId?: number | string | null;
  proofs: GuestOrderProof[];
};

class ClaimGuestOrdersService {
  async execute({
    requesterUserId,
    requesterRole,
    requesterRestaurantId,
    proofs,
  }: ClaimGuestOrdersInput) {
    const userId = Number(requesterUserId || 0);
    const currentRestaurantId = Number(requesterRestaurantId || 0);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('Usuário inválido para recuperar pedidos de visitante.');
    }
    if (String(requesterRole || '').toUpperCase() !== 'CLIENTE') {
      throw new Error('Somente uma conta de cliente pode recuperar pedidos de visitante.');
    }

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
      return { claimedCount: 0, orderIds: [], restaurantId: currentRestaurantId || null };
    }

    const verified = [...uniqueProofs.entries()].flatMap(([orderId, token]) => {
      try {
        return [verifyGuestOrderOwnershipToken(token, orderId)];
      } catch {
        return [];
      }
    });
    if (!verified.length) {
      return { claimedCount: 0, orderIds: [], restaurantId: currentRestaurantId || null };
    }

    const candidates = await prisma.order.findMany({
      where: {
        OR: verified.map((proof) => ({ id: proof.orderId, publicId: proof.publicId })),
      },
      select: {
        id: true,
        publicId: true,
        restaurantId: true,
        userId: true,
        user: { select: { email: true, phone: true, cpf: true } },
      },
    });

    const proofByOrderId = new Map(verified.map((proof) => [proof.orderId, proof.publicId]));
    const safeCandidates = candidates.filter(
      (order) => proofByOrderId.get(order.id) === order.publicId,
    );
    if (!safeCandidates.length) {
      return { claimedCount: 0, orderIds: [], restaurantId: currentRestaurantId || null };
    }

    const targetRestaurantId =
      currentRestaurantId > 0 ? currentRestaurantId : Number(safeCandidates[0].restaurantId);
    const sameTenantOrders = safeCandidates.filter(
      (order) => Number(order.restaurantId) === targetRestaurantId,
    );

    const result = await prisma.$transaction(async (tx) => {
      await setTenantDbContext(tx, targetRestaurantId);
      const account = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, restaurantId: true, phone: true, cpf: true },
      });
      if (!account) throw new Error('Conta de cliente não encontrada.');
      if (account.restaurantId && Number(account.restaurantId) !== targetRestaurantId) {
        throw new Error('Os pedidos encontrados pertencem a outro restaurante.');
      }

      const claimedIds: number[] = [];
      let inheritedPhone = account.phone;
      let inheritedCpf = account.cpf;

      for (const order of sameTenantOrders) {
        if (order.userId === userId) {
          claimedIds.push(order.id);
          continue;
        }

        const isSyntheticGuest = String(order.user?.email || '').startsWith(
          `guest.${targetRestaurantId}.`,
        );
        if (!isSyntheticGuest) continue;

        const updated = await tx.order.updateMany({
          where: {
            id: order.id,
            restaurantId: targetRestaurantId,
            userId: order.userId,
          },
          data: { userId },
        });
        if (updated.count !== 1) continue;

        await tx.orderIssueThread.updateMany({
          where: { orderId: order.id, restaurantId: targetRestaurantId },
          data: { userId },
        });
        inheritedPhone ||= order.user?.phone || null;
        inheritedCpf ||= order.user?.cpf || null;
        claimedIds.push(order.id);
      }

      await tx.user.update({
        where: { id: userId },
        data: {
          restaurantId: targetRestaurantId,
          ...(account.phone ? {} : inheritedPhone ? { phone: inheritedPhone } : {}),
          ...(account.cpf ? {} : inheritedCpf ? { cpf: inheritedCpf } : {}),
        },
      });

      return claimedIds;
    });

    return {
      claimedCount: result.length,
      orderIds: result,
      restaurantId: targetRestaurantId,
      ignoredCount: Math.max(0, uniqueProofs.size - result.length),
    };
  }
}

export default new ClaimGuestOrdersService();
