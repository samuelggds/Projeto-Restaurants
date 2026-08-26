import {
  Prisma,
  TablePaymentEventType,
  TablePaymentIntentStatus,
  TablePaymentMethod,
} from '@prisma/client';
import prisma from '../../../config/prisma.js';
import type { TableAccountActor } from '../domain/tableAccountContracts.js';
import { canConfirmManualTablePayment } from '../domain/tableAccountRules.js';
import tablePaymentRepository, {
  tablePaymentIntentDtoSelect,
} from '../repositories/TablePaymentRepository.js';
import {
  expireTablePaymentReservations,
  lockTablePaymentSession,
  projectTableSessionFinancialState,
} from './tablePaymentLedger.js';
import { serializeTablePaymentIntent, TablePaymentError } from './tablePaymentSupport.js';

export class ConfirmManualTablePaymentService {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async execute(input: { publicId: string; actor: TableAccountActor }) {
    const restaurantId = Number(input.actor.restaurantId || 0);
    if (!canConfirmManualTablePayment(input.actor, restaurantId)) {
      throw new TablePaymentError(
        'Somente o administrador ou um garçom deste restaurante pode confirmar o pagamento.',
        403,
        'MANUAL_PAYMENT_FORBIDDEN',
      );
    }

    const initial = await tablePaymentRepository.findForStaffByPublicId(
      input.publicId,
      restaurantId,
    );
    if (!initial) {
      throw new TablePaymentError(
        'Pagamento presencial não encontrado neste restaurante.',
        404,
        'TABLE_PAYMENT_NOT_FOUND',
      );
    }

    const now = this.now();
    const updated = await prisma.$transaction(
      async (tx) => {
        await lockTablePaymentSession(tx, restaurantId, initial.tableSessionId);
        await expireTablePaymentReservations(tx, restaurantId, initial.tableSessionId, now);

        const intent = await tablePaymentRepository.findForStaffByPublicId(
          input.publicId,
          restaurantId,
          tx,
        );
        if (!intent) {
          throw new TablePaymentError(
            'Pagamento presencial não encontrado neste restaurante.',
            404,
            'TABLE_PAYMENT_NOT_FOUND',
          );
        }

        const manualMethod =
          intent.method === TablePaymentMethod.CASH ||
          intent.method === TablePaymentMethod.CARD_MACHINE;
        if (!manualMethod) {
          throw new TablePaymentError(
            'Somente pagamentos em dinheiro ou maquininha podem ser confirmados manualmente.',
            409,
            'NOT_A_MANUAL_PAYMENT',
          );
        }

        if (
          intent.status === TablePaymentIntentStatus.PAID &&
          intent.manualConfirmedById === input.actor.id
        ) {
          return intent;
        }
        if (
          intent.status !== TablePaymentIntentStatus.RESERVED &&
          intent.status !== TablePaymentIntentStatus.PROCESSING
        ) {
          throw new TablePaymentError(
            'Este pagamento não está mais aguardando confirmação.',
            409,
            'MANUAL_PAYMENT_NOT_PENDING',
          );
        }

        const changed = await tx.tablePaymentIntent.updateMany({
          where: {
            id: intent.id,
            restaurantId,
            tableSessionId: intent.tableSessionId,
            status: intent.status,
          },
          data: {
            status: TablePaymentIntentStatus.PAID,
            paidAt: now,
            manualConfirmedAt: now,
            manualConfirmedById: input.actor.id,
          },
        });
        if (changed.count !== 1) {
          throw new TablePaymentError(
            'O pagamento foi atualizado por outra operação. Atualize a conta.',
            409,
            'TABLE_PAYMENT_CONFLICT',
          );
        }

        await tx.tablePaymentEvent.create({
          data: {
            restaurantId,
            tableSessionId: intent.tableSessionId,
            paymentIntentId: intent.id,
            deduplicationKey: `table-payment:${intent.publicId}:manual-confirmed`,
            type: TablePaymentEventType.MANUAL_CONFIRMED,
            fromStatus: intent.status,
            toStatus: TablePaymentIntentStatus.PAID,
            amountCents: intent.totalCents,
            actorUserId: input.actor.id,
            occurredAt: now,
          },
        });
        await projectTableSessionFinancialState(tx, restaurantId, intent.tableSessionId, now);

        return tx.tablePaymentIntent.findUniqueOrThrow({
          where: { id: intent.id },
          select: tablePaymentIntentDtoSelect,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return {
      payment: serializeTablePaymentIntent(updated, initial.tableSession.publicId),
    };
  }
}

export default new ConfirmManualTablePaymentService();
