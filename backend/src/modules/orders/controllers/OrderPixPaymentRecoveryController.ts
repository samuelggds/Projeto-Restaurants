import type { Request, Response } from 'express';
import getOrderPixPaymentRecoveryService from '../services/GetOrderPixPaymentRecoveryService.js';
import finalizeOrderPixPaymentService from '../services/FinalizeOrderPixPaymentService.js';

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
    try {
      const payment = await getOrderPixPaymentRecoveryService.execute(
        req.params.publicId,
        actorFromRequest(req),
      );

      if (payment.paid === true) {
        return res.status(200).json(payment);
      }
      if (payment.isApproved !== true || !payment.paymentId) {
        return res.status(200).json(payment);
      }

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
      const message =
        error instanceof Error ? error.message : 'Não foi possível confirmar este pagamento PIX.';
      const status = /não pode acessar|pedido não encontrado|pedido inválido/i.test(message) ? 404 : 400;
      return res.status(status).json({ error: message });
    }
  }
}

export default new OrderPixPaymentRecoveryController();
