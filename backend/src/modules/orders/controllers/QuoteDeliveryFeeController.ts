import type { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import { resolveOrderRestaurantId } from '../utils/orderTenant.js';
import resolveDeliveryDistanceService from '../services/ResolveDeliveryDistanceService.js';
import deliveryFeeByDistanceService from '../services/DeliveryFeeByDistanceService.js';

const schema = z.strictObject({
  restaurantId: z.number().int().positive(),
  type: z.literal('DELIVERY'),
  address: z.string().trim().min(3).max(180),
  number: z.string().trim().min(1).max(30),
  district: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().length(2),
});

class QuoteDeliveryFeeController {
  async handle(req: Request, res: Response) {
    res.setHeader('Cache-Control', 'no-store, private');
    try {
      const input = schema.parse(req.body);
      const restaurantId = resolveOrderRestaurantId({
        requestedRestaurantId: input.restaurantId,
        contextRestaurantId: req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null,
      });
      const settings = await withTenantDbContext(restaurantId, (db) =>
        db.restaurantSettings.findUnique({
          where: { restaurantId },
          select: { acceptsDelivery: true, deliveryFeeMode: true, deliveryFee: true },
        }),
      );
      if (!settings?.acceptsDelivery) return res.status(409).json({ error: 'Entrega indisponível neste restaurante.' });
      if (settings.deliveryFeeMode !== 'DISTANCE') {
        return res.json({ mode: 'FIXED', deliveryFeeAmount: Math.max(0, Number(settings.deliveryFee || 0)), deliveryDistanceMeters: null });
      }
      const distanceMeters = await resolveDeliveryDistanceService.execute({
        restaurantId,
        destination: {
          address: input.address, number: input.number, district: input.district,
          city: input.city, state: input.state,
        },
      });
      if (distanceMeters === null) {
        return res.status(422).json({ error: 'Não foi possível calcular a rota. Confira o endereço completo ou tente novamente.' });
      }
      const range = await withTenantDbContext(restaurantId, (db) =>
        deliveryFeeByDistanceService.calculate({ restaurantId, distanceMeters, db }),
      );
      return res.json({ mode: 'DISTANCE', deliveryFeeAmount: range.deliveryFeeAmount, deliveryDistanceMeters: distanceMeters });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(422).json({ error: 'Informe o endereço completo para calcular a entrega.' });
      const message = error instanceof Error ? error.message : 'Não foi possível consultar a taxa.';
      return res.status(422).json({ error: message });
    }
  }
}

export default new QuoteDeliveryFeeController();
