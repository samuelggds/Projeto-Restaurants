import type { Response } from 'express';
import { ZodError } from 'zod';
import { couponValidationMessage } from '../../../validators/CouponValidator.js';

export function couponControllerError(res: Response, error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return res.status(422).json({
      error: couponValidationMessage(error),
      fields: error.flatten().fieldErrors,
    });
  }

  const message = error instanceof Error ? error.message : fallback;

  if (/não encontrad|indisponível|expirado/i.test(message)) {
    return res.status(404).json({ error: message });
  }

  if (
    /já existe|já foi resgatado|limite de resgates|possui resgates|não pode ser excluído/i.test(
      message,
    )
  ) {
    return res.status(409).json({ error: message });
  }

  if (/não pode ultrapassar|maior que zero|número inteiro|pelo menos/i.test(message)) {
    return res.status(422).json({ error: message });
  }

  if (/faltam? \d+ compras? concluídas?/i.test(message)) {
    return res.status(400).json({ error: message });
  }

  console.error('[coupons] unexpected error', error);
  return res.status(500).json({ error: fallback });
}
