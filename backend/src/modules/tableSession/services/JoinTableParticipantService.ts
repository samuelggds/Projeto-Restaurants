import crypto from 'node:crypto';
import { Prisma, UserRole } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { tableParticipantIdentityInputSchema } from '../../tableAccount/domain/tableAccountSchemas.js';
import tableParticipantRepository from '../repositories/TableParticipantRepository.js';
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
};

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}

function toPublicParticipant(participant: {
  publicId: string;
  userId: number | null;
  displayName: string | null;
  status: string;
  joinedAt: Date;
  leftAt: Date | null;
  user?: { name: string } | null;
}) {
  return {
    publicId: participant.publicId,
    displayName: participant.displayName || participant.user?.name || null,
    authenticated: Boolean(participant.userId),
    status: participant.status,
    joinedAt: participant.joinedAt,
    leftAt: participant.leftAt,
  };
}

export class JoinTableParticipantService {
  async execute({ session, authenticatedUser, cookies = {}, displayName }: JoinParticipantInput) {
    const identity = tableParticipantIdentityInputSchema.parse(
      displayName === undefined ? {} : { displayName },
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
      const participant = await prisma.$transaction(
        async (tx) => {
          const activeCustomer = await tx.user.findFirst({
            where: {
              id: authenticatedCustomerId,
              role: UserRole.CLIENTE,
              active: true,
            },
            select: { id: true },
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
            return existingAuthenticated;
          }

          if (guest) {
            try {
              const linkedParticipant = await tableParticipantRepository.linkGuestToUser(
                guest.id,
                authenticatedCustomerId,
                identity.displayName ?? guest.displayName,
                session.id,
                session.restaurantId,
                tx,
              );
              await tableParticipantRepository.attachUserToOwnedOrders(
                linkedParticipant.id,
                authenticatedCustomerId,
                session.id,
                session.restaurantId,
                tx,
              );
              return linkedParticipant;
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
              return concurrentParticipant;
            }
          }

          return tableParticipantRepository.upsertAuthenticated(
            {
              publicId: crypto.randomUUID(),
              restaurantId: session.restaurantId,
              tableSessionId: session.id,
              userId: authenticatedCustomerId,
              displayName: identity.displayName,
            },
            tx,
          );
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return {
        participant: toPublicParticipant(participant),
        participantToken: null,
        participantCookieName: cookieName,
        participantCookieExpiresAt: null,
        clearParticipantCookie: Boolean(existingRawToken),
      };
    }

    if (existingTokenHash) {
      const existingGuest = await tableParticipantRepository.findGuestByTokenHash(
        existingTokenHash,
        session.id,
        session.restaurantId,
      );
      if (existingGuest) {
        const participant =
          identity.displayName !== undefined && identity.displayName !== existingGuest.displayName
            ? await tableParticipantRepository.updateDisplayName(
                existingGuest.id,
                session.id,
                session.restaurantId,
                identity.displayName,
              )
            : existingGuest;

        return {
          participant: toPublicParticipant(participant),
          participantToken: existingRawToken,
          participantCookieName: cookieName,
          participantCookieExpiresAt: participant.tokenExpiresAt,
          clearParticipantCookie: false,
        };
      }
    }

    const participantToken = createParticipantToken();
    const participantCookieExpiresAt = resolveParticipantTokenExpiration(session.expiresAt);
    const participant = await tableParticipantRepository.createGuest({
      publicId: crypto.randomUUID(),
      restaurantId: session.restaurantId,
      tableSessionId: session.id,
      displayName: identity.displayName,
      guestTokenHash: hashParticipantToken(participantToken),
      tokenExpiresAt: participantCookieExpiresAt,
    });

    return {
      participant: toPublicParticipant(participant),
      participantToken,
      participantCookieName: cookieName,
      participantCookieExpiresAt,
      clearParticipantCookie: false,
    };
  }
}

export default new JoinTableParticipantService();
