import { createHash } from 'node:crypto';

const CONFIRMATION_VERSION = 1;

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, canonicalize(nestedValue)]),
    );
  }
  return value;
}

function assertRequiredConfirmationFields({
  action,
  databaseLabel,
  email,
  targetId,
  before,
  after,
}) {
  if (!action || !databaseLabel || !email) {
    throw new Error('A confirmação administrativa exige ação, banco e email.');
  }
  if (targetId === undefined) {
    throw new Error('A confirmação administrativa exige o ID alvo ou null para criação.');
  }
  if (before === undefined || after === undefined) {
    throw new Error('A confirmação administrativa exige os estados before e after.');
  }
}

/**
 * Vincula a confirmação ao alvo e a todos os efeitos descritos pelo plano.
 * O resumo evita expor dados sensíveis ou produzir uma linha de comando enorme.
 */
export function buildAdminChangeConfirmation({
  action,
  databaseLabel,
  email,
  targetId,
  before,
  after,
  requested,
}) {
  assertRequiredConfirmationFields({ action, databaseLabel, email, targetId, before, after });
  const payload = canonicalize({
    version: CONFIRMATION_VERSION,
    action,
    databaseLabel,
    email: String(email).trim().toLowerCase(),
    targetId,
    before,
    after,
    requested: requested ?? null,
  });
  const fingerprint = createHash('sha256')
    .update(JSON.stringify(payload), 'utf8')
    .digest('hex')
    .slice(0, 24);
  return `${action}:${targetId ?? 'NEW'}:${databaseLabel}:${fingerprint}`;
}

export function assertActiveSuperAdminContinuity({ before, after, activeSuperAdminCount }) {
  const removesActiveSuperAdmin =
    before?.role === 'SUPER_ADMIN' &&
    before?.active === true &&
    (after?.role !== 'SUPER_ADMIN' || after?.active !== true);

  if (removesActiveSuperAdmin && activeSuperAdminCount <= 1) {
    throw new Error(
      'Operação bloqueada: não é permitido demover ou desativar o último SUPER_ADMIN ativo.',
    );
  }
}

export function buildSuperAdminAfterState({ existing, activate, resetPassword }) {
  return {
    role: 'SUPER_ADMIN',
    subRole: null,
    restaurantId: null,
    active: existing ? existing.active || activate : true,
    authVersion: existing ? existing.authVersion + 1 : 0,
    mfaEnabled: true,
    mustChangePassword: existing ? existing.mustChangePassword || resetPassword : true,
  };
}

export function snapshotsMatch(actual, expected, fields) {
  return fields.every((field) => actual?.[field] === expected?.[field]);
}
