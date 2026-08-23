import type { Prisma } from '@prisma/client';
import { CouponRedemptionStatus, OrderType } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import productRepository from '../../products/repositories/ProductRepository.js';
import { roundMoney } from '../../products/utils/productDiscount.js';
import { buildOrderItemCustomizationSnapshot } from '../utils/productIngredients.js';

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

export type PricingItemInput = {
  productId?: number;
  quantity?: number;
  observation?: string;
  ingredientIds?: number[];
  optionIds?: number[];
  selectedOptions?: Array<{ groupId?: number; optionIds?: number[] }>;
};

type QuotePayload = {
  restaurantId: number;
  userId?: number | string | null;
  type: OrderType | string;
  items: PricingItemInput[];
  couponRedemptionId?: number | string | null;
  now?: Date;
  db?: PrismaClientLike;
};

class OrderPricingService {
  async quote({
    restaurantId,
    userId,
    type,
    items,
    couponRedemptionId,
    now = new Date(),
    db = prisma,
  }: QuotePayload) {
    const normalizedRestaurantId = Number(restaurantId);
    if (!Number.isInteger(normalizedRestaurantId) || normalizedRestaurantId <= 0) {
      throw new Error('Restaurante inválido para calcular o pedido.');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('O pedido deve conter pelo menos um item.');
    }

    const products = await Promise.all(
      items.map((item) =>
        productRepository.findById(Number(item.productId), normalizedRestaurantId, db),
      ),
    );

    const requestedQuantityByProduct = new Map<number, number>();
    products.forEach((product, index) => {
      const item = items[index];
      if (!product) {
        throw new Error(`Produto não encontrado: ${Number(item.productId || 0)}`);
      }
      if (product.active === false) {
        throw new Error(`Produto indisponível: ${product.name}`);
      }
      const quantity = Number(item.quantity || 0);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`Quantidade inválida para ${product.name}.`);
      }
      requestedQuantityByProduct.set(
        product.id,
        (requestedQuantityByProduct.get(product.id) || 0) + quantity,
      );
    });

    requestedQuantityByProduct.forEach((requestedQuantity, productId) => {
      const product = products.find((candidate) => candidate?.id === productId)!;
      const stock =
        product.stock === null || product.stock === undefined ? null : Number(product.stock);
      if (Number.isInteger(stock) && stock >= 0 && requestedQuantity > stock) {
        throw new Error(`Estoque insuficiente para ${product.name}. Disponível: ${stock}.`);
      }
    });

    const orderItems = items.map((item, index) =>
      buildOrderItemCustomizationSnapshot(products[index]!, item),
    );
    const itemsSubtotal = roundMoney(
      orderItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    );
    const productDiscountTotal = roundMoney(
      orderItems.reduce((sum, item) => sum + Number(item.unitDiscount) * item.quantity, 0),
    );

    const settings = await db.restaurantSettings.findUnique({
      where: { restaurantId: normalizedRestaurantId },
      select: { deliveryFee: true, minimumOrder: true },
    });
    const normalizedType = String(type || '').toUpperCase();
    const deliveryFeeAmount =
      normalizedType === OrderType.DELIVERY
        ? roundMoney(Math.max(Number(settings?.deliveryFee || 0), 0))
        : 0;
    const minimumOrder = Math.max(Number(settings?.minimumOrder || 0), 0);
    if (normalizedType === OrderType.DELIVERY && minimumOrder > 0 && itemsSubtotal < minimumOrder) {
      throw new Error(
        `Pedido mínimo após as ofertas: R$ ${minimumOrder.toFixed(2)}. A taxa de entrega é cobrada à parte.`,
      );
    }

    let couponDiscount = 0;
    let couponCode: string | null = null;
    let couponId: number | null = null;
    let redemptionId: number | null = null;
    const requestedRedemptionId = Number(couponRedemptionId || 0);
    if (requestedRedemptionId > 0) {
      const normalizedUserId = Number(userId || 0);
      if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
        throw new Error('Entre na sua conta para usar uma recompensa de fidelidade.');
      }

      const redemption = await db.couponRedemption.findFirst({
        where: {
          id: requestedRedemptionId,
          restaurantId: normalizedRestaurantId,
          userId: normalizedUserId,
          status: CouponRedemptionStatus.CLAIMED,
          expiresAt: { gt: now },
        },
        include: { coupon: true },
      });
      if (!redemption || redemption.coupon.restaurantId !== normalizedRestaurantId) {
        throw new Error('Cupom resgatado inválido ou indisponível.');
      }

      const coupon = redemption.coupon;
      if (itemsSubtotal < Number(coupon.minimumSubtotal || 0)) {
        throw new Error(
          `Este cupom exige subtotal mínimo de R$ ${Number(coupon.minimumSubtotal).toFixed(2)}.`,
        );
      }

      const configuredDiscount = Number(coupon.discount || 0);
      const rawDiscount =
        coupon.discountType === 'PERCENTAGE'
          ? itemsSubtotal * (Math.min(configuredDiscount, 100) / 100)
          : configuredDiscount;
      const limitedDiscount = coupon.maxDiscount
        ? Math.min(rawDiscount, Number(coupon.maxDiscount))
        : rawDiscount;
      const maximumCouponDiscount = Math.max(itemsSubtotal - 0.01, 0);
      couponDiscount = roundMoney(
        Math.min(Math.max(limitedDiscount, 0), maximumCouponDiscount),
      );
      if (couponDiscount <= 0) {
        throw new Error(
          'Este cupom não gera desconto neste pedido. Escolha outro benefício ou aumente o subtotal.',
        );
      }
      couponCode = coupon.code;
      couponId = coupon.id;
      redemptionId = redemption.id;
    } else if (couponRedemptionId !== null && couponRedemptionId !== undefined && couponRedemptionId !== '') {
      throw new Error('Cupom resgatado inválido.');
    }

    const total = roundMoney(Math.max(itemsSubtotal - couponDiscount + deliveryFeeAmount, 0));

    return {
      itemsSubtotal,
      productDiscountTotal,
      couponDiscount,
      deliveryFeeAmount,
      total,
      couponCode,
      couponId,
      couponRedemptionId: redemptionId,
      orderItems,
      products,
    };
  }
}

export default new OrderPricingService();
