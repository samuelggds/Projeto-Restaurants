import type { Request, Response } from 'express';
import orderRepository from '../repositories/OrderRepository.js';

function frontendBase() {
  const value = String(process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\//iu.test(value)) {
    throw new Error('FRONTEND_URL HTTPS não configurada.');
  }
  return value;
}

class EfiOpenFinanceReturnController {
  async handle(req: Request, res: Response) {
    try {
      const identifier = String(req.query.identificadorPagamento || '').trim();
      if (!identifier) return res.status(400).send('Pagamento Open Finance inválido.');

      const paymentId = `efi_open_finance:${identifier}`;
      const order = await orderRepository.findByPixPaymentId(paymentId);
      if (!order) return res.status(404).send('Pedido do pagamento não encontrado.');

      const restaurant = await orderRepository.findById(order.id, order.restaurantId);
      const slug = String((restaurant as { restaurant?: { slug?: string } })?.restaurant?.slug || '').trim();
      const resolvedSlug = slug || String(order.restaurantId);
      const status = req.query.erro ? 'cancel' : 'pending';
      const target = new URL(
        `/${encodeURIComponent(resolvedSlug)}/pedido/${encodeURIComponent(String(order.publicId))}/pagamento`,
        frontendBase(),
      );
      target.searchParams.set('openFinanceReturn', status);
      return res.redirect(302, target.toString());
    } catch {
      return res.status(500).send('Não foi possível retornar ao GastroNexa.');
    }
  }
}

export default new EfiOpenFinanceReturnController();
