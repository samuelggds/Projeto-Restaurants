import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import productRepository from '../../products/repositories/ProductRepository.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import { createOrderSchema } from '../../../validators/OrderValidator.js';
import { buildOrderItemCustomizationSnapshot } from '../utils/productIngredients.js';
import tableSessionRepository from '../../tableSession/repositories/TableSessionRepository.js';
import { PaymentMethod, Prisma, TableSessionStatus, OrderType } from '@prisma/client';
import { notifyCustomerPaymentConfirmed } from '../../../services/customerNotifier.js';
import { z } from 'zod';
import { resolveOrderRestaurantId } from '../utils/orderTenant.js';
import bcrypt from 'bcrypt';
import { generateStrongRandomPassword } from '../../auth/security/passwordPolicy.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';

type OrderItemInput = z.infer<typeof createOrderSchema>['items'][number];

type CreateOrderPayload = {
  userId?: number | string | null;
  restaurantId?: number | string | null;
  userRestaurantId?: number | string | null;
  tableSessionId?: number | string | null;
  tableSessionTableId?: number | string | null;
  type: OrderType;
  paymentMethod?: PaymentMethod;
  paid?: boolean;
  pixPaymentId?: string;
  paymentProof?: string;
  observation?: string;
  customerName?: string;
  customerCpf?: string;
  customerPhone?: string;
  guestPasswordHash?: string;
  tableId?: number | string | null;
  items: OrderItemInput[];
  address?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  paymentProofImage?: string;
  complement?: string;
};

type ResolveOrderUserPayload = {
  tx: Prisma.TransactionClient;
  userId?: number | string | null;
  restaurantId: number;
  customerName?: string;
  customerCpf?: string;
  customerPhone?: string;
  guestPasswordHash?: string;
};

