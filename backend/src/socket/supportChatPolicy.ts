export type SupportChatRole = 'ADMIN' | 'SUPER_ADMIN' | 'FUNCIONARIO' | 'MOTOQUEIRO';

const operationalRoles = new Set<SupportChatRole>(['FUNCIONARIO', 'MOTOQUEIRO']);
const allowedRoles = new Set<SupportChatRole>([
  'ADMIN',
  'SUPER_ADMIN',
  'FUNCIONARIO',
  'MOTOQUEIRO',
]);

export function normalizeSupportChatRole(role: unknown) {
  return String(role || '')
    .trim()
    .toUpperCase() as SupportChatRole;
}

export function canSendSupportChat(role: unknown) {
  return allowedRoles.has(normalizeSupportChatRole(role));
}

export function isOperationalSupportReporter(role: unknown) {
  return operationalRoles.has(normalizeSupportChatRole(role));
}

export function getSupportMessageSender(role: unknown) {
  const normalizedRole = normalizeSupportChatRole(role);

  if (normalizedRole === 'MOTOQUEIRO') {
    return { senderRole: normalizedRole, senderLabel: 'Motoqueiro' };
  }

  if (normalizedRole === 'FUNCIONARIO') {
    return { senderRole: normalizedRole, senderLabel: 'Funcionário' };
  }

  if (normalizedRole === 'SUPER_ADMIN') {
    return { senderRole: normalizedRole, senderLabel: 'Super Admin' };
  }

  return { senderRole: 'ADMIN' as SupportChatRole, senderLabel: 'Admin' };
}
