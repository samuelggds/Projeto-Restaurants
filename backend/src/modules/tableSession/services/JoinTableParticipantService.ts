import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { tableParticipantIdentityInputSchema } from '../../tableAccount/domain/tableAccountSchemas.js';
import tableParticipantRepository from '../repositories/TableParticipantRepository.js';
import tableParticipantStateService from './TableParticipantStateService.js';
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
  issuedGuestToken?: string;
};

export class TableParticipantIdentityRequiredError extends Error {
  readonly statusCode = 422;
  readonly code = 'TABLE_PARTICIPANT_IDENTITY_REQUIRED';

  constructor(message = 'Informe seu nome e telefone para continuar nesta mesa.') {
    super(message);
    this.name = 'TableParticipantIdentityRequiredError';
  }
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
    cookies = {},
    displayName,
    phone,
    issuedGuestToken,
  }: JoinParticipantInput) {
    const identity = tableParticipantIdentityInputSchema.parse(
      displayName === undefined && phone === undefined ? {} : { displayName, phone },
    );
    const cookieName = getParticipantCookieName(session.publicId);
    const existingRawToken = cookies[cookieName];
    const existingTokenHash = isParticipantTokenShape(existingRawToken)
      ? hashParticipantToken(existingRawToken)
      : null;
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

        const participantToken =
          issuedGuestToken && isParticipantTokenShape(issuedGuestToken)
            ? issuedGuestToken
            : createParticipantToken();
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
