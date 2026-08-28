export const TECHNICAL_ACCESS_DENIED_MESSAGE =
  'Este acesso é exclusivo do Super Admin da plataforma.';

export function canUseTechnicalAccess(user: { role?: unknown } | null | undefined) {
  return String(user?.role || '').toUpperCase() === 'SUPER_ADMIN';
}
