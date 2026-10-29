import assert from 'node:assert/strict';
import test from 'node:test';
import { NfcDebtDeadlineMode } from '@prisma/client';
import { calculateNfcComandaDueAt, assertNfcClosingSchedule, normalizeNfcDebtDeadlineMode } from './nfcComandaDeadline.js';
import { createDisabledBusinessHours } from '../../restaurantSettings/utils/businessHours.js';

function schedule(day: string, openingTime: string, closingTime: string) {
  return createDisabledBusinessHours().map(row =>
    row.id === day ? { ...row, enabled: true, openingTime, closingTime } : row);
}
test('preserves the 24-hour default, independent of local timezone', () => {
  assert.equal(normalizeNfcDebtDeadlineMode(undefined), 'TWENTY_FOUR_HOURS');
  assert.equal(calculateNfcComandaDueAt({
    openedAt: new Date('2026-10-29T20:00:00Z'),
    mode: NfcDebtDeadlineMode.TWENTY_FOUR_HOURS,
    businessHours: null,
  }).toISOString(), '2026-10-30T20:00:00.000Z');
  assert.throws(() => normalizeNfcDebtDeadlineMode('INVALID'), /prazo NFC válido/);
});
test('closes the same night at the restaurant local time', () => {
  assert.equal(calculateNfcComandaDueAt({
    openedAt: new Date('2026-10-29T22:00:00Z'), // Thursday 19:00 Fortaleza
    mode: NfcDebtDeadlineMode.BUSINESS_CLOSING,
    businessHours: schedule('thursday', '18:00', '23:00'),
    timeZone: 'America/Fortaleza',
  }).toISOString(), '2026-10-30T02:00:00.000Z');
});
test('closing after midnight belongs to the opening shift', () => {
  const hours = schedule('thursday', '18:00', '02:00');
  for (const openedAt of ['2026-10-29T23:00:00Z', '2026-10-30T04:00:00Z']) {
    assert.equal(calculateNfcComandaDueAt({
      openedAt: new Date(openedAt), mode: NfcDebtDeadlineMode.BUSINESS_CLOSING,
      businessHours: hours, timeZone: 'America/Fortaleza',
    }).toISOString(), '2026-10-30T05:00:00.000Z');
  }
});
test('rejects empty schedules and outside-opening attempts rather than inventing closing', () => {
  assert.throws(() => assertNfcClosingSchedule(NfcDebtDeadlineMode.BUSINESS_CLOSING, []), /Configure os horários/);
  assert.throws(() => calculateNfcComandaDueAt({
    openedAt: new Date('2026-10-29T14:00:00Z'), mode: NfcDebtDeadlineMode.BUSINESS_CLOSING,
    businessHours: schedule('thursday', '18:00', '02:00'), timeZone: 'America/Fortaleza',
  }), /fora do horário/);
});
