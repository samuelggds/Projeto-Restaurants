export const BUSINESS_DAY_IDS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export type BusinessDayId = (typeof BUSINESS_DAY_IDS)[number];

export type BusinessHour = {
  id: BusinessDayId;
  label: string;
  enabled: boolean;
  openingTime: string;
  closingTime: string;
};

const DAY_LABELS: Record<BusinessDayId, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalizes the weekly schedule persisted in RestaurantSettings.businessHours.
 * Undefined keeps the current database value, while null/an empty array explicitly
 * disables schedule enforcement for backwards compatibility.
 */
export function normalizeBusinessHours(
  value: unknown,
): BusinessHour[] | undefined {
  if (value === undefined) return undefined;
  if (value === null || (Array.isArray(value) && value.length === 0)) return [];

  if (!Array.isArray(value)) {
    throw new Error('Os horários de funcionamento devem ser uma lista com os 7 dias da semana.');
  }

  if (value.length !== BUSINESS_DAY_IDS.length) {
    throw new Error('Informe os horários dos 7 dias da semana.');
  }

  const days = new Map<BusinessDayId, Record<string, unknown>>();

  value.forEach((rawDay) => {
    if (!isRecord(rawDay)) {
      throw new Error('Dia inválido nos horários de funcionamento.');
    }

    const id = String(rawDay.id || '').trim() as BusinessDayId;
    if (!BUSINESS_DAY_IDS.includes(id)) {
      throw new Error('Dia inválido nos horários de funcionamento.');
    }
    if (days.has(id)) {
      throw new Error(`O dia ${DAY_LABELS[id]} foi informado mais de uma vez.`);
    }
    days.set(id, rawDay);
  });

  return BUSINESS_DAY_IDS.map((id) => {
    const rawDay = days.get(id);
    if (!rawDay) {
      throw new Error(`Informe o horário de ${DAY_LABELS[id]}.`);
    }
    if (typeof rawDay.enabled !== 'boolean') {
      throw new Error(`Informe se ${DAY_LABELS[id]} estará aberto ou fechado.`);
    }

    const openingTime = String(rawDay.openingTime || '').trim();
    const closingTime = String(rawDay.closingTime || '').trim();
    if (!TIME_PATTERN.test(openingTime) || !TIME_PATTERN.test(closingTime)) {
      throw new Error(`Informe horários válidos para ${DAY_LABELS[id]} no formato HH:mm.`);
    }
    if (rawDay.enabled && openingTime === closingTime) {
      throw new Error(
        `A abertura e o fechamento de ${DAY_LABELS[id]} não podem ter o mesmo horário.`,
      );
    }

    return {
      id,
      label: DAY_LABELS[id],
      enabled: rawDay.enabled,
      openingTime,
      closingTime,
    };
  });
}

export function tryNormalizeBusinessHours(value: unknown): BusinessHour[] {
  try {
    return normalizeBusinessHours(value) || [];
  } catch {
    // Existing installations may contain an older/free-form JSON payload. It must
    // not unexpectedly close the restaurant until the admin saves a valid schedule.
    return [];
  }
}

