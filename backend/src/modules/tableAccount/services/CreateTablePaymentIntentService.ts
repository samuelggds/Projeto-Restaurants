import {
  Prisma,
  TablePaymentEventType,
  TablePaymentIntentStatus,
  TablePaymentMethod,
} from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { createTablePaymentIntentInputSchema } from '../domain/tableAccountSchemas.js';
import {
  calculateServiceFeeCents,
  shouldIncludeServiceFee,
  sumMoneyCents,
} from '../domain/tableAccountRules.js';
import { buildTablePaymentPlan, TablePaymentPlanError } from '../domain/tablePaymentPlan.js';
import fakePaymentProvider, { FakePaymentProvider } from '../providers/FakePaymentProvider.js';
import type { PaymentProvider } from '../providers/PaymentProvider.js';
import tablePaymentRepository, {
  tablePaymentIntentDtoSelect,
  type TablePaymentIntentRecord,
} from '../repositories/TablePaymentRepository.js';
import tableAccountSettingsRepository from '../repositories/TableAccountSettingsRepository.js';
import {
  expireTablePaymentReservations,
  loadTablePaymentLedgerItems,
  lockTablePaymentSession,
  projectTableSessionFinancialState,
} from './tablePaymentLedger.js';
import {
  buildTablePaymentRequestFingerprint,
  serializeTablePaymentIntent,
  sha256,
  TablePaymentError,
} from './tablePaymentSupport.js';
import { tableAccountEvents } from '../realtime/tableAccountEvents.js';
import { ProcessTablePaymentWebhookService } from './ProcessTablePaymentWebhookService.js';

interface CreateTablePaymentIntentContext {
  tableSessionId: number;
  sessionPublicId: string;
  restaurantId: number;
  participantId: number;
}

interface FakeTablePaymentEnvironment {
  NODE_ENV?: string;
  FAKE_TABLE_PAYMENT_AUTO_APPROVE?: string;
}

export function shouldAutoApproveFakeTablePayment(
  environment: FakeTablePaymentEnvironment = process.env,
) {
  return (
    environment.NODE_ENV !== 'production' &&
    environment.NODE_ENV !== 'test' &&
    environment.FAKE_TABLE_PAYMENT_AUTO_APPROVE === 'true'
  );
}

