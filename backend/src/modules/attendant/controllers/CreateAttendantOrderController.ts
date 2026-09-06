import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import { generateStrongRandomPassword } from '../../auth/security/passwordPolicy.js';
import createOrderService from '../../orders/services/CreateOrderService.js';

class CreateAttendantOrderController {
  async handle(req: Request, res: Response) {
    try {
      const restaurantId = Number(req.user.restaurantId);
      const type = String(req.body?.type || '').toUpperCase();
      if (type !== 'RETIRADA' && type !== 'DELIVERY') {
        throw new Error('O atendente pode registrar pedidos de retirada ou delivery. Pedidos de mesa usam a sessão da mesa.');
      }

      const paymentMethod = req.body?.paymentMethod;
      const payOnDelivery = req.body?.payOnDelivery === true;
      const payOnDeliveryMethod = req.body?.payOnDeliveryMethod;
      if (
        payOnDelivery &&
        String(payOnDeliveryMethod || paymentMethod || '').toUpperCase() === 'DINHEIRO'
      ) {
        throw new Error('Pagamento em dinheiro na entrega precisa ser registrado pelo administrador.');
      }

      const guestPasswordHash = await bcrypt.hash(generateStrongRandomPassword(), 12);
      const order = await createOrderService.execute({
        userId: null,
        restaurantId,
        userRestaurantId: restaurantId,
        tableSessionId: null,
        tableSessionTableId: null,
        participantId: null,
        settlementMode: undefined,
        type,
        paymentMethod,
        payOnDelivery,
        payOnDeliveryMethod,
        observation: req.body?.observation,
        customerName: req.body?.customerName,
        customerCpf: req.body?.customerCpf,
        customerPhone: req.body?.customerPhone,
        guestPasswordHash,
        tableId: undefined,
        couponRedemptionId: undefined,
        items: req.body?.items,
        address: req.body?.address,
        number: req.body?.number,
        district: req.body?.district,
        city: req.body?.city,
        state: req.body?.state,
        zipCode: req.body?.zipCode,
        complement: req.body?.complement,
      });

      return res.status(201).json(order);
    } catch (error: unknown) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Não foi possível registrar o pedido.',
      });
    }
  }
}

export default new CreateAttendantOrderController();
