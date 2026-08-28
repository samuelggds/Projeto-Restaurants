import { SUPER_ADMIN_VIEWS, type PlatformSettings, type SuperAdminView } from '../types';

export const tenantLabels = {
  ACTIVE: 'Ativo',
  TRIAL: 'Em avaliação',
  OVERDUE: 'Em atraso',
  BLOCKED: 'Bloqueado',
  CANCELED: 'Cancelado',
  UNKNOWN: 'Não informado',
} as const;

export const statusTone = (status: string): 'green' | 'red' | 'yellow' | 'blue' | 'gray' => {
  const value = status.toUpperCase();
  if (['ACTIVE', 'PAID', 'SUCCESS'].includes(value)) return 'green';
  if (['OVERDUE', 'BLOCKED', 'FAILURE', 'CRITICAL'].includes(value)) return 'red';
  if (['TRIAL', 'PENDING', 'WAITING_CUSTOMER'].includes(value)) return 'yellow';
  if (['OPEN', 'IN_PROGRESS'].includes(value)) return 'blue';
  return 'gray';
};

export function formatCurrency(value: number, currency = 'BRL', locale = 'pt-BR') {
  return new Intl.NumberFormat(locale || 'pt-BR', {
    style: 'currency',
    currency: currency || 'BRL',
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDate(value: string | null | undefined, includeTime = false) {
  if (!value) return 'Não informado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data inválida';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    ...(includeTime ? { timeStyle: 'short' as const } : {}),
  }).format(date);
}

export function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function viewFromPath(pathname: string): SuperAdminView {
  const segment = pathname.replace(/\/+$/, '').split('/').filter(Boolean)[1];
  return SUPER_ADMIN_VIEWS.includes(segment as SuperAdminView)
    ? (segment as SuperAdminView)
    : 'overview';
}

export function superAdminPath(view: SuperAdminView) {
  return `/super_admin/${view}`;
}

function safeCsvCell(value: unknown) {
  let cell = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replaceAll('"', '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(safeCsvCell).join(';')).join('\r\n');
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const blob = new Blob([`\uFEFF${toCsv(headers, rows)}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function passwordErrors(password: string) {
  const errors: string[] = [];
  if (password.length < 16) errors.push('Use pelo menos 16 caracteres.');
  if (!/[a-z]/.test(password)) errors.push('Inclua uma letra minúscula.');
  if (!/[A-Z]/.test(password)) errors.push('Inclua uma letra maiúscula.');
  if (!/\d/.test(password)) errors.push('Inclua um número.');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Inclua um símbolo.');
  if (/^(password|senha|admin|1234)/i.test(password)) errors.push('Evite senhas previsíveis.');
  return errors;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function slugify(value: string) {
  return normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function validateSettings(settings: PlatformSettings) {
  const errors: string[] = [];
  const platformName = settings.platformName.trim();
  const platformDomain = settings.platformDomain.trim();
  const supportEmail = settings.supportEmail.trim();
  const primaryColor = settings.primaryColor.trim();
  const locale = settings.locale.trim();
  const currency = settings.currency.trim();
  const timezone = settings.timezone.trim();
  const maintenanceMessage = settings.maintenanceMessage.trim();

  if (platformName.length < 2 || platformName.length > 80)
    errors.push('O nome da plataforma deve ter entre 2 e 80 caracteres.');
  if (
    !/^(?:https?:\/\/)?(?:localhost|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,})(?::\d{1,5})?(?:\/.*)?$/i.test(
      platformDomain,
    )
  )
    errors.push('Informe um domínio válido, como app.seudominio.com.');
  if (platformDomain.length > 255) errors.push('O domínio deve ter no máximo 255 caracteres.');
  if (!/^\S+@\S+\.\S+$/.test(supportEmail)) errors.push('Informe um e-mail de suporte válido.');
  if (!/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) errors.push('A cor deve usar o formato #RRGGBB.');
  if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(locale))
    errors.push('O idioma deve usar um locale válido, como pt-BR.');
  if (!/^[A-Z]{3}$/.test(currency))
    errors.push('A moeda deve usar um código ISO de três letras, como BRL.');
  try {
    new Intl.DateTimeFormat(locale || 'pt-BR', { timeZone: timezone }).format();
  } catch {
    errors.push('Informe um fuso horário IANA válido, como America/Sao_Paulo.');
  }
  if (!['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'].includes(settings.dateFormat))
    errors.push('Selecione um formato de data válido.');
  if (
    !Number.isInteger(settings.defaultTrialDays) ||
    settings.defaultTrialDays < 0 ||
    settings.defaultTrialDays > 90
  )
    errors.push('O trial deve ficar entre 0 e 90 dias.');
  if (
    !Number.isInteger(settings.auditRetentionDays) ||
    settings.auditRetentionDays < 90 ||
    settings.auditRetentionDays > 3650
  )
    errors.push('A retenção de auditoria deve ficar entre 90 e 3.650 dias.');
  if (maintenanceMessage.length < 3)
    errors.push('Informe uma mensagem de manutenção com pelo menos 3 caracteres.');
  else if (settings.maintenanceMode && maintenanceMessage.length < 10)
    errors.push('Explique a manutenção em pelo menos 10 caracteres.');
  if (maintenanceMessage.length > 500)
    errors.push('A mensagem de manutenção deve ter no máximo 500 caracteres.');
  return errors;
}

export function requestErrorMessage(error: unknown, fallback: string) {
  const response = (error as { response?: { data?: { message?: string; error?: string } } })
    ?.response;
  return (
    response?.data?.message ||
    response?.data?.error ||
    (error instanceof Error ? error.message : fallback)
  );
}
