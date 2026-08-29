import type { Request, Response } from 'express';
import { OrderType } from '@prisma/client';
import { z } from 'zod';
import orderPricingService from '../services/OrderPricingService.js';
import resolveDeliveryDistanceService from '../services/ResolveDeliveryDistanceService.js';
import { resolveOrderRestaurantId } from '../utils/orderTenant.js';

class QuoteOrderController {
  async handle(req: Request, res: Response) {
    try {
      const {
        restaurantId,
        type,
        items,
        couponRedemptionId,
        address,
        number,
        district,
        city,
        state,
      } = req.body;
      const resolvedRestaurantId = resolveOrderRestaurantId({
        requestedRestaurantId: restaurantId,
        contextRestaurantId: req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null,
      });
      const parsed = z
        .object({
          type: z.nativeEnum(OrderType),
          couponRedemptionId: z.number().int().positive().nullable().optional(),
          address: z.string().trim().max(180).optional(),
          number: z.string().trim().max(30).optional(),
          district: z.string().trim().max(100).optional(),
          city: z.string().trim().max(100).optional(),
          state: z.string().trim().max(2).optional(),
          items: z
            .array(
              z.object({
                productId: z.number().int().positive(),
                quantity: z.number().int().positive(),
                observation: z.string().trim().max(500).optional(),
                ingredientIds: z.array(z.number().int().positive()).max(40).optional(),
                optionIds: z.array(z.number().int().positive()).max(100).optional(),
                selectedOptions: z
                  .array(
                    z.object({
                      groupId: z.number().int().positive(),
                      optionIds: z.array(z.number().int().positive()).max(40),
                    }),
                  )
                  .max(20)
                  .optional(),
              }),
            )
            .min(1),
        })
        .parse({
          type,
          items,
          couponRedemptionId,
          address,
          number,
          district,
          city,
          state,
        });

      const deliveryDistanceMeters =
        parsed.type === OrderType.DELIVERY
          ? await resolveDeliveryDistanceService.execute({
              restaurantId: resolvedRestaurantId,
              destination: {
                address: parsed.address,
                number: parsed.number,
                district: parsed.district,
                city: parsed.city,
                state: parsed.state,
              },
            })
          : null;

      const quote = await orderPricingService.quote({
        restaurantId: resolvedRestaurantId,
        userId: req.user?.id,
        type: parsed.type,
        items: parsed.items,
        couponRedemptionId: parsed.couponRedemptionId,
        deliveryDistanceMeters,
      });

      return res.status(200).json({
        itemsSubtotal: quote.itemsSubtotal,
        productDiscountTotal: quote.productDiscountTotal,
        couponDiscount: quote.couponDiscount,
        deliveryFeeAmount: quote.deliveryFeeAmount,
        deliveryDistanceMeters: quote.deliveryDistanceMeters,
        total: quote.total,
        couponCode: quote.couponCode,
      });
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível calcular o pedido.',
      });
    }
  }
}

export default new QuoteOrderController();