class CreateOrderService {
  formatCpf(value: string | number | null | undefined) {
    const digits = String(value || '').replace(/\D/g, '');

    if (digits.length !== 11) {
      return null;
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  normalizePhone(value: string | number | null | undefined) {
    const digits = String(value || '').replace(/\D/g, '');

    if (!digits) {
      return null;
    }

    if (/^55\d{10,11}$/.test(digits)) {
      return `+${digits}`;
    }

    if (/^\d{10,11}$/.test(digits)) {
      return `+55${digits}`;
    }

    return null;
  }

  async resolveOrderUser({
    tx,
    userId,
    restaurantId,
    customerName,
    customerCpf,
    customerPhone,
    guestPasswordHash,
  }: ResolveOrderUserPayload) {
    const normalizedPhone = this.normalizePhone(customerPhone);

    if (userId) {
      if (normalizedPhone) {
        await tx.user.update({
          where: {
            id: Number(userId),
          },
          data: {
            phone: normalizedPhone,
          },
        });
      }

      return Number(userId);
    }

    const normalizedName = String(customerName || '').trim();
    const cpfDigits = String(customerCpf || '').replace(/\D/g, '');

    if (normalizedName.length < 2) {
      throw new Error('Informe o nome para finalizar o pedido.');
    }

    if (cpfDigits.length !== 11) {
      throw new Error('Informe um CPF válido com 11 dígitos.');
    }

    const guestEmail = `guest.${restaurantId}.${cpfDigits}@pecaja.local`;
    if (!guestPasswordHash) {
      throw new Error('Não foi possível proteger a credencial interna do cliente convidado.');
    }

    const guestUser = await tx.user.upsert({
      where: {
        email: guestEmail,
      },
      update: {
        name: normalizedName,
        active: true,
        ...(normalizedPhone
          ? {
              phone: normalizedPhone,
            }
          : {}),
      },
      create: {
        name: normalizedName,
        email: guestEmail,
        password: guestPasswordHash,
        role: 'CLIENTE',
        active: true,
        phone: normalizedPhone,
        restaurantId,
      },
      select: {
        id: true,
      },
    });

    return Number(guestUser.id);
  }

  async execute({
    userId,
    restaurantId,
    userRestaurantId,
    tableSessionId,
    tableSessionTableId,
    type,
    paymentMethod,
    paid,
    pixPaymentId,
    paymentProof,
    observation,
    customerName,
    customerCpf,
    customerPhone,
    tableId,
    items,
    address,
    number,
    district,
    city,
    state,
    zipCode,
    paymentProofImage,
    complement,
  }: CreateOrderPayload) {
    const resolvedRestaurantId = resolveOrderRestaurantId({
      requestedRestaurantId: restaurantId,
      contextRestaurantId: userRestaurantId,
    });

    createOrderSchema.parse({
      restaurantId: resolvedRestaurantId,
      customerName,
      customerCpf,
      customerPhone,
      type,
      paymentMethod,
      paid,
      pixPaymentId,
      paymentProof,
      observation,
      tableId,
      items,
      address,
      number,
      district,
      city,
      state,
      zipCode,
      complement,
      paymentProofImage,
    });

    if (
      String(paymentMethod || '').toUpperCase() === PaymentMethod.PIX &&
      (String(paymentProof || '').trim() || String(paymentProofImage || '').trim())
    ) {
      throw new Error(
        'Nao e permitido enviar comprovante manual para PIX. O pedido sera confirmado automaticamente pelo provedor.',
      );
    }

    if (type === 'MESA') {
      if (!tableSessionId) {
        throw new Error('Sessão da mesa não informada. Acesse novamente pelo QR Code oficial.');
      }

      const session = await tableSessionRepository.findById(tableSessionId, resolvedRestaurantId);

      if (
        !session ||
        session.status !== TableSessionStatus.OPEN ||
        (session.expiresAt && session.expiresAt.getTime() <= Date.now())
      ) {
        throw new Error('Essa mesa está fechada. Peça ao garçom para abrir o atendimento.');
      }

      if (session.table.restaurantId !== resolvedRestaurantId) {
        throw new Error('A sessão da mesa não pertence a este restaurante.');
      }

      if (Number(tableId || 0) && Number(tableId) !== Number(session.tableId)) {
        throw new Error('Mesa do pedido não confere com a sessão validada.');
      }

      if (
        Number(tableSessionTableId || 0) > 0 &&
        Number(tableSessionTableId) !== Number(session.tableId)
      ) {
        throw new Error('Sessão da mesa inválida para este pedido.');
      }

      tableId = Number(session.tableId);
    }

    if (type === 'DELIVERY') {
      const requiredAddressFields = [address, number, district, city, state]
        .map((value) => String(value || '').trim())
        .filter(Boolean);

      if (requiredAddressFields.length < 5) {
        throw new Error('Informe o endereço completo para pedidos de delivery.');
      }
    }

    const normalizedPaymentMethod = String(paymentMethod || '').toUpperCase();
    const shouldMarkAsPaid = paid === true;

    const guestPasswordHash = !userId
      ? await bcrypt.hash(generateStrongRandomPassword(), 10)
      : undefined;

    const createdOrder = await prisma.$transaction(
      async (tx) => {
        await setTenantDbContext(tx, resolvedRestaurantId);
        if (type === OrderType.MESA) {
          const session = await tableSessionRepository.findById(
            Number(tableSessionId),
            resolvedRestaurantId,
            tx,
          );
          if (
            !session ||
            session.status !== TableSessionStatus.OPEN ||
            (session.expiresAt && session.expiresAt.getTime() <= Date.now()) ||
            session.table.restaurantId !== resolvedRestaurantId ||
            session.tableId !== Number(tableId)
          ) {
            throw new Error(
              'A mesa foi fechada durante o pedido. Peça ao garçom para abrir o atendimento novamente.',
            );
          }
        }

        const resolvedUserId = await this.resolveOrderUser({
          tx,
          userId,
          restaurantId: resolvedRestaurantId,
          customerName,
          customerCpf,
          customerPhone,
          guestPasswordHash,
        });

        const products = await Promise.all(
          items.map((item) => productRepository.findById(item.productId, resolvedRestaurantId, tx)),
        );

        products.forEach((product, index) => {
          const item = items[index];

          if (!product) {
            throw new Error(`Produto não encontrado: ${items[index].productId}`);
          }

          if (product.active === false) {
            throw new Error(`Produto indisponível: ${product.name}`);
          }

          const quantity = Number(item.quantity || 0);

          if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new Error(`Quantidade inválida para ${product.name}.`);
          }

          const stockValue =
            product.stock === null || product.stock === undefined ? null : Number(product.stock);

          if (Number.isInteger(stockValue) && stockValue >= 0 && quantity > stockValue) {
            throw new Error(
              `Estoque insuficiente para ${product.name}. Disponível: ${stockValue}.`,
            );
          }
        });

        const orderItems = items.map((item: OrderItemInput, index: number) =>
          buildOrderItemCustomizationSnapshot(products[index], item),
        );

        const total = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

        const formattedCpf = this.formatCpf(customerCpf);
        const guestSummary =
          !userId && customerName
            ? `Cliente: ${String(customerName).trim()}${formattedCpf ? ` | CPF: ${formattedCpf}` : ''}`
            : '';

        const mergedObservation = [guestSummary, observation]
          .map((item) => String(item || '').trim())
          .filter(Boolean)
          .join(' | ');

        const normalizedTableId =
          tableId === null || tableId === undefined || tableId === '' ? null : Number(tableId);

        const order = await orderRepository.create(
          {
            total,
            systemFee: 0,
            type,
            paymentMethod,
            paid: shouldMarkAsPaid,
            paymentProof: null,
            paymentProofImage: null,
            observation: mergedObservation || null,
            userId: resolvedUserId,
            restaurantId: resolvedRestaurantId,
            tableId: normalizedTableId,
            address,
            number,
            district,
            city,
            state,
            zipCode,
            complement,
          },
          tx,
        );

        await tx.orderItem.createMany({
          data: orderItems.map((item) => ({
            ...item,
            orderId: order.id,
          })),
        });

        await Promise.all(
          orderItems.map(async (item, index) => {
            const product = products[index];
            const stockValue =
              product.stock === null || product.stock === undefined ? null : Number(product.stock);

            if (!Number.isInteger(stockValue) || stockValue < 0) {
              return;
            }

            const nextStock = Math.max(stockValue - Number(item.quantity || 0), 0);

            await tx.product.update({
              where: {
                id: Number(product.id),
                restaurantId: resolvedRestaurantId,
              },
              data: {
                stock: nextStock,
                active: nextStock === 0 ? false : Boolean(product.active),
              },
            });
          }),
        );

        return orderRepository.findById(order.id, resolvedRestaurantId, tx);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    io.to(`restaurant:${createdOrder.restaurantId}`).emit('new-order', createdOrder);
    io.to(`user:${createdOrder.userId}`).emit('new-order', createdOrder);

    if (shouldMarkAsPaid) {
      io.to(`restaurant:${createdOrder.restaurantId}`).emit('order:payment-confirmed', {
        orderId: createdOrder.id,
        paymentMethod: normalizedPaymentMethod,
        paid: true,
        status: createdOrder.status,
      });

      io.to(`user:${createdOrder.userId}`).emit('payment-confirmed', {
        orderId: createdOrder.id,
        paymentMethod: normalizedPaymentMethod,
        paid: true,
        status: createdOrder.status,
      });

      notifyCustomerPaymentConfirmed({
        restaurantId: createdOrder.restaurantId,
        customerPhone: createdOrder?.user?.phone || customerPhone,
        customerName: createdOrder?.user?.name || customerName,
        restaurantName: createdOrder?.restaurant?.name,
        restaurantWhatsapp: createdOrder?.restaurant?.whatsapp,
        orderId: createdOrder?.id,
        total: createdOrder?.total,
        paymentMethod: normalizedPaymentMethod,
      }).catch((error: unknown) => {
        console.error(
          '[CUSTOMER_NOTIFICATION_UNHANDLED]',
          error instanceof Error ? error.message : String(error),
        );
      });
    }

    return createdOrder;
  }
}

export default new CreateOrderService();
