import type { Prisma } from '@prisma/client';
import { CouponRedemptionStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

export async function reserveCouponRedemption({
  redemptionId,
  restaurantId,
  userId,
  db,
  now = new Date(),
}: {
  redemptionId: number | null;
  restaurantId: number;
  userId: number;
  db: PrismaClientLike;
  now?: Date;
}) {
  if (!redemptionId) return;
  const result = await db.couponRedemption.updateMany({
    where: {
      id: redemptionId,
      restaurantId,
      userId,
      status: CouponRedemptionStatus.CLAIMED,
      expiresAt: { gt: now },
    },
    data: {
      status: CouponRedemptionStatus.RESERVED,
      reservedAt: new Date(),
      usedAt: null,
    },
  });
  if (result.count !== 1) {
    const expired = await db.couponRedemption.updateMany({
      where: {
        id: redemptionId,
        restaurantId,
        userId,
        status: CouponRedemptionStatus.CLAIMED,
        expiresAt: { lte: now },
      },
      data: { status: CouponRedemptionStatus.EXPIRED },
    });
    if (expired.count === 1) {
      throw new Error('Este cupom expirou e não pode mais ser utilizado.');
    }
    throw new Error('Este cupom já foi reservado ou utilizado em outro pedido.');
  }
}

export async function markCouponRedemptionUsedForOrder(
  orderId: number | string,
  restaurantId: number,
  db: PrismaClientLike = prisma,
) {
  const order = await db.order.findFirst({
    where: { id: Number(orderId), restaurantId },
    select: { couponRedemptionId: true },
  });
  if (!order?.couponRedemptionId) return;

  const result = await db.couponRedemption.updateMany({
    where: {
      id: order.couponRedemptionId,
      restaurantId,
      status: CouponRedemptionStatus.RESERVED,
    },
    data: { status: CouponRedemptionStatus.USED, usedAt: new Date() },
  });
  if (result.count === 1) return;

  const current = await db.couponRedemption.findFirst({
    where: { id: order.couponRedemptionId, restaurantId },
    select: { status: true },
  });
  if (current?.status !== CouponRedemptionStatus.USED) {
    throw new Error('Não foi possível registrar o uso da recompensa deste pedido.');
  }
}

export async function releaseCouponRedemptionForOrder(
  orderId: number | string,
  restaurantId: number,
  db: PrismaClientLike = prisma,
  { now = new Date() }: { now?: Date } = {},
) {
  const order = await db.order.findFirst({
    where: { id: Number(orderId), restaurantId },
    select: { couponRedemptionId: true },
  });
  if (!order?.couponRedemptionId) return;

  const result = await db.couponRedemption.updateMany({
    where: {
      id: order.couponRedemptionId,
      restaurantId,
      status: CouponRedemptionStatus.RESERVED,
      expiresAt: { gt: now },
    },
    data: {
      status: CouponRedemptionStatus.CLAIMED,
      reservedAt: null,
      usedAt: null,
    },
  });
  if (result.count !== 1) {
    const expired = await db.couponRedemption.updateMany({
      where: {
        id: order.couponRedemptionId,
        restaurantId,
        status: CouponRedemptionStatus.RESERVED,
        expiresAt: { lte: now },
      },
      data: {
        status: CouponRedemptionStatus.EXPIRED,
        reservedAt: null,
        usedAt: null,
      },
    });
    if (expired.count === 1) {
      await db.order.updateMany({
        where: { id: Number(orderId), restaurantId },
        data: { couponRedemptionId: null },
      });
      return;
    }
    const current = await db.couponRedemption.findFirst({
      where: { id: order.couponRedemptionId, restaurantId },
      select: { status: true },
    });
    if (current?.status === CouponRedemptionStatus.USED) {
      return;
    }
    if (
      current?.status !== CouponRedemptionStatus.CLAIMED &&
      current?.status !== CouponRedemptionStatus.EXPIRED
    ) {
      throw new Error('Não foi possível liberar a recompensa deste pedido.');
    }
  }

  await db.order.updateMany({
    where: { id: Number(orderId), restaurantId },
    data: { couponRedemptionId: null },
  });
}
