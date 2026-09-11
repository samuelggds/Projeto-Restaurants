import type { Request, Response } from 'express';
import { z } from 'zod';
import platformRecurringBillingService from '../services/PlatformRecurringBillingService.js';

const cardSchema = z.object({
  cardToken: z.string().trim().min(8).max(2048),
  brand: z.string().trim().min(2).max(32),
  last4: z.string().regex(/^\d{4}$/),
  expMonth: z.coerce.number().int().min(1).max(12),
  expYear: z.coerce.number().int().min(new Date().getFullYear()).max(new Date().getFullYear() + 30),
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
        error: error instanceof Error ? error.message : 'Não foi possível carregar a forma de cobrança.',
      });
    }
  }

  config(req: Request, res: Response) {
    try {
      return res.json(platformRecurringBillingService.getPublicConfig());
    } catch (error) {
      return res.status(503).json({
        error: error instanceof Error ? error.message : 'Cobrança recorrente indisponível.',
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
      const profile = await platformRecurringBillingService.enableCard({
        restaurantId: id,
        ...parsed.data,
      });
      return res.status(200).json(profile);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível ativar a cobrança automática.',
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
        error: error instanceof Error ? error.message : 'Não foi possível alterar a forma de cobrança.',
      });
    }
  }
}

export default new PlatformRecurringBillingController();
