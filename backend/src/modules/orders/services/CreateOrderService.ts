import { isPromotionalAudienceEligible } from '../../coupon/domain/promotionalCampaignEligibility.js';
import { promotionalCustomerScope } from '../../coupon/utils/promotionalCustomerScope.js';
import prisma from '../../../config/prisma.js';
import { OrderRequestError } from '../domain/OrderRequestError.js';
import { PaymentCreationUncertainError } from './PaymentCreationUncertainError.js';
import {
  replayCreatedOrder,
  retryOrderTransaction,
  type OrderCreationContext,
} from './orderCreationRequest.js';
import orderRepository from '../repositories/OrderRepository.js';
import orderCapacityQueueService from './OrderCapacityQueueService.js';
import { realtimePublisher as io } from '../../../realtime/realtimePublisher.js';
import { createOrderSchema } from '../../../validators/OrderValidator.js';
import tableSessionRepository from '../../tableSession/repositories/TableSessionRepository.js';
import tableParticipantStateService from '../../tableSession/services/TableParticipantStateService.js';
import orderPixPaymentService from './OrderPixPaymentService.js';
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
  CourierCompensationModel,
} from '@prisma/client';
import { notifyCustomerPaymentConfirmed } from '../../../services/customerNotifier.js';
import { recordWhatsappOrderNotificationOptIn } from '../../../services/whatsappOrderConsent.js';
import { z } from 'zod';
import restaurantSettingsRepository from '../../restaurantSettings/repositories/RestaurantSettingsRepository.js';
import { assertRestaurantIsOpenForOrders } from '../utils/restaurantAvailability.js';
import {
  isOrderCapacityQueued,
  shouldQueueOperationalOrder,
} from '../utils/orderCapacity.js';
import { resolveOrderRestaurantId } from '../utils/orderTenant.js';
import orderPricingService from './OrderPricingService.js';
import resolveDeliveryDistanceService from './ResolveDeliveryDistanceService.js';
import { setTenantDbContext, withTenantDbContext } from '../../../database/tenantDbContext.js';
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
import { tableAccountEvents } from '../../tableAccount/realtime/tableAccountEvents.js';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { generateStrongRandomPassword } from '../../auth/security/passwordPolicy.js';
import kitchenPrintingService from '../../kitchenPrinting/services/KitchenPrintingService.js';
import { withoutOrderCreationMetadata } from '../utils/orderPublicData.js';
import { assertNoActiveOnlinePayment } from './ActiveOnlinePaymentGuard.js';

type OrderItemInput = z.infer<typeof createOrderSchema>['items'][number];

