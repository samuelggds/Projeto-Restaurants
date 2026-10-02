import { Request, Response } from 'express';
import getPublicCardPaymentConfigService from '../services/GetPublicCardPaymentConfigService.js';
import { safeErrorSummary } from '../../../services/telemetrySanitizer.js';

class GetPublicCardPaymentConfigController {
  async handle(req: Request, res: Response) {
    try {
      const config = await getPublicCardPaymentConfigService.execute(String(req.params.restaurantId));
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(config);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '';
      if (
        /Restaurante inválido|Pagamento com cartão não (?:está configurado|está habilitado)|temporariamente indisponível|ainda não foi configurado|conexão Mercado Pago.*precisa ser atualizada/iu.test(
          message,
        )
      ) {
        return res.status(400).json({ error: message });
      }

      console.error('[PUBLIC_CARD_PAYMENT_CONFIG_ERROR]', {
        requestId: req.requestId,
        error: safeErrorSummary(error),
      });
      return res.status(500).json({
        error: 'Pagamento com cartão indisponível no momento.',
        requestId: req.requestId,
      });
    }
  }
}

export default new GetPublicCardPaymentConfigController();