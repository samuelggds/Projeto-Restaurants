import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertRestaurantIsOpenForOrders,
  DEFAULT_RESTAURANT_TIME_ZONE,
  isRestaurantOpenForOrders,
  RESTAURANT_CLOSED_MESSAGE,
  resolveRestaurantTimeZone,
} from './restaurantAvailability.js';
import {
  BUSINESS_DAY_IDS,
  normalizeBusinessHours,
  type BusinessDayId,
} from '../../restaurantSettings/utils/businessHours.js';

const LABELS: Record<BusinessDayId, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

function weeklySchedule(
  patch: Partial<Record<BusinessDayId, Partial<Record<string, unknown>>>> = {},
) {
  return BUSINESS_DAY_IDS.map((id) => ({
    id,
    label: LABELS[id],
    enabled: false,
    openingTime: '11:00',
    closingTime: '23:00',
    ...patch[id],
  }));
}

test('permite novos pedidos por padrão', () => {
  assert.doesNotThrow(() => assertRestaurantIsOpenForOrders(undefined));
  assert.doesNotThrow(() => assertRestaurantIsOpenForOrders(true));
  assert.doesNotThrow(() => assertRestaurantIsOpenForOrders(true, []));
});

test('bloqueia novos pedidos quando o restaurante estiver fechado', () => {
  assert.throws(
    () => assertRestaurantIsOpenForOrders(false),
    new RegExp(RESTAURANT_CLOSED_MESSAGE),
  );
});

test('respeita o dia e o intervalo configurados na agenda semanal', () => {
  const schedule = weeklySchedule({
    monday: { enabled: true, openingTime: '11:00', closingTime: '23:00' },
  });

  assert.equal(
    isRestaurantOpenForOrders(true, schedule, new Date('2026-08-24T13:59:00.000Z')),
    false,
  );
  assert.equal(
    isRestaurantOpenForOrders(true, schedule, new Date('2026-08-24T14:00:00.000Z')),
    true,
  );
  assert.equal(
    isRestaurantOpenForOrders(true, schedule, new Date('2026-08-25T01:59:00.000Z')),
    true,
  );
  assert.equal(
    isRestaurantOpenForOrders(true, schedule, new Date('2026-08-25T02:00:00.000Z')),
    false,
  );
  assert.equal(
    isRestaurantOpenForOrders(true, schedule, new Date('2026-08-25T15:00:00.000Z')),
    false,
  );
});

test('mantém aberto depois da meia-noite quando o turno começou no dia anterior', () => {
  const schedule = weeklySchedule({
    monday: { enabled: true, openingTime: '18:00', closingTime: '02:00' },
  });

  assert.equal(
    isRestaurantOpenForOrders(true, schedule, new Date('2026-08-25T02:30:00.000Z')),
    true,
  );
  assert.equal(
    isRestaurantOpenForOrders(true, schedule, new Date('2026-08-25T04:59:00.000Z')),
    true,
  );
  assert.equal(
    isRestaurantOpenForOrders(true, schedule, new Date('2026-08-25T05:00:00.000Z')),
    false,
  );
});

test('usa São Paulo mesmo quando a virada do dia diverge do relógio UTC do servidor', () => {
  const schedule = weeklySchedule({
    sunday: { enabled: true, openingTime: '23:00', closingTime: '00:30' },
  });

  assert.equal(
    isRestaurantOpenForOrders(true, schedule, new Date('2026-08-24T02:15:00.000Z')),
    true,
  );
  assert.equal(
    isRestaurantOpenForOrders(true, schedule, new Date('2026-08-24T03:15:00.000Z')),
    true,
  );
  assert.equal(
    isRestaurantOpenForOrders(true, schedule, new Date('2026-08-24T03:30:00.000Z')),
    false,
  );
});

test('respeita a mudança histórica de horário de verão em São Paulo', () => {
  const schedule = weeklySchedule({
    saturday: { enabled: true, openingTime: '22:00', closingTime: '02:00' },
  });

  assert.equal(
    isRestaurantOpenForOrders(true, schedule, new Date('2018-11-04T02:30:00.000Z')),
    true,
  );
  assert.equal(
    isRestaurantOpenForOrders(true, schedule, new Date('2018-11-04T03:30:00.000Z')),
    true,
  );
  assert.equal(
    isRestaurantOpenForOrders(true, schedule, new Date('2018-11-04T04:00:00.000Z')),
    false,
  );
});

test('aceita timezone explícito e faz fallback seguro para São Paulo', () => {
  const schedule = weeklySchedule({
    sunday: { enabled: true, openingTime: '11:00', closingTime: '12:00' },
  });
  const instant = new Date('2026-08-23T15:30:00.000Z');

  assert.equal(resolveRestaurantTimeZone(), DEFAULT_RESTAURANT_TIME_ZONE);
  assert.equal(resolveRestaurantTimeZone('Fuso/Invalido'), DEFAULT_RESTAURANT_TIME_ZONE);
  assert.equal(isRestaurantOpenForOrders(true, schedule, instant), false);
  assert.equal(isRestaurantOpenForOrders(true, schedule, instant, 'America/New_York'), true);
});

test('o fechamento manual tem prioridade sobre uma agenda aberta', () => {
  const schedule = weeklySchedule({
    monday: { enabled: true, openingTime: '11:00', closingTime: '23:00' },
  });

  assert.equal(
    isRestaurantOpenForOrders(false, schedule, new Date('2026-08-24T15:00:00.000Z')),
    false,
  );
});

test('normaliza os sete dias e permite turno que termina na madrugada', () => {
  const normalized = normalizeBusinessHours(
    weeklySchedule({
      monday: { enabled: true, openingTime: '18:00', closingTime: '02:00' },
    }).reverse(),
  );

  assert.equal(normalized?.length, 7);
  assert.equal(normalized?.[0].id, 'monday');
  assert.equal(normalized?.[0].label, 'Segunda-feira');
  assert.equal(normalized?.[0].closingTime, '02:00');
});

test('rejeita agenda incompleta, horários inválidos e horários iguais em dia aberto', () => {
  assert.throws(() => normalizeBusinessHours(weeklySchedule().slice(0, 6)), /7 dias/);
  assert.throws(
    () =>
      normalizeBusinessHours(
        weeklySchedule({ monday: { enabled: true, openingTime: '25:00' } }),
      ),
    /horários válidos/,
  );
  assert.throws(
    () =>
      normalizeBusinessHours(
        weeklySchedule({
          monday: { enabled: true, openingTime: '18:00', closingTime: '18:00' },
        }),
      ),
    /mesmo horário/,
  );
});
