import type { Request, Response } from 'express';
import { z } from 'zod';
import googleAddressGeocodingService from '../services/GoogleAddressGeocodingService.js';
import { resolveOrderRestaurantId } from '../utils/orderTenant.js';

const schema = z.object({
  restaurantId: z.coerce.number().int().positive(),
  type: z.literal('DELIVERY').default('DELIVERY'),
  address: z.string().trim().min(3).max(180),
  number: z.string().trim().min(1).max(30),
  district: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  zipCode: z
    .string()
    .trim()
    .max(10)
    .optional()
    .transform((value) => String(value || '').replace(/\D/g, '')),
});

class GetDeliveryAddressLocationController {
  async handle(req: Request, res: Response) {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Preencha o endereço completo para localizar no mapa.',
        code: 'ADDRESS_INCOMPLETE',
      });
    }

    resolveOrderRestaurantId({
      requestedRestaurantId: parsed.data.restaurantId,
      contextRestaurantId: req.user?.restaurantId ?? req.tableSession?.restaurantId ?? null,
    });

    const location = await googleAddressGeocodingService.execute(parsed.data);
    if (!location) {
      return res.status(422).json({
        error: 'Não foi possível localizar este endereço no mapa.',
        code: 'ADDRESS_NOT_GEOCODED',
      });
    }

    return res.status(200).json({ location });
  }
}

export default new GetDeliveryAddressLocationController();