type CreateOrderPayload = {
  creationRequest?: OrderCreationContext;
  nfcChallengeId?: string;
  userId?: number | string | null;
  restaurantId?: number | string | null;
  userRestaurantId?: number | string | null;
  tableSessionId?: number | string | null;
  tableSessionTableId?: number | string | null;
  participantId?: number | string | null;
  settlementMode?: string | null;
  deferRealtimeUntilPaid?: boolean;
  enforceSingleActiveOnlinePayment?: boolean;
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
  whatsappOptIn?: boolean;
  guestPasswordHash?: string;
  tableId?: number | string | null;
  couponRedemptionId?: number | string | null;
  couponCode?: string | null;
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
  normalizePhone(value: string | number | null | undefined) {
    const digits = String(value || '').replace(/\D/g, '');
    if (!digits) return null;
    if (/^55\d{10,11}$/.test(digits)) return `+${digits}`;
    if (/^\d{10,11}$/.test(digits)) return `+55${digits}`;
    return null;
  }

  async resolveOrderUser({
    tx,
    userId,
    restaurantId,
    customerName,
    customerPhone,
    guestPasswordHash,
  }: ResolveOrderUserPayload) {
    const normalizedPhone = this.normalizePhone(customerPhone);
    if (userId) {
      if (normalizedPhone) {
        await tx.user.update({ where: { id: Number(userId) }, data: { phone: normalizedPhone } });
      }
      return Number(userId);
    }

    const normalizedName = String(customerName || '').trim();
    if (normalizedName.length < 2)
      throw new OrderRequestError('Informe o nome para finalizar o pedido.');
    if (!normalizedPhone)
      throw new OrderRequestError('Informe um número de WhatsApp válido com DDD para finalizar o pedido.');

    const phoneDigits = normalizedPhone.replace(/\D/g, '');
    const guestEmail = `guest.${restaurantId}.${phoneDigits}@gastronexa.local`;
    if (!guestPasswordHash)
      throw new Error('Não foi possível proteger a credencial interna do cliente convidado.');
    const guestUser = await tx.user.upsert({
      where: { email: guestEmail },
      update: { name: normalizedName, active: true, phone: normalizedPhone },
      create: {
        name: normalizedName,
        email: guestEmail,
        password: guestPasswordHash,
        role: 'CLIENTE',
        active: true,
        phone: normalizedPhone,
        restaurantId,
      },
      select: { id: true },
    });
    return Number(guestUser.id);
  }

  async resolvePaymentState({ paymentMethod, paid, pixPaymentId, restaurantId }: ResolvePaymentStatePayload) {
    const normalizedPaymentMethod = String(paymentMethod || '').toUpperCase();
    const normalizedPixPaymentId = String(pixPaymentId || '').trim();
    const requestedAsPaid = paid === true;
    if (!requestedAsPaid)
      return { normalizedPaymentMethod, normalizedPixPaymentId, shouldMarkAsPaid: false, paidAt: null };

    if (normalizedPaymentMethod === PaymentMethod.PIX) {
      if (normalizedPixPaymentId && !normalizedPixPaymentId.startsWith('manual:')) {
        const paymentStatus = await orderPixPaymentService.ensurePaymentApproved({
          paymentId: normalizedPixPaymentId,
          restaurantId,
        });
        if (!paymentStatus.sameRestaurant)
          throw new OrderRequestError('O pagamento PIX informado nao pertence a este restaurante.');
        return {
          normalizedPaymentMethod,
          normalizedPixPaymentId,
          shouldMarkAsPaid: true,
          paidAt: new Date(),
        };
      }
      throw new OrderRequestError('Pagamento PIX ainda nao foi confirmado pelo provedor.');
    }
    if (normalizedPaymentMethod === PaymentMethod.CARTAO) {
      return {
        normalizedPaymentMethod,
        normalizedPixPaymentId,
        shouldMarkAsPaid: true,
        paidAt: new Date(),
      };
    }
    return { normalizedPaymentMethod, normalizedPixPaymentId, shouldMarkAsPaid: false, paidAt: null };
  }

  async execute({
    creationRequest,
    nfcChallengeId,
    userId,
    restaurantId,
    userRestaurantId,
    tableSessionId,
    tableSessionTableId,
    participantId,
    settlementMode,
    deferRealtimeUntilPaid,
    enforceSingleActiveOnlinePayment = true,
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
    whatsappOptIn,
    tableId,
    couponRedemptionId,
    couponCode,
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

    if (nfcChallengeId && type !== OrderType.NFC) throw new OrderRequestError('Confirmação NFC exige pedido NFC.');
    if (type === OrderType.NFC && !nfcChallengeId) throw new OrderRequestError('Confirmação NFC obrigatória.');
    if (creationRequest) {
      const replay = await withTenantDbContext(resolvedRestaurantId, (tx) =>
        replayCreatedOrder(tx, resolvedRestaurantId, creationRequest),
      );
      if (replay) {
        if (deferRealtimeUntilPaid)
          throw new PaymentCreationUncertainError(replay.id, replay.publicId);
        return withoutOrderCreationMetadata(replay);
      }
    }
    if (paid === true)
      throw new OrderRequestError(
        'O pagamento só pode ser confirmado pelo provedor ou pelo fluxo administrativo seguro.',
      );
    if (String(pixPaymentId || '').trim())
      throw new OrderRequestError('O identificador PIX só pode ser vinculado pelo provedor de pagamento.');

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
    const pickupPaymentMethod =
      type === OrderType.RETIRADA && !shouldPayOnDelivery && !paymentMethod
        ? payOnDeliveryMethod
        : undefined;
    const effectivePaymentMethod = shouldPayOnDelivery
      ? payOnDeliveryMethod || paymentMethod
      : paymentMethod;
    const normalizedRequestedPaymentMethod = String(effectivePaymentMethod || '').toUpperCase();
    const normalizedPickupPaymentMethod = String(pickupPaymentMethod || '').toUpperCase();
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
              String(settlementMode || '').trim().toUpperCase() ||
              (tablePaymentMethod
                ? TableOrderSettlementMode.PAY_NOW
                : TableOrderSettlementMode.TABLE_ACCOUNT),
            ...(tablePaymentMethod ? { paymentMethod: tablePaymentMethod } : {}),
          })
        : null;

    if (type === OrderType.MESA && normalizedRequestedPaymentMethod && !tablePaymentMethod) {
      throw new OrderRequestError(
        'O pedido da mesa só aceita PIX ou cartão no pagamento imediato. Dinheiro e maquininha são registrados na conta pelo garçom.',
      );
    }
    if (
      type === OrderType.MESA &&
      tableContinuation?.settlementMode === TableOrderSettlementMode.PAY_NOW &&
      preliminaryTableAccountSettings?.enabled &&
      !preliminaryTableAccountSettings.allowOnlinePayment
    ) {
      throw new OrderRequestError(
        'O pagamento online de pedidos da mesa está desativado neste restaurante.',
      );
    }
    if (type === OrderType.MESA && !Number(participantId || 0))
      throw new OrderRequestError(
        'Participante da mesa não identificado. Leia o QR Code novamente.',
      );

    if (
      (normalizedRequestedPaymentMethod === PaymentMethod.PIX ||
        normalizedPickupPaymentMethod === PaymentMethod.PIX) &&
      restaurantSettings?.acceptsPix === false
    ) {
      throw new OrderRequestError('O restaurante não está aceitando pagamentos por PIX no momento.');
    }
    if (
      (normalizedRequestedPaymentMethod === PaymentMethod.CARTAO ||
        normalizedPickupPaymentMethod === PaymentMethod.CARTAO) &&
      restaurantSettings?.acceptsCard === false
    ) {
      throw new OrderRequestError(
        'O restaurante não está aceitando pagamentos com cartão no momento.',
      );
    }
    if (shouldPayOnDelivery && type !== OrderType.DELIVERY)
      throw new OrderRequestError('Pagar na entrega só é permitido para pedidos de delivery.');
    if (shouldPayOnDelivery && !effectivePaymentMethod)
      throw new OrderRequestError(
        'Informe o método de pagamento para pedidos com pagar na entrega.',
      );
    if (
      normalizedRequestedPaymentMethod === PaymentMethod.PIX &&
      (String(paymentProof || '').trim() || String(paymentProofImage || '').trim())
    ) {
      throw new OrderRequestError(
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
      payOnDeliveryMethod: shouldPayOnDelivery ? effectivePaymentMethod : pickupPaymentMethod,
      paid,
      pixPaymentId,
      paymentProof,
      observation,
      tableId,
      couponRedemptionId,
      couponCode,
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

    const isUnpaidDelivery =
      type === OrderType.DELIVERY && shouldPayOnDelivery !== true && shouldMarkAsPaid !== true;
    const isUnpaidDigitalPayment =
      shouldMarkAsPaid !== true &&
      shouldPayOnDelivery !== true &&
      (normalizedPaymentMethod === PaymentMethod.PIX ||
        normalizedPaymentMethod === PaymentMethod.CARTAO);
    const shouldDeferRealtimeUntilPaid =
      deferRealtimeUntilPaid === true || isUnpaidDelivery || isUnpaidDigitalPayment;
    const configuredInitialStatus = restaurantSettings?.autoAcceptOrders
      ? OrderStatus.PREPARANDO
      : OrderStatus.PENDENTE;

    if (type === 'MESA') {
      if (!tableSessionId)
        throw new OrderRequestError(
          'Sessão da mesa não informada. Acesse novamente pelo QR Code oficial.',
        );
      const session = await tableSessionRepository.findById(
        tableSessionId,
        resolvedRestaurantId,
      );
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
        throw new OrderRequestError(
          'Essa mesa está fechada. Peça ao garçom para abrir o atendimento.',
        );
      }
      if (session.table.restaurantId !== resolvedRestaurantId)
        throw new OrderRequestError('A sessão da mesa não pertence a este restaurante.');
      if (Number(tableId || 0) && Number(tableId) !== Number(session.tableId))
        throw new OrderRequestError('Mesa do pedido não confere com a sessão validada.');
      if (
        Number(tableSessionTableId || 0) > 0 &&
        Number(tableSessionTableId) !== Number(session.tableId)
      )
        throw new OrderRequestError('Sessão da mesa inválida para este pedido.');
      tableId = Number(session.tableId);
    }

    if (type === 'DELIVERY') {
      const requiredAddressFields = [address, number, district, city, state]
        .map((value) => String(value || '').trim())
        .filter(Boolean);
      if (requiredAddressFields.length < 5)
        throw new OrderRequestError('Informe o endereço completo para pedidos de delivery.');
      if (!this.normalizePhone(customerPhone))
        throw new OrderRequestError(
          'Informe no carrinho um celular/WhatsApp válido com DDD para este pedido.',
        );
    }

    const restaurantUsesDistanceCompensation =
      type === OrderType.DELIVERY
        ? await withTenantDbContext(resolvedRestaurantId, async (db) =>
            Boolean(
              await db.courierCompensationPolicy.findFirst({
                where: {
                  restaurantId: resolvedRestaurantId,
                  model: {
                    in: [
                      CourierCompensationModel.DISTANCE_RANGES,
                      CourierCompensationModel.BASE_PLUS_DISTANCE,
                    ],
                  },
                },
                select: { id: true },
              }),
            ),
          )
        : false;

    const deliveryDistanceMeters =
      type === OrderType.DELIVERY &&
      (restaurantSettings?.deliveryFeeMode === 'DISTANCE' || restaurantUsesDistanceCompensation)
        ? await resolveDeliveryDistanceService.execute({
            restaurantId: resolvedRestaurantId,
            destination: { address, number, district, city, state },
            force: restaurantUsesDistanceCompensation,
          })
        : null;
    const guestPasswordHash =
      type !== OrderType.MESA && !userId
        ? await bcrypt.hash(generateStrongRandomPassword(), 10)
        : undefined;

    const creation = await retryOrderTransaction(
      () =>
        prisma.$transaction(
          async (tx) => {
            await setTenantDbContext(tx, resolvedRestaurantId);
            const replay = await replayCreatedOrder(
              tx,
              resolvedRestaurantId,
              creationRequest,
            );
            if (replay) return { order: replay, replayed: true };
            let nfcContext: { comandaId: string; customerId: string; cardId: string } | null = null;
            if (nfcChallengeId) {
              const challenge = await tx.nfcOrderConfirmation.findFirst({
                where: { id: nfcChallengeId, restaurantId: resolvedRestaurantId },
                select: { id: true, comandaId: true, customerId: true, cardId: true, verifiedAt: true, consumedAt: true, expiresAt: true, draftItems: true },
              });
              if (!challenge || !challenge.verifiedAt || challenge.expiresAt <= new Date() || challenge.consumedAt) throw new OrderRequestError('Confirmação NFC expirada ou já utilizada.');
              const locked = await tx.$queryRaw<Array<{ id: string }>>`
                SELECT "id" FROM "NfcComanda" WHERE "id" = ${challenge.comandaId}::uuid AND "restaurantId" = ${resolvedRestaurantId} FOR UPDATE
              `;
              if (locked.length !== 1) throw new OrderRequestError('Comanda NFC indisponível.');
              const comanda = await tx.nfcComanda.findFirst({ where: { id: challenge.comandaId, restaurantId: resolvedRestaurantId }, select: { status: true, dueAt: true, cardId: true, customerId: true, totalCents: true, paidCents: true } });
              const card = await tx.nfcCard.findFirst({ where: { id: challenge.cardId, restaurantId: resolvedRestaurantId, status: 'ACTIVE' }, select: { customerId: true } });
              if (!comanda || comanda.status !== 'OPEN' || comanda.dueAt <= new Date() || comanda.cardId !== challenge.cardId || comanda.customerId !== challenge.customerId || card?.customerId !== challenge.customerId) throw new OrderRequestError('Comanda NFC, cartão ou prazo inválidos.');
              if (JSON.stringify(challenge.draftItems) !== JSON.stringify(items)) throw new OrderRequestError('Itens diferentes dos confirmados pelo cliente.');
              nfcContext = { comandaId: challenge.comandaId, customerId: challenge.customerId, cardId: challenge.cardId };
            }
            let tableParticipant: {
              id: number;
              userId: number | null;
              publicId: string;
              displayName: string | null;
            } | null = null;

            if (type === OrderType.MESA) {
              await lockTablePaymentSession(tx, resolvedRestaurantId, Number(tableSessionId));
              const tableAccountSettings =
                await tableAccountSettingsRepository.findByRestaurantId(resolvedRestaurantId, tx);
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
                throw new OrderRequestError(
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
                select: { id: true, userId: true, publicId: true, displayName: true },
              });
              if (!tableParticipant)
                throw new OrderRequestError(
                  'Sua identificação nesta mesa expirou. Leia o QR Code novamente antes de pedir.',
                );
            }

            const queueForCapacity = await shouldQueueOperationalOrder(
              tx,
              resolvedRestaurantId,
              restaurantSettings?.maxConcurrentOrders,
            );
            const initialStatus = queueForCapacity
              ? OrderStatus.PENDENTE
              : configuredInitialStatus;
            const resolvedUserId =
              type === OrderType.MESA
                ? (tableParticipant?.userId ?? null)
                : type === OrderType.NFC ? null : await this.resolveOrderUser({
                    tx,
                    userId,
                    restaurantId: resolvedRestaurantId,
                    customerName,
                    customerPhone,
                    guestPasswordHash,
                  });

            if (isUnpaidDigitalPayment && enforceSingleActiveOnlinePayment) {
              await assertNoActiveOnlinePayment({
                db: tx,
                restaurantId: resolvedRestaurantId,
                type,
                userId: resolvedUserId,
                tableSessionId: type === OrderType.MESA ? Number(tableSessionId) : null,
                participantId: type === OrderType.MESA ? Number(tableParticipant?.id) : null,
              });
            }

            const pricing = await orderPricingService.quote({
              restaurantId: resolvedRestaurantId,
              userId: resolvedUserId,
              type,
              items,
              couponRedemptionId,
              couponCode,
              deliveryDistanceMeters,
              db: tx,
            });
            const { products, orderItems } = pricing;
            // Lock the campaign row atomically before counting per-customer uses.
            // Order creation and usage reservation share the same transaction.
            if (pricing.couponId && !pricing.couponRedemptionId) {
              const consumed = await tx.$executeRaw`
                UPDATE "Coupon"
                SET "usageCount" = "usageCount" + 1
                WHERE "id" = ${pricing.couponId}
                  AND "restaurantId" = ${resolvedRestaurantId}
                  AND "kind" = 'PROMOTIONAL'::"CouponKind"
                  AND "active" = true
                  AND ("expiration" IS NULL OR "expiration" > NOW())
                  AND ("usageLimit" IS NULL OR "usageCount" < "usageLimit")
              `;
              if (consumed !== 1) {
                throw new OrderRequestError('Cupom promocional esgotado ou indisponível.');
              }
              const priorUses = await tx.order.count({
                where: promotionalCustomerScope({
                  restaurantId: resolvedRestaurantId,
                  couponId: pricing.couponId,
                  userId: resolvedUserId,
                  participantId: tableParticipant?.id ?? null,
                  tableSessionId: type === OrderType.MESA ? Number(tableSessionId) : null,
                }),
              });
              const policy = await tx.coupon.findFirst({
                where: { id: pricing.couponId, restaurantId: resolvedRestaurantId },
                select: { perCustomerLimit: true, audience: true, inactivityMonths: true },
              });
              if (!policy || priorUses >= policy.perCustomerLimit) {
                throw new OrderRequestError('Você atingiu o limite de utilizações deste cupom.');
              }
              if (policy.audience !== 'ALL') {
                if (!userId || Number(userId) !== Number(resolvedUserId)) {
                  throw new OrderRequestError('Entre com sua conta para usar cupons exclusivos.');
                }
                const customer = await tx.user.findFirst({
                  where: { id: Number(userId), role: 'CLIENTE', restaurantId: resolvedRestaurantId, active: true },
                  select: { id: true, email: true },
                });
                if (!customer || String(customer.email || '').endsWith('@gastronexa.local')) {
                  throw new OrderRequestError('Cupom exclusivo para contas de clientes autenticados.');
                }
                await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${Number(userId)} FOR UPDATE`;
                const previous = await tx.order.count({
                  where: { restaurantId: resolvedRestaurantId, userId: Number(userId),
                    paid: true, refundedAt: null, status: { not: OrderStatus.CANCELADO } },
                });
                const lastPaidOrder = policy.audience === 'INACTIVE_CUSTOMERS'
                  ? await tx.order.findFirst({
                      where: { restaurantId: resolvedRestaurantId, userId: Number(userId),
                        paid: true, refundedAt: null, status: { not: OrderStatus.CANCELADO } },
                      orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
                      select: { paidAt: true, createdAt: true },
                    })
                  : null;
                const targeted = policy.audience === 'SPECIFIC_CUSTOMERS'
                  ? await tx.couponRecipient.findFirst({
                      where: { restaurantId: resolvedRestaurantId, couponId: pricing.couponId, userId: Number(userId) },
                    })
                  : null;
                if (!isPromotionalAudienceEligible(policy.audience, previous, {
                  lastPaidAt: lastPaidOrder?.paidAt || lastPaidOrder?.createdAt || null,
                  inactivityMonths: policy.inactivityMonths, recipient: Boolean(targeted),
                })) {
                  if (policy.audience === 'NEW_CUSTOMERS')
                    throw new OrderRequestError('Este cupom é exclusivo para a primeira compra.');
                  if (policy.audience === 'RETURNING_CUSTOMERS')
                    throw new OrderRequestError('Este cupom é exclusivo para clientes recorrentes.');
                  throw new OrderRequestError('Cupom não disponível para este cliente.');
                }
              }
            }

            if (type === OrderType.MESA) {
              const tableAccountSettings =
                await tableAccountSettingsRepository.findByRestaurantId(resolvedRestaurantId, tx);
              if (!tableAccountSettings.enabled)
                throw new OrderRequestError(
                  'A conta por mesa está desativada. Peça ao administrador para revisar as configurações.',
                );
              if (
                tableContinuation?.settlementMode === TableOrderSettlementMode.PAY_NOW &&
                !tableAccountSettings.allowOnlinePayment
              )
                throw new OrderRequestError(
                  'O pagamento online de pedidos da mesa está desativado neste restaurante.',
                );
              if (
                tableContinuation?.settlementMode === TableOrderSettlementMode.TABLE_ACCOUNT
              ) {
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
                if (prepayment.required)
                  throw new OrderRequestError(
                    prepayment.reason === 'SCHEDULE'
                      ? 'Neste horário, o pedido da mesa precisa ser pago antes de ser enviado.'
                      : 'Este pedido ultrapassa o limite da conta da mesa. Escolha pagar agora.',
                  );
              }
            }

            const guestSummary =
              type !== OrderType.MESA && !userId && customerName
                ? `Cliente: ${String(customerName).trim()}`
                : '';
            const mergedObservation = [guestSummary, observation]
              .map((item) => String(item || '').trim())
              .filter(Boolean)
              .join(' | ');
            const normalizedTableId =
              tableId === null || tableId === undefined || tableId === '' ? null : Number(tableId);

            const order = await orderRepository.create(
              {
                ...(creationRequest
                  ? {
                      creationRequestKey: creationRequest.key,
                      creationActor: creationRequest.actor,
                      creationFingerprint: creationRequest.fingerprint,
                    }
                  : {}),
                total: pricing.total,
                itemsSubtotal: pricing.itemsSubtotal,
                productDiscountTotal: pricing.productDiscountTotal,
                couponDiscount: pricing.couponDiscount,
                deliveryFeeAmount: pricing.deliveryFeeAmount,
                deliveryDistanceMeters,
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
                payOnDeliveryMethod: shouldPayOnDelivery
                  ? effectivePaymentMethod
                  : pickupPaymentMethod || null,
                paid: shouldMarkAsPaid,
                pixPaymentId: normalizedPixPaymentId || null,
                paidAt,
                paymentProof: null,
                paymentProofImage: null,
                observation: mergedObservation || null,
                userId: resolvedUserId,
                restaurantId: resolvedRestaurantId,
                nfcComandaId: nfcContext?.comandaId ?? null,
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
                preparationStartedAt:
                  initialStatus === OrderStatus.PREPARANDO ? new Date() : null,
                capacityQueuedAt: queueForCapacity ? new Date() : null,
                capacityAdmittedAt: null,
              },
              tx,
            );

            // Persiste a autorização junto com o pedido, antes de iniciar o gateway.
            // Assim um webhook de pagamento imediato não encontra consentimento ausente.
            if (whatsappOptIn === true && type !== OrderType.MESA) {
              await recordWhatsappOrderNotificationOptIn({
                restaurantId: resolvedRestaurantId,
                orderId: order.id,
                userId: resolvedUserId,
                customerPhone,
              }, tx);
            }

            await reserveCouponRedemption({
              redemptionId: pricing.couponRedemptionId,
              restaurantId: resolvedRestaurantId,
              userId: resolvedUserId,
              db: tx,
            });
            if (shouldMarkAsPaid)
              await markCouponRedemptionUsedForOrder(order.id, resolvedRestaurantId, tx);

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
                select: { id: true, orderId: true, productId: true, quantity: true, price: true },
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
              if (billTotalCents !== expectedOrderTotalCents)
                throw new Error(
                  'Não foi possível fechar os centavos dos itens com o total do pedido da mesa.',
                );
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

            if (nfcContext && nfcChallengeId) {
              const totalCents = BigInt(Math.round(Number(pricing.total) * 100));
              const units = persistedOrderItems.map((item, index) => ({
                id: crypto.randomUUID(), restaurantId: resolvedRestaurantId,
                comandaId: nfcContext.comandaId, kind: 'ORDER' as const,
                sourceOrderId: order.id, sourceOrderItemId: item.id,
                description: products[index].name, quantity: Number(item.quantity),
                unitPriceCents: BigInt(Math.round(Number(item.price) * 100)),
                totalCents: BigInt(Math.round(Number(item.price) * Number(item.quantity) * 100)),
              }));
              if (units.reduce((sum, item) => sum + item.totalCents, 0n) !== totalCents) throw new OrderRequestError('Preço NFC não confere com a comanda.');
              await tx.nfcComandaItem.createMany({ data: units });
              await tx.nfcComanda.updateMany({ where: { id: nfcContext.comandaId, restaurantId: resolvedRestaurantId, status: 'OPEN' }, data: { totalCents: { increment: totalCents } } });
              const changed = await tx.nfcOrderConfirmation.updateMany({ where: { id: nfcChallengeId, restaurantId: resolvedRestaurantId, consumedAt: null }, data: { consumedAt: new Date(), orderId: order.id } });
              if (changed.count !== 1) throw new OrderRequestError('Pedido NFC já processado.');
            }
            const requestedQuantityByProduct = new Map<number, number>();
            orderItems.forEach((item) => {
              const snapshot = item.configurationSnapshot as
                | {
                    kind?: string;
                    comboComponents?: Array<{ productId?: number; quantity?: number }>;
                  }
                | undefined;
              if (snapshot?.kind === 'COMBO') {
                (snapshot.comboComponents || []).forEach((component) => {
                  const productId = Number(component.productId);
                  const perCombo = Number(component.quantity);
                  if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(perCombo) || perCombo <= 0) {
                    throw new OrderRequestError('A composição do combo ficou inválida. Atualize a sacola.');
                  }
                  const requestedQuantity = perCombo * Number(item.quantity);
                  requestedQuantityByProduct.set(
                    productId,
                    (requestedQuantityByProduct.get(productId) || 0) + requestedQuantity,
                  );
                });
                return;
              }
              requestedQuantityByProduct.set(
                item.productId,
                (requestedQuantityByProduct.get(item.productId) || 0) + Number(item.quantity),
              );
            });

            const stockProductById = new Map(
              products.map((product) => [
                product.id,
                {
                  id: product.id,
                  name: product.name,
                  stock: product.stock,
                  active: product.active,
                },
              ]),
            );
            const missingStockProductIds = [...requestedQuantityByProduct.keys()].filter(
              (productId) => !stockProductById.has(productId),
            );
            if (missingStockProductIds.length) {
              const comboComponents = await tx.product.findMany({
                where: {
                  restaurantId: resolvedRestaurantId,
                  id: { in: missingStockProductIds },
                },
                select: { id: true, name: true, stock: true, active: true },
              });
              comboComponents.forEach((product) => stockProductById.set(product.id, product));
            }
            if (
              [...requestedQuantityByProduct.keys()].some(
                (productId) => !stockProductById.has(productId),
              )
            ) {
              throw new OrderRequestError('Um produto do pedido não está mais disponível.');
            }

            for (const [productId, requestedQuantity] of requestedQuantityByProduct) {
              const product = stockProductById.get(productId)!;
              if (product.active === false) {
                throw new OrderRequestError(`Produto indisponível: ${product.name}.`);
              }
              const stockValue =
                product.stock === null || product.stock === undefined ? null : Number(product.stock);
              if (!Number.isInteger(stockValue) || Number(stockValue) < 0) continue;
              const decremented = await tx.product.updateMany({
                where: {
                  id: productId,
                  restaurantId: resolvedRestaurantId,
                  active: true,
                  stock: { gte: requestedQuantity },
                },
                data: { stock: { decrement: requestedQuantity } },
              });
              if (decremented.count !== 1)
                throw new OrderRequestError(
                  `Estoque de ${product.name} mudou. Confira a quantidade e tente novamente.`,
                );
            }

            if (!shouldDeferRealtimeUntilPaid && !queueForCapacity)
              await kitchenPrintingService.enqueueAutomatic({
                restaurantId: resolvedRestaurantId,
                orderId: order.id,
                event: 'OPERATIONAL_NEW_ORDER',
                db: tx,
              });
            const persistedOrder = await orderRepository.findById(
              order.id,
              resolvedRestaurantId,
              tx,
            );
            if (!persistedOrder)
              throw new Error('Pedido criado não foi encontrado na transação.');
            // O bloqueio do checkout de mesa participa do mesmo commit de
            // pedido, estoque, cupons e itens; não há janela após o commit.
            if (
              type === OrderType.MESA &&
              tableContinuation?.settlementMode === TableOrderSettlementMode.PAY_NOW
            ) {
              if (!tableParticipant) throw new OrderRequestError('Participante da mesa não encontrado.');
              await tableParticipantStateService.blockOrderingUntilPayment(tx, {
                participantId: tableParticipant.id,
                tableSessionId: Number(tableSessionId),
                restaurantId: resolvedRestaurantId,
              });
            }
            // Defesa para fluxos internos legados de criação já paga. O
            // checkout público continua proibido de definir paid=true.
            if (shouldMarkAsPaid) {
              await notifyCustomerPaymentConfirmed({
                restaurantId: persistedOrder.restaurantId,
                customerPhone,
                customerName: persistedOrder.user?.name || persistedOrder.participant?.displayName || customerName,
                restaurantName: persistedOrder.restaurant?.name,
                restaurantWhatsapp: persistedOrder.restaurant?.whatsapp,
                orderId: persistedOrder.id,
                total: persistedOrder.total,
                paymentMethod: normalizedPaymentMethod,
              }, tx);
            }
            return { order: persistedOrder, replayed: false };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const createdOrder = withoutOrderCreationMetadata(creation.order);
    if (creation.replayed) {
      if (deferRealtimeUntilPaid)
        throw new PaymentCreationUncertainError(createdOrder.id, createdOrder.publicId);
      return createdOrder;
    }

    const queuedForCapacity = isOrderCapacityQueued(createdOrder);
    if (!shouldDeferRealtimeUntilPaid && !queuedForCapacity) {
      io.to(`restaurant:${createdOrder.restaurantId}`).emit('new-order', createdOrder);
      if (createdOrder.userId) io.to(`user:${createdOrder.userId}`).emit('new-order', createdOrder);
      emitWaiterTableOrderEvent(io, 'new-order', createdOrder);
      emitTableSessionOrderEvent(io, 'new-order', createdOrder);
    }

    if (queuedForCapacity) {
      io.to(`restaurant:${createdOrder.restaurantId}`).emit('order:capacity-queued', createdOrder);
    }

    if (createdOrder.type === OrderType.MESA && createdOrder.tableSessionId) {
      await tableAccountEvents.updated({
        sessionId: Number(createdOrder.tableSessionId),
        restaurantId: createdOrder.restaurantId,
        reason: 'ORDER_CHANGED',
      });
    }

    if (shouldMarkAsPaid) {
      io.to(`restaurant:${createdOrder.restaurantId}`).emit('order:payment-confirmed', {
        orderId: createdOrder.id,
        paymentMethod: normalizedPaymentMethod,
        paid: true,
        status: createdOrder.status,
      });
      if (createdOrder.userId)
        io.to(`user:${createdOrder.userId}`).emit('payment-confirmed', {
          orderId: createdOrder.id,
          paymentMethod: normalizedPaymentMethod,
          paid: true,
          status: createdOrder.status,
        });
    }
    if (queuedForCapacity && !shouldDeferRealtimeUntilPaid) {
      const admitted = await orderCapacityQueueService.drainAfterCapacityChange(createdOrder.restaurantId);
      return admitted.find((order) => order.id === createdOrder.id) || createdOrder;
    }
    return createdOrder;
  }
}

export default new CreateOrderService();
