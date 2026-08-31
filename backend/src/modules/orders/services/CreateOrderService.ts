import prisma from '../../../config/prisma.js';
import orderRepository from '../repositories/OrderRepository.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import { createOrderSchema } from '../../../validators/OrderValidator.js';
import tableSessionRepository from '../../tableSession/repositories/TableSessionRepository.js';
import orderPixPaymentService from './OrderPixPaymentService.js';
import { isValidCpf } from './pixPayload.js';
import {
  PaymentMethod,
  Prisma,
  TableBillItemFinancialStatus,
  TableOrderFinancialStatus,
  TableOrderSettlementMode,
  TableParticipantStatus,
  TableSessionStatus,
  OrderType,
  OrderStatus,
} from '@prisma/client';
import { notifyCustomerPaymentConfirmed } from '../../../services/customerNotifier.js';
import { z } from 'zod';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { assertRestaurantIsOpenForOrders } from '../utils/restaurantAvailability.js';
import { assertOrderCapacity } from '../utils/orderCapacity.js';
import { resolveOrderRestaurantId } from '../utils/orderTenant.js';
import orderPricingService from './OrderPricingService.js';
import resolveDeliveryDistanceService from './ResolveDeliveryDistanceService.js';
import {
  markCouponRedemptionUsedForOrder,
  reserveCouponRedemption,
} from './couponRedemptionLifecycle.js';
import {
  emitTableSessionOrderEvent,
  emitWaiterTableOrderEvent,
} from '../utils/waiterOrderRealtime.js';
import { tableOrderContinuationInputSchema } from '../../tableAccount/domain/tableAccountSchemas.js';
import {
  buildTableBillUnitSeeds,
  decimalMoneyToCents,
} from '../../tableAccount/domain/tableBillItemPricing.js';
import tableAccountSettingsRepository from '../../tableAccount/repositories/TableAccountSettingsRepository.js';
import {
  getWeekdayAndMinuteInTimeZone,
  requiresPrepayment,
} from '../../tableAccount/domain/tableAccountRules.js';
import {
  loadTablePaymentLedgerItems,
  lockTablePaymentSession,
} from '../../tableAccount/services/tablePaymentLedger.js';
import bcrypt from 'bcrypt';
import { generateStrongRandomPassword } from '../../auth/security/passwordPolicy.js';

type OrderItemInput = z.infer<typeof createOrderSchema>['items'][number];