export class CreateTablePaymentIntentService {
  constructor(
    private readonly provider: PaymentProvider = fakePaymentProvider,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(context: CreateTablePaymentIntentContext, rawInput: unknown) {
    const input = createTablePaymentIntentInputSchema.parse(rawInput);
    const now = this.now();
    const idempotencyKeyHash = sha256(input.idempotencyKey);
    const requestFingerprint = buildTablePaymentRequestFingerprint(
      context.participantId,
      input,
    );

    const reservation = await prisma.$transaction(
      async (tx) => {
        await lockTablePaymentSession(tx, context.restaurantId, context.tableSessionId);
        await expireTablePaymentReservations(
          tx,
          context.restaurantId,
          context.tableSessionId,
          now,
        );

        const session = await tablePaymentRepository.findSessionParticipantForPayment(
          context.tableSessionId,
          context.restaurantId,
          context.participantId,
          now,
          tx,
        );
        if (!session || session.publicId !== context.sessionPublicId) {
          throw new TablePaymentError(
            'Sua participação nesta mesa não está mais ativa.',
            403,
            'TABLE_PARTICIPANT_INACTIVE',
          );
        }

        const settings = await tableAccountSettingsRepository.findByRestaurantId(
          context.restaurantId,
          tx,
        );
        if (!settings.enabled) {
          throw new TablePaymentError(
            'A conta e o pagamento por mesa não estão habilitados neste restaurante.',
            409,
            'TABLE_ACCOUNT_DISABLED',
          );
        }

        const onlineMethod =
          input.method === TablePaymentMethod.PIX || input.method === TablePaymentMethod.CARD;
        if (onlineMethod && !settings.allowOnlinePayment) {
          throw new TablePaymentError(
            'O pagamento online da conta da mesa está desativado.',
            409,
            'ONLINE_TABLE_PAYMENT_DISABLED',
          );
        }
        if (input.method === TablePaymentMethod.CASH && !settings.allowCash) {
          throw new TablePaymentError(
            'O pagamento em dinheiro não está disponível para esta mesa.',
            409,
            'CASH_TABLE_PAYMENT_DISABLED',
          );
        }
        if (input.method === TablePaymentMethod.CARD_MACHINE && !settings.allowCardMachine) {
          throw new TablePaymentError(
            'O pagamento na maquininha não está disponível para esta mesa.',
            409,
            'CARD_MACHINE_TABLE_PAYMENT_DISABLED',
          );
        }
        if (input.selectionMode === 'EQUAL_SPLIT' && !settings.allowSplit) {
          throw new TablePaymentError(
            'A divisão igual da conta está desativada neste restaurante.',
            409,
            'TABLE_SPLIT_DISABLED',
          );
        }

        const existing = await tablePaymentRepository.findByIdempotencyHash(
          context.restaurantId,
          context.tableSessionId,
          idempotencyKeyHash,
          tx,
        );
        if (existing) {
          if (
            existing.payerParticipantId !== context.participantId ||
            existing.requestFingerprint !== requestFingerprint
          ) {
            throw new TablePaymentError(
              'Esta chave de idempotência já foi usada em outro pagamento.',
              409,
              'IDEMPOTENCY_KEY_REUSED',
            );
          }
          return { intent: existing, reused: true };
        }

        const ledgerItems = await loadTablePaymentLedgerItems(
          tx,
          context.restaurantId,
          context.tableSessionId,
          now,
        );
        let plan;
        try {
          plan = buildTablePaymentPlan({
            payment: input,
            participantId: context.participantId,
            items: ledgerItems,
          });
        } catch (error) {
          if (error instanceof TablePaymentPlanError) {
            throw new TablePaymentError(error.message, 409, error.code);
          }
          throw error;
        }
        const subtotalCents = plan.subtotalCents;
        const serviceFeeCents = shouldIncludeServiceFee(
          settings.serviceFeeMode,
          input.includeOptionalServiceFee,
        )
          ? calculateServiceFeeCents(subtotalCents, settings.serviceFeeBasisPoints)
          : 0;
        const totalCents = sumMoneyCents([subtotalCents, serviceFeeCents]);
        const allocationSeeds = plan.allocations;
        const expiresAt = new Date(now.getTime() + settings.reservationTimeoutMinutes * 60_000);

        const created = await tx.tablePaymentIntent.create({
          data: {
            restaurantId: context.restaurantId,
            tableSessionId: context.tableSessionId,
            payerParticipantId: context.participantId,
            selectionMode: input.selectionMode,
            method: input.method,
            status: TablePaymentIntentStatus.RESERVED,
            splitCount: input.splitCount || null,
            idempotencyKeyHash,
            requestFingerprint,
            subtotalCents: BigInt(subtotalCents),
            serviceFeeCents: BigInt(serviceFeeCents),
            totalCents: BigInt(totalCents),
            expiresAt,
          },
          select: {
            id: true,
            publicId: true,
          },
        });

        await tx.tablePaymentAllocation.createMany({
          data: allocationSeeds.map((allocation) => ({
            restaurantId: context.restaurantId,
            tableSessionId: context.tableSessionId,
            paymentIntentId: created.id,
            tableBillItemId: allocation.tableBillItemId,
            amountCents: BigInt(allocation.amountCents),
          })),
        });

        await tx.tablePaymentEvent.create({
          data: {
            restaurantId: context.restaurantId,
            tableSessionId: context.tableSessionId,
            paymentIntentId: created.id,
            deduplicationKey: `table-payment:${created.publicId}:created`,
            type: TablePaymentEventType.CREATED,
            fromStatus: null,
            toStatus: TablePaymentIntentStatus.RESERVED,
            amountCents: BigInt(totalCents),
            occurredAt: now,
          },
        });

        await projectTableSessionFinancialState(
          tx,
          context.restaurantId,
          context.tableSessionId,
          now,
        );

        const intent = await tx.tablePaymentIntent.findUniqueOrThrow({
          where: { id: created.id },
          select: tablePaymentIntentDtoSelect,
        });
        return { intent, reused: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    const onlineMethod =
      reservation.intent.method === TablePaymentMethod.PIX ||
      reservation.intent.method === TablePaymentMethod.CARD;

    if (
      !onlineMethod ||
      reservation.intent.status !== TablePaymentIntentStatus.RESERVED ||
      reservation.intent.providerExternalId
    ) {
      if (!reservation.reused) {
        await tableAccountEvents.updated({
          sessionId: context.tableSessionId,
          restaurantId: context.restaurantId,
          reason: 'PAYMENT_CREATED',
          paymentPublicId: reservation.intent.publicId,
          paymentStatus: reservation.intent.status,
        });
      }
      return {
        payment: serializeTablePaymentIntent(reservation.intent, context.sessionPublicId),
        idempotentReplay: reservation.reused,
      };
    }

    return this.createProviderPayment(context, reservation.intent, reservation.reused);
  }

  private async createProviderPayment(
    context: CreateTablePaymentIntentContext,
    intent: TablePaymentIntentRecord,
    reused: boolean,
  ) {
    try {
      const payment = await this.provider.createPayment({
        intentPublicId: intent.publicId,
        amountCents: Number(intent.totalCents),
        method: intent.method as 'PIX' | 'CARD',
        idempotencyKeyHash: intent.idempotencyKeyHash,
        expiresAt: intent.expiresAt,
      });

      const updated = await prisma.$transaction(
        async (tx) => {
          await lockTablePaymentSession(tx, context.restaurantId, context.tableSessionId);
          const changed = await tx.tablePaymentIntent.updateMany({
            where: {
              id: intent.id,
              restaurantId: context.restaurantId,
              tableSessionId: context.tableSessionId,
              status: TablePaymentIntentStatus.RESERVED,
            },
            data: {
              status: TablePaymentIntentStatus.PROCESSING,
              provider: this.provider.code,
              providerExternalId: payment.externalId,
              providerCheckoutUrl: payment.checkoutUrl,
              processingAt: this.now(),
            },
          });

          if (changed.count === 1) {
            await tx.tablePaymentEvent.create({
              data: {
                restaurantId: context.restaurantId,
                tableSessionId: context.tableSessionId,
                paymentIntentId: intent.id,
                deduplicationKey: `table-payment:${intent.publicId}:processing`,
                type: TablePaymentEventType.PROCESSING,
                fromStatus: TablePaymentIntentStatus.RESERVED,
                toStatus: TablePaymentIntentStatus.PROCESSING,
                provider: this.provider.code,
                amountCents: intent.totalCents,
                occurredAt: this.now(),
              },
            });
            await projectTableSessionFinancialState(
              tx,
              context.restaurantId,
              context.tableSessionId,
              this.now(),
            );
          }

          return tx.tablePaymentIntent.findUniqueOrThrow({
            where: { id: intent.id },
            select: tablePaymentIntentDtoSelect,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      await tableAccountEvents.updated({
        sessionId: context.tableSessionId,
        restaurantId: context.restaurantId,
        reason: 'PAYMENT_PROCESSING',
        paymentPublicId: updated.publicId,
        paymentStatus: updated.status,
      });
      this.scheduleFakeConfirmation(updated);

      return {
        payment: serializeTablePaymentIntent(updated, context.sessionPublicId),
        idempotentReplay: reused,
      };
    } catch (error) {
      await this.failProviderCreation(context, intent, error);
      throw new TablePaymentError(
        'Não foi possível iniciar o pagamento online. A reserva foi liberada.',
        502,
        'PAYMENT_PROVIDER_UNAVAILABLE',
      );
    }
  }

  private scheduleFakeConfirmation(intent: TablePaymentIntentRecord) {
    const provider = this.provider;
    if (
      !(provider instanceof FakePaymentProvider) ||
      !shouldAutoApproveFakeTablePayment() ||
      intent.status !== TablePaymentIntentStatus.PROCESSING ||
      !intent.providerExternalId
    ) {
      return;
    }

    const configuredDelay = Number(process.env.FAKE_TABLE_PAYMENT_APPROVAL_DELAY_MS || 1_500);
    const delayMs =
      Number.isSafeInteger(configuredDelay) && configuredDelay >= 250
        ? configuredDelay
        : 1_500;
    const timer = setTimeout(() => {
      void provider
        .simulatePaidWebhook(intent.providerExternalId as string)
        .then((event) => new ProcessTablePaymentWebhookService(provider).executeValidated(event))
        .catch((error) => {
          console.error(
            '[FAKE_TABLE_PAYMENT_AUTO_APPROVE_ERROR]',
            error instanceof Error ? error.name : 'UNKNOWN_ERROR',
          );
        });
    }, delayMs);
    timer.unref();
  }

  private async failProviderCreation(
    context: CreateTablePaymentIntentContext,
    intent: TablePaymentIntentRecord,
    error: unknown,
  ) {
    const failed = await prisma.$transaction(
      async (tx) => {
        await lockTablePaymentSession(tx, context.restaurantId, context.tableSessionId);
        const changed = await tx.tablePaymentIntent.updateMany({
          where: {
            id: intent.id,
            restaurantId: context.restaurantId,
            tableSessionId: context.tableSessionId,
            status: TablePaymentIntentStatus.RESERVED,
          },
          data: {
            status: TablePaymentIntentStatus.FAILED,
            failedAt: this.now(),
            failureCode: 'PROVIDER_CREATE_FAILED',
          },
        });

        if (changed.count === 1) {
          await tx.tablePaymentEvent.create({
            data: {
              restaurantId: context.restaurantId,
              tableSessionId: context.tableSessionId,
              paymentIntentId: intent.id,
              deduplicationKey: `table-payment:${intent.publicId}:provider-create-failed`,
              type: TablePaymentEventType.FAILED,
              fromStatus: TablePaymentIntentStatus.RESERVED,
              toStatus: TablePaymentIntentStatus.FAILED,
              provider: this.provider.code,
              amountCents: intent.totalCents,
              occurredAt: this.now(),
              metadata: {
                code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
              },
            },
          });
          await projectTableSessionFinancialState(
            tx,
            context.restaurantId,
            context.tableSessionId,
            this.now(),
          );
        }
        return changed.count === 1;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    if (failed) {
      await tableAccountEvents.updated({
        sessionId: context.tableSessionId,
        restaurantId: context.restaurantId,
        reason: 'PAYMENT_STATUS_CHANGED',
        paymentPublicId: intent.publicId,
        paymentStatus: TablePaymentIntentStatus.FAILED,
      });
    }
  }
}

export default new CreateTablePaymentIntentService();
