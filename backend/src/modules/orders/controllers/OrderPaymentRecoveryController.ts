import type { Request, Response } from 'express';
import getOrderPaymentRecoveryService from '../services/GetOrderPaymentRecoveryService.js';
import retryOrderCardPaymentService from '../services/RetryOrderCardPaymentService.js';
import { OrderRequestError } from '../domain/OrderRequestError.js';

function actorFromRequest(req: Request) {
  return {
    userId: req.user?.id ?? null,
    role: req.user?.role || 'CLIENTE',
    guestOrderId: req.guestOrderOwnership?.orderId ?? null,
    guestPublicId: req.guestOrderOwnership?.publicId ?? null,
    guestOwnershipToken: Array.isArray(req.headers['x-guest-order-ownership'])
      ? req.headers['x-guest-order-ownership'][0]
      : String(req.headers['x-guest-order-ownership'] || ''),
  };
}

class OrderPaymentRecoveryController {
  async get(req: Request, res: Response) {
    try {
      const payment = await getOrderPaymentRecoveryService.execute(
        req.params.publicId,
        actorFromRequest(req),
      );
      return res.status(200).json(payment);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível recuperar este pagamento.';
      const status = /não encontrado|pedido inválido|não pode acessar/i.test(message) ? 404 : 400;
      return res.status(status).json({ error: message });
    }
  }

  async retryCard(req: Request, res: Response) {
    try {
      const result = await retryOrderCardPaymentService.execute(
        req.params.publicId,
        actorFromRequest(req),
        {
          paymentMethodId: req.body?.paymentMethodId,
          cardToken: req.body?.cardToken,
          cardPaymentMethodId: req.body?.cardPaymentMethodId,
          encryptedCard: req.body?.encryptedCard,
          cardData: req.body?.cardData,
          holderName: req.body?.holderName,
          holderTaxId: req.body?.holderTaxId,
          payerEmail: req.user?.email || req.body?.payerEmail,
          mercadoPagoDeviceId: req.body?.mercadoPagoDeviceId,
          expMonth: req.body?.expMonth,
          expYear: req.body?.expYear,
          billingPostalCode: req.body?.billingPostalCode,
          billingAddressNumber: req.body?.billingAddressNumber,
          customerIp: req.ip,
          successUrl: req.body?.successUrl,
        },
      );
      return res.status(200).json(result);
    } catch (error: unknown) {
      if (error instanceof OrderRequestError) {
        return res.status(error.statusCode).json({
          error: error.message,
          code: error.code,
          ...(error.details || {}),
          requestId: req.requestId,
        });
      }
      return res.status(500).json({
        error: 'Não foi possível tentar o pagamento novamente agora.',
        requestId: req.requestId,
      });
    }
  }
}

export default new OrderPaymentRecoveryController();
