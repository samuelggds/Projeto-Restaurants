import type { Request, Response } from 'express';
import getOrderPixPaymentRecoveryService from '../services/GetOrderPixPaymentRecoveryService.js';
import finalizeOrderPixPaymentService from '../services/FinalizeOrderPixPaymentService.js';
import { safeErrorName } from '../../../services/telemetrySanitizer.js';

function actorFromRequest(req: Request) {
  return {
    userId: req.user?.id ?? null,
    role: req.user?.role || 'CLIENTE',
    guestOrderId: req.guestOrderOwnership?.orderId ?? null,
    guestPublicId: req.guestOrderOwnership?.publicId ?? null,
  };
}

class OrderPixPaymentRecoveryController {
  async get(req: Request, res: Response) {
    try {
      const payment = await getOrderPixPaymentRecoveryService.execute(
        req.params.publicId,
        actorFromRequest(req),
      );
      return res.status(200).json(payment);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível recuperar este pagamento PIX.';
      const status = /não pode acessar|pedido não encontrado|pedido inválido/i.test(message) ? 404 : 400;
      return res.status(status).json({ error: message });
    }
  }

  async confirm(req: Request, res: Response) {
    // A recuperação contém dados financeiros e não deve ficar em caches HTTP.
    res.setHeader('Cache-Control', 'no-store');
    let payment: Awaited<ReturnType<typeof getOrderPixPaymentRecoveryService.execute>>;
    try {
      payment = await getOrderPixPaymentRecoveryService.execute(
        req.params.publicId,
        actorFromRequest(req),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Não foi possível recuperar este pagamento PIX.';
      const status = /não pode acessar|pedido não encontrado|pedido inválido/i.test(message)
        ? 404
        : 400;
      return res.status(status).json({ error: message });
    }

    if (payment.paid === true || payment.isApproved !== true || !payment.paymentId) {
      return res.status(200).json(payment);
    }

    try {
      const order = await finalizeOrderPixPaymentService.execute({
        orderId: payment.orderId,
        paymentId: payment.paymentId,
        restaurantId: payment.restaurantId,
      });

      return res.status(200).json({
        ...payment,
        paid: order?.paid === true,
        paidAt: order?.paidAt || payment.paidAt || null,
        orderStatus: order?.status || payment.orderStatus,
        status: order?.paid === true ? 'paid' : payment.status,
        isApproved: order?.paid === true ? true : payment.isApproved,
      });
    } catch (error: unknown) {
      // O provedor pode ter aprovado o pagamento enquanto o PostgreSQL estava
      // indisponível. Nunca presumir estorno ou induzir a uma nova cobrança.
      console.error('[PIX_RECOVERY_RECONCILIATION_PENDING]', {
        orderId: payment.orderId,
        restaurantId: payment.restaurantId,
        requestId: req.requestId,
        errorType: safeErrorName(error),
      });
      res.setHeader('Retry-After', '5');
      return res.status(503).json({
        error: 'Não foi possível concluir a confirmação agora. Consulte este mesmo pedido novamente, sem iniciar outro pagamento.',
        code: 'PIX_PAYMENT_RECONCILIATION_PENDING',
        reconciliationRequired: true,
        orderId: payment.orderId,
        orderPublicId: payment.orderPublicId,
        requestId: req.requestId,
      });
    }
  }
}

export default new OrderPixPaymentRecoveryController();
