import crypto from 'node:crypto';
import { Prisma, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { tableParticipantIdentityInputSchema } from '../../tableAccount/domain/tableAccountSchemas.js';
import tableParticipantRepository from '../repositories/TableParticipantRepository.js';
import tableParticipantStateService, {
  normalizeParticipantPhone,
} from './TableParticipantStateService.js';
import {
  createParticipantToken,
  getParticipantCookieName,
  hashParticipantToken,
  isParticipantTokenShape,
  resolveParticipantTokenExpiration,
} from '../security/participantToken.js';

type SessionIdentity = {
  id: number;
  publicId: string;
  restaurantId: number;
  expiresAt: Date | null;
};

type AuthenticatedIdentity = {
  id: number | null;
  role: string;
} | null;

type JoinParticipantInput = {
  session: SessionIdentity;
  authenticatedUser?: AuthenticatedIdentity;
  cookies?: Record<string, string>;
  displayName?: unknown;
  phone?: unknown;
};

export class TableParticipantIdentityRequiredError extends Error {
  readonly statusCode = 422;
  readonly code = 'TABLE_PARTICIPANT_IDENTITY_REQUIRED';

  constructor(message = 'Informe seu nome e telefone para continuar nesta mesa.') {
    super(message);
    this.name = 'TableParticipantIdentityRequiredError';
  }
}

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

function toPublicParticipant(
  participant: {
    publicId: string;
    userId: number | null;
    displayName: string | null;
    status: string;
    joinedAt: Date;
    leftAt: Date | null;
    user?: { name: string } | null;
  },
  state: { phone: string | null; orderingBlockedAt: Date | null } | null,
) {
  return {
    publicId: participant.publicId,
    displayName: participant.displayName || participant.user?.name || null,
    phone: state?.phone || null,
    authenticated: Boolean(participant.userId),
    orderingBlocked: Boolean(state?.orderingBlockedAt),
    status: participant.status,
    joinedAt: participant.joinedAt,
    leftAt: participant.leftAt,
  };
}

export class JoinTableParticipantService {
  async execute({
    session,
    authenticatedUser,
    cookies = {},
    displayName,
    phone,
  }: JoinParticipantInput) {
    const identity = tableParticipantIdentityInputSchema.parse(
      displayName === undefined && phone === undefined ? {} : { displayName, phone },
    );
    const cookieName = getParticipantCookieName(session.publicId);
    const existingRawToken = cookies[cookieName];
    const existingTokenHash = isParticipantTokenShape(existingRawToken)
      ? hashParticipantToken(existingRawToken)
      : null;
    const authenticatedCustomerId =
      authenticatedUser?.role === UserRole.CLIENTE && Number(authenticatedUser.id) > 0
        ? Number(authenticatedUser.id)
        : null;

    if (authenticatedCustomerId) {
      const result = await prisma.$transaction(
        async (tx) => {
          await setTenantDbContext(tx, session.restaurantId);
          const activeCustomer = await tx.user.findFirst({
            where: {
              id: authenticatedCustomerId,
              role: UserRole.CLIENTE,
              active: true,
            },
            select: { id: true, name: true, phone: true },
          });
          if (!activeCustomer) {
            throw new Error('A conta autenticada não está disponível para entrar nesta mesa.');
          }

          const existingAuthenticated = await tableParticipantRepository.findByUser(
            authenticatedCustomerId,
            session.id,
            session.restaurantId,
            tx,
          );
          const guest = existingTokenHash
            ? await tableParticipantRepository.findGuestByTokenHash(
                existingTokenHash,
                session.id,
                session.restaurantId,
                tx,
              )
            : null;

          let participant;
          if (guest && existingAuthenticated && guest.id !== existingAuthenticated.id) {
            await tableParticipantRepository.transferOwnedTableData(
              guest.id,
              existingAuthenticated.id,
              authenticatedCustomerId,
              session.id,
              session.restaurantId,
              tx,
            );
            await tableParticipantRepository.revoke(guest.id, session.id, session.restaurantId, tx);
            participant = existingAuthenticated;
          } else if (guest) {
            try {
              participant = await tableParticipantRepository.linkGuestToUser(
                guest.id,
                authenticatedCustomerId,
                identity.displayName ?? activeCustomer.name ?? guest.displayName,
                session.id,
                session.restaurantId,
                tx,
              );
              await tableParticipantRepository.attachUserToOwnedOrders(
                participant.id,
                authenticatedCustomerId,
                session.id,
                session.restaurantId,
                tx,
              );
            } catch (error: unknown) {
              if (!isUniqueConflict(error)) throw error;
              const concurrentParticipant = await tableParticipantRepository.findByUser(
                authenticatedCustomerId,
                session.id,
                session.restaurantId,
                tx,
              );
              if (!concurrentParticipant) throw error;
              await tableParticipantRepository.transferOwnedTableData(
                guest.id,
                concurrentParticipant.id,
                authenticatedCustomerId,
                session.id,
                session.restaurantId,
                tx,
              );
              await tableParticipantRepository.revoke(
                guest.id,
                session.id,
                session.restaurantId,
                tx,
              );
              participant = concurrentParticipant;
            }
          } else {
            participant = await tableParticipantRepository.upsertAuthenticated(
              {
                publicId: crypto.randomUUID(),
                restaurantId: session.restaurantId,
                tableSessionId: session.id,
                userId: authenticatedCustomerId,
                displayName: identity.displayName ?? activeCustomer.name,
              },
              tx,
            );
          }

          const accountPhone = (() => {
            try {
              return normalizeParticipantPhone(activeCustomer.phone);
            } catch {
              return null;
            }
          })();
          const state = await tableParticipantStateService.upsertIdentity(tx, {
            participantId: participant.id,
            tableSessionId: session.id,
            restaurantId: session.restaurantId,
            phone: identity.phone ?? accountPhone ?? undefined,
          });
          return { participant, state };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return {
        participant: toPublicParticipant(result.participant, result.state),
        participantToken: null,
        participantCookieName: cookieName,
        participantCookieExpiresAt: null,
        clearParticipantCookie: Boolean(existingRawToken),
      };
    }

    const guestResult = await prisma.$transaction(
      async (tx) => {
        await setTenantDbContext(tx, session.restaurantId);
        const existingGuest = existingTokenHash
          ? await tableParticipantRepository.findGuestByTokenHash(
              existingTokenHash,
              session.id,
              session.restaurantId,
              tx,
            )
          : null;

        if (existingGuest) {
          const currentState = await tableParticipantStateService.getState(tx, {
            participantId: existingGuest.id,
            tableSessionId: session.id,
            restaurantId: session.restaurantId,
          });
          const nextName = identity.displayName ?? existingGuest.displayName;
          const nextPhone = identity.phone ?? currentState?.phone ?? null;
          if (!nextName || !nextPhone) {
            throw new TableParticipantIdentityRequiredError();
          }

          const participant =
            nextName !== existingGuest.displayName
              ? await tableParticipantRepository.updateDisplayName(
                  existingGuest.id,
                  session.id,
                  session.restaurantId,
                  nextName,
                  tx,
                )
              : existingGuest;
          const state = await tableParticipantStateService.upsertIdentity(tx, {
            participantId: participant.id,
            tableSessionId: session.id,
            restaurantId: session.restaurantId,
            phone: nextPhone,
          });
          return { participant, state, token: existingRawToken };
        }

        if (!identity.displayName || !identity.phone) {
          throw new TableParticipantIdentityRequiredError();
        }

        const participantToken = createParticipantToken();
        const participantCookieExpiresAt = resolveParticipantTokenExpiration(session.expiresAt);
        const participant = await tableParticipantRepository.createGuest(
          {
            publicId: crypto.randomUUID(),
            restaurantId: session.restaurantId,
            tableSessionId: session.id,
            displayName: identity.displayName,
            guestTokenHash: hashParticipantToken(participantToken),
            tokenExpiresAt: participantCookieExpiresAt,
          },
          tx,
        );
        const state = await tableParticipantStateService.upsertIdentity(tx, {
          participantId: participant.id,
          tableSessionId: session.id,
          restaurantId: session.restaurantId,
          phone: identity.phone,
        });
        return { participant, state, token: participantToken, participantCookieExpiresAt };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return {
      participant: toPublicParticipant(guestResult.participant, guestResult.state),
      participantToken: guestResult.token,
      participantCookieName: cookieName,
      participantCookieExpiresAt:
        'participantCookieExpiresAt' in guestResult ? guestResult.participantCookieExpiresAt : null,
      clearParticipantCookie: false,
    };
  }
}

export default new JoinTableParticipantService();
