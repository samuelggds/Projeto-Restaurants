import type { Request, Response } from 'express';
import { z } from 'zod';
import platformRecurringBillingService from '../services/PlatformRecurringBillingService.js';
import { recurringBillingError } from '../utils/recurringBillingError.js';

const cardSchema = z.object({
  cardToken: z.string().trim().min(8).max(2048),
  brand: z.string().trim().min(2).max(32),
  last4: z.string().regex(/^\d{4}$/),
  expMonth: z.coerce.number().int().min(1).max(12),
  expYear: z.coerce
    .number()
    .int()
    .min(new Date().getFullYear())
    .max(new Date().getFullYear() + 30),
});

function restaurantId(req: Request) {
  const value = Number(req.user?.restaurantId);
  return Number.isInteger(value) && value > 0 ? value : null;
}

class PlatformRecurringBillingController {
  async profile(req: Request, res: Response) {
    const id = restaurantId(req);
    if (!id) return res.status(400).json({ error: 'Restaurante inválido.' });
    try {
      return res.json(await platformRecurringBillingService.getProfile(id));
    } catch (error) {
      return res.status(500).json({
        error: recurringBillingError(
          error,
          'Não foi possível carregar a forma de cobrança. Tente novamente em instantes.',
        ),
      });
    }
  }

  config(req: Request, res: Response) {
    try {
      return res.json(platformRecurringBillingService.getPublicConfig());
    } catch (error) {
      return res.status(503).json({
        error: recurringBillingError(
          error,
          'O cadastro de cartão está indisponível no momento. Tente novamente em instantes.',
        ),
      });
    }
  }

  async card(req: Request, res: Response) {
    const id = restaurantId(req);
    if (!id) return res.status(400).json({ error: 'Restaurante inválido.' });
    const parsed = cardSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Confira os dados do cartão e tente novamente.' });
    }

    try {
      const { cardToken, brand, last4, expMonth, expYear } = parsed.data;
      if (!cardToken || !brand || !last4 || !expMonth || !expYear) {
        return res.status(400).json({ error: 'Confira os dados do cartão e tente novamente.' });
      }
      const profile = await platformRecurringBillingService.enableCard({
        restaurantId: id,
        cardToken,
        brand,
        last4,
        expMonth,
        expYear,
      });
      return res.status(200).json(profile);
    } catch (error) {
      return res.status(400).json({
        error: recurringBillingError(
          error,
          'Não foi possível ativar a cobrança automática. Confira o cartão e tente novamente.',
        ),
      });
    }
  }

  async pix(req: Request, res: Response) {
    const id = restaurantId(req);
    if (!id) return res.status(400).json({ error: 'Restaurante inválido.' });
    try {
      return res.json(await platformRecurringBillingService.usePix(id));
    } catch (error) {
      return res.status(400).json({
        error: recurringBillingError(
          error,
          'Não foi possível alterar a forma de cobrança. Tente novamente em instantes.',
        ),
      });
    }
  }
}

export default new PlatformRecurringBillingController();