type CreateOrderPayload = {
  userId?: number | string | null;
  restaurantId?: number | string | null;
  userRestaurantId?: number | string | null;
  tableSessionId?: number | string | null;
  tableSessionTableId?: number | string | null;
  participantId?: number | string | null;
  settlementMode?: string | null;
  deferRealtimeUntilPaid?: boolean;
  type: OrderType;
  paymentMethod?: PaymentMethod;
  payOnDelivery?: boolean;
  payOnDeliveryMethod?: PaymentMethod;
  paid?: boolean;
  pixPaymentId?: string;
  paymentProof?: string;
  observation?: string;
  customerName?: string;
  customerCpf?: string;
  customerPhone?: string;
  guestPasswordHash?: string;
  tableId?: number | string | null;
  couponRedemptionId?: number | string | null;
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

type ResolvePaymentStatePayload = {
  paymentMethod?: PaymentMethod;
  paid?: boolean;
  pixPaymentId?: string;
  paymentProof?: string;
  paymentProofImage?: string;
  restaurantId: number;
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

    if (!isValidCpf(cpfDigits)) {
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

  async resolvePaymentState({
    paymentMethod,
    paid,
    pixPaymentId,
    restaurantId,
  }: ResolvePaymentStatePayload) {
    const normalizedPaymentMethod = String(paymentMethod || '').toUpperCase();
    const normalizedPixPaymentId = String(pixPaymentId || '').trim();
    const requestedAsPaid = paid === true;

    if (!requestedAsPaid) {
      return {
        normalizedPaymentMethod,
        normalizedPixPaymentId,
        shouldMarkAsPaid: false,
        paidAt: null,
      };
    }

    if (normalizedPaymentMethod === PaymentMethod.PIX) {
      if (normalizedPixPaymentId && !normalizedPixPaymentId.startsWith('manual:')) {
        const paymentStatus = await orderPixPaymentService.ensurePaymentApproved({
          paymentId: normalizedPixPaymentId,
          restaurantId,
        });

        if (!paymentStatus.sameRestaurant) {
          throw new Error('O pagamento PIX informado nao pertence a este restaurante.');
        }

        return {
          normalizedPaymentMethod,
          normalizedPixPaymentId,
          shouldMarkAsPaid: true,
          paidAt: new Date(),
        };
      }

      throw new Error('Pagamento PIX ainda nao foi confirmado pelo provedor.');
    }

    if (normalizedPaymentMethod === PaymentMethod.CARTAO) {
      return {
        normalizedPaymentMethod,
        normalizedPixPaymentId,
        shouldMarkAsPaid: true,
        paidAt: new Date(),
      };
    }

    return {
      normalizedPaymentMethod,
      normalizedPixPaymentId,
      shouldMarkAsPaid: false,
      paidAt: null,
    };
  }

  async execute({
    userId,
    restaurantId,
    userRestaurantId,
    tableSessionId,
    tableSessionTableId,
    participantId,
    settlementMode,
    deferRealtimeUntilPaid,
    type,
    paymentMethod,
    payOnDelivery,
    payOnDeliveryMethod,
    paid,
    pixPaymentId,
    paymentProof,
    observation,
    customerName,
    customerCpf,
    customerPhone,
    tableId,
    couponRedemptionId,
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

    if (paid === true) {
      throw new Error(
        'O pagamento só pode ser confirmado pelo provedor ou pelo fluxo administrativo seguro.',
      );
    }

    if (String(pixPaymentId || '').trim()) {
      throw new Error('O identificador PIX só pode ser vinculado pelo provedor de pagamento.');
    }

    const restaurantSettings =
      await restaurantSettingsRepository.findByRestaurantId(resolvedRestaurantId);
    const preliminaryTableAccountSettings =
      type === OrderType.MESA
        ? await tableAccountSettingsRepository.findByRestaurantId(resolvedRestaurantId)
        : null;
    assertRestaurantIsOpenForOrders(
      restaurantSettings?.isOpenForOrders,
      restaurantSettings?.businessHours,
    );

    const shouldPayOnDelivery = payOnDelivery === true;
    const effectivePaymentMethod = shouldPayOnDelivery
      ? payOnDeliveryMethod || paymentMethod
      : paymentMethod;
    const normalizedRequestedPaymentMethod = String(effectivePaymentMethod || '').toUpperCase();
    const tablePaymentMethod =
      normalizedRequestedPaymentMethod === PaymentMethod.PIX
        ? 'PIX'
        : normalizedRequestedPaymentMethod === PaymentMethod.CARTAO
          ? 'CARD'
          : undefined;
    const tableContinuation =
      type === OrderType.MESA
        ? tableOrderContinuationInputSchema.parse({
            settlementMode:
              String(settlementMode || '')
                .trim()
                .toUpperCase() ||
              (tablePaymentMethod
                ? TableOrderSettlementMode.PAY_NOW
                : TableOrderSettlementMode.TABLE_ACCOUNT),
            ...(tablePaymentMethod ? { paymentMethod: tablePaymentMethod } : {}),
          })
        : null;

    if (type === OrderType.MESA && normalizedRequestedPaymentMethod && !tablePaymentMethod) {
      throw new Error(
        'O pedido da mesa só aceita PIX ou cartão no pagamento imediato. Dinheiro e maquininha são registrados na conta pelo garçom.',
      );
    }

    if (
      type === OrderType.MESA &&
      tableContinuation?.settlementMode === TableOrderSettlementMode.PAY_NOW &&
      preliminaryTableAccountSettings?.enabled &&
      !preliminaryTableAccountSettings.allowOnlinePayment
    ) {
      throw new Error('O pagamento online de pedidos da mesa está desativado neste restaurante.');
    }

    if (type === OrderType.MESA && !Number(participantId || 0)) {
      throw new Error('Participante da mesa não identificado. Leia o QR Code novamente.');
    }

    if (
      normalizedRequestedPaymentMethod === PaymentMethod.PIX &&
      restaurantSettings?.acceptsPix === false
    ) {
      throw new Error('O restaurante não está aceitando pagamentos por PIX no momento.');
    }
    if (
      normalizedRequestedPaymentMethod === PaymentMethod.CARTAO &&
      restaurantSettings?.acceptsCard === false
    ) {
      throw new Error('O restaurante não está aceitando pagamentos com cartão no momento.');
    }

    if (shouldPayOnDelivery && type !== OrderType.DELIVERY) {
      throw new Error('Pagar na entrega só é permitido para pedidos de delivery.');
    }

    if (shouldPayOnDelivery && !effectivePaymentMethod) {
      throw new Error('Informe o método de pagamento para pedidos com pagar na entrega.');
    }

    if (
      normalizedRequestedPaymentMethod === PaymentMethod.PIX &&
      (String(paymentProof || '').trim() || String(paymentProofImage || '').trim())
    ) {
      throw new Error(
        'Nao e permitido enviar comprovante manual para PIX. O pedido sera confirmado automaticamente pelo provedor.',
      );
    }

    createOrderSchema.parse({
      restaurantId: resolvedRestaurantId,
      customerName,
      customerCpf,
      customerPhone,
      type,
      paymentMethod: effectivePaymentMethod,
      payOnDelivery: shouldPayOnDelivery,
      payOnDeliveryMethod: shouldPayOnDelivery ? effectivePaymentMethod : undefined,
      paid,
      pixPaymentId,
      paymentProof,
      observation,
      tableId,
      couponRedemptionId,
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

    const { normalizedPaymentMethod, normalizedPixPaymentId, shouldMarkAsPaid, paidAt } =
      await this.resolvePaymentState({
        paymentMethod: effectivePaymentMethod,
        paid: shouldPayOnDelivery ? false : paid,
        pixPaymentId,
        restaurantId: resolvedRestaurantId,
      });

    const initialStatus = restaurantSettings?.autoAcceptOrders
      ? OrderStatus.PREPARANDO
      : OrderStatus.PENDENTE;

    if (type === 'MESA') {
      if (!tableSessionId) {
        throw new Error('Sessão da mesa não informada. Acesse novamente pelo QR Code oficial.');
      }

      const session = await tableSessionRepository.findById(tableSessionId, resolvedRestaurantId);

      if (
        !session ||
        (session.status !== TableSessionStatus.OPEN &&
          !(
            preliminaryTableAccountSettings?.enabled &&
            !preliminaryTableAccountSettings.blockNewOrdersOnClosingRequest &&
            session.status === TableSessionStatus.CLOSING_REQUESTED
          )) ||
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

      const normalizedCustomerPhone = this.normalizePhone(customerPhone);

      if (!normalizedCustomerPhone && userId) {
        const existingUser = await prisma.user.findUnique({
          where: {
            id: Number(userId),
          },
          select: {
            phone: true,
          },
        });

        const normalizedExistingPhone = this.normalizePhone(existingUser?.phone);

        if (!normalizedExistingPhone) {
          throw new Error('Informe um celular/WhatsApp válido para pedidos de delivery.');
        }
      }

      if (!normalizedCustomerPhone && !userId) {
        throw new Error('Informe um celular/WhatsApp válido para pedidos de delivery.');
      }
    }

    const deliveryDistanceMeters =
      type === OrderType.DELIVERY && restaurantSettings?.deliveryFeeMode === 'DISTANCE'
        ? await resolveDeliveryDistanceService.execute({
            restaurantId: resolvedRestaurantId,
            destination: {
              address,
              number,
              district,
              city,
              state,
            },
          })
        : null;

    const guestPasswordHash =
      type !== OrderType.MESA && !userId
        ? await bcrypt.hash(generateStrongRandomPassword(), 10)
        : undefined;

    const createdOrder = await prisma.$transaction(
      async (tx) => {
        let tableParticipant: {
          id: number;
          userId: number | null;
          publicId: string;
          displayName: string | null;
        } | null = null;

        if (type === OrderType.MESA) {
          await lockTablePaymentSession(tx, resolvedRestaurantId, Number(tableSessionId));
          const tableAccountSettings = await tableAccountSettingsRepository.findByRestaurantId(
            resolvedRestaurantId,
            tx,
          );
          const session = await tableSessionRepository.findById(
            Number(tableSessionId),
            resolvedRestaurantId,
            tx,
          );
          if (
            !session ||
            (session.status !== TableSessionStatus.OPEN &&
              !(
                tableAccountSettings.enabled &&
                !tableAccountSettings.blockNewOrdersOnClosingRequest &&
                session.status === TableSessionStatus.CLOSING_REQUESTED
              )) ||
            (session.expiresAt && session.expiresAt.getTime() <= Date.now()) ||
            session.table.restaurantId !== resolvedRestaurantId ||
            session.tableId !== Number(tableId)
          ) {
            throw new Error(
              'A mesa foi fechada durante o pedido. Peça ao garçom para abrir o atendimento novamente.',
            );
          }

          tableParticipant = await tx.tableParticipant.findFirst({
            where: {
              id: Number(participantId),
              tableSessionId: session.id,
              restaurantId: resolvedRestaurantId,
              status: TableParticipantStatus.ACTIVE,
              revokedAt: null,
              OR: [{ userId: { not: null } }, { tokenExpiresAt: { gt: new Date() } }],
            },
            select: {
              id: true,
              userId: true,
              publicId: true,
              displayName: true,
            },
          });

          if (!tableParticipant) {
            throw new Error(
              'Sua identificação nesta mesa expirou. Leia o QR Code novamente antes de pedir.',
            );
          }
        }

        const activeOrders = await orderRepository.countActiveOperationalOrders(
          resolvedRestaurantId,
          tx,
        );
        assertOrderCapacity(activeOrders, restaurantSettings?.maxConcurrentOrders);

        const resolvedUserId =
          type === OrderType.MESA
            ? (tableParticipant?.userId ?? null)
            : await this.resolveOrderUser({
                tx,
                userId,
                restaurantId: resolvedRestaurantId,
                customerName,
                customerCpf,
                customerPhone,
                guestPasswordHash,
              });

        const pricing = await orderPricingService.quote({
          restaurantId: resolvedRestaurantId,
          userId: resolvedUserId,
          type,
          items,
          couponRedemptionId,
          deliveryDistanceMeters,
          db: tx,
        });
        const { products, orderItems } = pricing;

        if (type === OrderType.MESA) {
          const tableAccountSettings = await tableAccountSettingsRepository.findByRestaurantId(
            resolvedRestaurantId,
            tx,
          );
          if (!tableAccountSettings.enabled) {
            throw new Error(
              'A conta por mesa está desativada. Peça ao administrador para revisar as configurações.',
            );
          }
          if (
            tableContinuation?.settlementMode === TableOrderSettlementMode.PAY_NOW &&
            !tableAccountSettings.allowOnlinePayment
          ) {
            throw new Error(
              'O pagamento online de pedidos da mesa está desativado neste restaurante.',
            );
          }

          if (tableContinuation?.settlementMode === TableOrderSettlementMode.TABLE_ACCOUNT) {
            const ledgerItems = await loadTablePaymentLedgerItems(
              tx,
              resolvedRestaurantId,
              Number(tableSessionId),
            );
            const currentOutstandingCents = ledgerItems
              .filter((item) => !item.canceled && item.projectedStatus !== 'REFUNDED')
              .reduce(
                (total, item) => total + Math.max(0, item.unitPriceCents - item.paidCents),
                0,
              );
            const incomingOrderCents = decimalMoneyToCents(
              pricing.total,
              'total do novo pedido da mesa',
            );
            const localTime = getWeekdayAndMinuteInTimeZone(
              new Date(),
              tableAccountSettings.timeZone,
            );
            const prepayment = requiresPrepayment({
              currentOutstandingCents,
              incomingOrderCents,
              thresholdCents: tableAccountSettings.requirePrepaymentAboveCents,
              windows: tableAccountSettings.prepaymentWindows,
              currentWeekday: localTime.weekday,
              currentMinute: localTime.minuteOfDay,
            });
            if (prepayment.required) {
              throw new Error(
                prepayment.reason === 'SCHEDULE'
                  ? 'Neste horário, o pedido da mesa precisa ser pago antes de ser enviado.'
                  : 'Este pedido ultrapassa o limite da conta da mesa. Escolha pagar agora.',
              );
            }
          }
        }

        const formattedCpf = this.formatCpf(customerCpf);
        const guestSummary =
          type !== OrderType.MESA && !userId && customerName
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
            total: pricing.total,
            itemsSubtotal: pricing.itemsSubtotal,
            productDiscountTotal: pricing.productDiscountTotal,
            couponDiscount: pricing.couponDiscount,
            deliveryFeeAmount: pricing.deliveryFeeAmount,
            couponId: pricing.couponId,
            couponRedemptionId: pricing.couponRedemptionId,
            couponCode: pricing.couponCode,
            systemFee: 0,
            type,
            paymentMethod:
              tableContinuation?.settlementMode === TableOrderSettlementMode.TABLE_ACCOUNT
                ? null
                : effectivePaymentMethod,
            payOnDelivery: shouldPayOnDelivery,
            payOnDeliveryMethod: shouldPayOnDelivery ? effectivePaymentMethod : null,
            paid: shouldMarkAsPaid,
            pixPaymentId: normalizedPixPaymentId || null,
            paidAt,
            paymentProof: null,
            paymentProofImage: null,
            observation: mergedObservation || null,
            userId: resolvedUserId,
            restaurantId: resolvedRestaurantId,
            tableId: normalizedTableId,
            ...(type === OrderType.MESA
              ? {
                  tableSessionId: Number(tableSessionId),
                  participantId: Number(tableParticipant?.id),
                  settlementMode: tableContinuation?.settlementMode,
                  tableFinancialStatus: shouldMarkAsPaid
                    ? TableOrderFinancialStatus.PAID
                    : tableContinuation?.settlementMode === TableOrderSettlementMode.PAY_NOW
                      ? TableOrderFinancialStatus.PROCESSING
                      : TableOrderFinancialStatus.UNPAID,
                }
              : {}),
            address,
            number,
            district,
            city,
            state,
            zipCode,
            complement,
            status: initialStatus,
            preparationStartedAt: initialStatus === OrderStatus.PREPARANDO ? new Date() : null,
          },
          tx,
        );

        await reserveCouponRedemption({
          redemptionId: pricing.couponRedemptionId,
          restaurantId: resolvedRestaurantId,
          userId: resolvedUserId,
          db: tx,
        });

        if (shouldMarkAsPaid) {
          await markCouponRedemptionUsedForOrder(order.id, resolvedRestaurantId, tx);
        }

        const persistedOrderItems = [];
        for (const item of orderItems) {
          const persistedItem = await tx.orderItem.create({
            data: {
              ...item,
              orderId: order.id,
              ...(type === OrderType.MESA
                ? {
                    restaurantId: resolvedRestaurantId,
                    tableSessionId: Number(tableSessionId),
                    participantId: Number(tableParticipant?.id),
                  }
                : {}),
            },
            select: {
              id: true,
              orderId: true,
              productId: true,
              quantity: true,
              price: true,
            },
          });
          persistedOrderItems.push(persistedItem);
        }

        if (type === OrderType.MESA) {
          const billUnitSeeds = buildTableBillUnitSeeds(orderItems, pricing.couponDiscount);
          const expectedOrderTotalCents = decimalMoneyToCents(
            pricing.total,
            'total do pedido da mesa',
          );
          const billTotalCents = billUnitSeeds.reduce(
            (total, unit) => total + unit.unitPriceCents,
            0,
          );
          if (billTotalCents !== expectedOrderTotalCents) {
            throw new Error(
              'Não foi possível fechar os centavos dos itens com o total do pedido da mesa.',
            );
          }

          const financialStatus = shouldMarkAsPaid
            ? TableBillItemFinancialStatus.PAID
            : tableContinuation?.settlementMode === TableOrderSettlementMode.PAY_NOW
              ? TableBillItemFinancialStatus.PROCESSING
              : TableBillItemFinancialStatus.UNPAID;

          await tx.tableBillItem.createMany({
            data: billUnitSeeds.map((unit) => ({
              restaurantId: resolvedRestaurantId,
              tableSessionId: Number(tableSessionId),
              participantId: Number(tableParticipant?.id),
              orderId: order.id,
              orderItemId: persistedOrderItems[unit.orderItemIndex].id,
              unitIndex: unit.unitIndex,
              productName: products[unit.orderItemIndex].name,
              unitPriceCents: BigInt(unit.unitPriceCents),
              financialStatus,
              paidAt: shouldMarkAsPaid ? paidAt : null,
            })),
          });
        }

        const requestedQuantityByProduct = new Map<number, number>();
        orderItems.forEach((item) => {
          requestedQuantityByProduct.set(
            item.productId,
            (requestedQuantityByProduct.get(item.productId) || 0) + Number(item.quantity),
          );
        });

        for (const [productId, requestedQuantity] of requestedQuantityByProduct) {
          const product = products.find((candidate) => candidate.id === productId)!;
          const stockValue =
            product.stock === null || product.stock === undefined ? null : Number(product.stock);

          if (!Number.isInteger(stockValue) || stockValue < 0) {
            continue;
          }

          const decremented = await tx.product.updateMany({
            where: {
              id: productId,
              restaurantId: resolvedRestaurantId,
              stock: { gte: requestedQuantity },
            },
            data: {
              stock: { decrement: requestedQuantity },
            },
          });
          if (decremented.count !== 1) {
            throw new Error(
              `Estoque de ${product.name} mudou. Confira a quantidade e tente novamente.`,
            );
          }

          await tx.product.updateMany({
            where: { id: productId, restaurantId: resolvedRestaurantId, stock: 0 },
            data: { active: false },
          });
        }

        return orderRepository.findById(order.id, resolvedRestaurantId, tx);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    // Pedidos pagos na entrega precisam aparecer imediatamente na operação.
    // Somente cobranças digitais online aguardam a confirmação do provedor.
    const isUnpaidDelivery =
      type === OrderType.DELIVERY && shouldPayOnDelivery !== true && shouldMarkAsPaid !== true;
    const isUnpaidDigitalPayment =
      shouldMarkAsPaid !== true &&
      shouldPayOnDelivery !== true &&
      (normalizedPaymentMethod === PaymentMethod.PIX ||
        normalizedPaymentMethod === PaymentMethod.CARTAO);
    const shouldDeferRealtimeUntilPaid =
      deferRealtimeUntilPaid === true || isUnpaidDelivery || isUnpaidDigitalPayment;

    if (!shouldDeferRealtimeUntilPaid) {
      io.to(`restaurant:${createdOrder.restaurantId}`).emit('new-order', createdOrder);
      if (createdOrder.userId) {
        io.to(`user:${createdOrder.userId}`).emit('new-order', createdOrder);
      }
      emitWaiterTableOrderEvent(io, 'new-order', createdOrder);
      emitTableSessionOrderEvent(io, 'new-order', createdOrder);
    }

    if (shouldMarkAsPaid) {
      io.to(`restaurant:${createdOrder.restaurantId}`).emit('order:payment-confirmed', {
        orderId: createdOrder.id,
        paymentMethod: normalizedPaymentMethod,
        paid: true,
        status: createdOrder.status,
      });

      if (createdOrder.userId) {
        io.to(`user:${createdOrder.userId}`).emit('payment-confirmed', {
          orderId: createdOrder.id,
          paymentMethod: normalizedPaymentMethod,
          paid: true,
          status: createdOrder.status,
        });
      }

      notifyCustomerPaymentConfirmed({
        restaurantId: createdOrder.restaurantId,
        customerPhone: createdOrder?.user?.phone || customerPhone,
        customerName:
          createdOrder?.user?.name || createdOrder?.participant?.displayName || customerName,
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
