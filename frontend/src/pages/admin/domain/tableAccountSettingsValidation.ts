import type { TableAccountAdminSettings, TablePrepaymentWindow } from '../types';

export type TableAccountSettingsErrors = Partial<
  Record<
    | 'requirePrepaymentAboveCents'
    | 'prepaymentWindows'
    | 'serviceFeeBasisPoints'
    | 'reservationTimeoutMinutes'
    | 'timeZone',
    string
  >
>;

function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function isValidPrepaymentWindow(window: TablePrepaymentWindow) {
  const uniqueWeekdays = new Set(window.weekdays);
  return (
    window.weekdays.length >= 1 &&
    window.weekdays.length <= 7 &&
    uniqueWeekdays.size === window.weekdays.length &&
    window.weekdays.every((day) => Number.isInteger(day) && day >= 0 && day <= 6) &&
    Number.isInteger(window.startsAtMinute) &&
    window.startsAtMinute >= 0 &&
    window.startsAtMinute <= 1439 &&
    Number.isInteger(window.endsAtMinute) &&
    window.endsAtMinute >= 0 &&
    window.endsAtMinute <= 1439 &&
    window.startsAtMinute !== window.endsAtMinute
  );
}

export function validateTableAccountSettings(
  settings: TableAccountAdminSettings,
): TableAccountSettingsErrors {
  const errors: TableAccountSettingsErrors = {};

  if (
    settings.requirePrepaymentAboveCents !== null &&
    (!Number.isSafeInteger(settings.requirePrepaymentAboveCents) ||
      settings.requirePrepaymentAboveCents < 0)
  ) {
    errors.requirePrepaymentAboveCents = 'Informe um limite válido ou deixe o campo vazio.';
  }

  if (
    settings.prepaymentWindows.length > 50 ||
    settings.prepaymentWindows.some((window) => !isValidPrepaymentWindow(window))
  ) {
    errors.prepaymentWindows =
      'Cada período precisa ter ao menos um dia e horários de início e fim diferentes.';
  }

  const feeIsValid =
    settings.serviceFeeMode === 'DISABLED'
      ? settings.serviceFeeBasisPoints === 0
      : Number.isInteger(settings.serviceFeeBasisPoints) &&
        settings.serviceFeeBasisPoints >= 1 &&
        settings.serviceFeeBasisPoints <= 10_000;
  if (!feeIsValid) {
    errors.serviceFeeBasisPoints =
      settings.serviceFeeMode === 'DISABLED'
        ? 'A taxa deve ficar em 0% quando estiver desativada.'
        : 'Informe uma taxa entre 0,01% e 100%.';
  }

  if (
    !Number.isInteger(settings.reservationTimeoutMinutes) ||
    settings.reservationTimeoutMinutes < 1 ||
    settings.reservationTimeoutMinutes > 60
  ) {
    errors.reservationTimeoutMinutes = 'Informe um tempo entre 1 e 60 minutos.';
  }

  if (!settings.timeZone.trim() || !isValidTimeZone(settings.timeZone)) {
    errors.timeZone = 'Selecione um fuso horário válido.';
  }

  return errors;
}
