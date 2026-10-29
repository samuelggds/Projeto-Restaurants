import assert from 'node:assert/strict';
import test from 'node:test';
import { nextNfcReturnCpfFailure, nfcReturnCpfRemainingMinutes } from './nfcReturnCpfLockout.js';

const clock = new Date('2026-10-29T18:00:00.000Z');
const minutesFromNow = (value: Date | null) => value ? (value.getTime() - clock.getTime()) / 60_000 : null;

test('os dois primeiros CPFs errados nao bloqueiam; terceiro bloqueia por dez minutos', () => {
  assert.deepEqual(nextNfcReturnCpfFailure(0, clock), { attempts: 1, lockedUntil: null });
  assert.deepEqual(nextNfcReturnCpfFailure(1, clock), { attempts: 2, lockedUntil: null });
  const third = nextNfcReturnCpfFailure(2, clock);
  assert.equal(third.attempts, 3);
  assert.equal(minutesFromNow(third.lockedUntil), 10);
});

test('depois do bloqueio: vinte, quarenta, oitenta, cento e sessenta minutos, sem zerar o contador', () => {
  for (const [previous, expected] of [[3, 20], [4, 40], [5, 80], [6, 160], [7, 320]]) {
    const next = nextNfcReturnCpfFailure(previous, clock);
    assert.equal(next.attempts, previous + 1);
    assert.equal(minutesFromNow(next.lockedUntil), expected);
  }
});

test('o contador so volta a zero apos sucesso: novo erro com contador zero nao bloqueia', () => {
  assert.equal(nextNfcReturnCpfFailure(0, clock).lockedUntil, null);
  assert.equal(nextNfcReturnCpfFailure(3, new Date(clock.getTime() + 10 * 60_000)).attempts, 4);
});

test('retorna minutos restantes com arredondamento seguro para cima', () => {
  const lockedUntil = new Date(clock.getTime() + 10 * 60_000);
  assert.equal(nfcReturnCpfRemainingMinutes(lockedUntil, clock), 10);
  assert.equal(nfcReturnCpfRemainingMinutes(lockedUntil, new Date(clock.getTime() + 61_000)), 9);
  assert.equal(nfcReturnCpfRemainingMinutes(lockedUntil, lockedUntil), 0);
});

test('muitas falhas nao causam overflow, data invalida ou desbloqueio acidental', () => {
  const next = nextNfcReturnCpfFailure(1_000_000, clock);
  assert.equal(next.attempts, 1_000_001);
  assert.ok(next.lockedUntil);
  assert.ok(Number.isFinite(next.lockedUntil.getTime()));
  assert.ok(next.lockedUntil.getTime() > clock.getTime());
  assert.equal(nextNfcReturnCpfFailure(2_147_483_647, clock).attempts, 2_147_483_647);
});

test('rejeita contador corrompido', () => {
  assert.throws(() => nextNfcReturnCpfFailure(-1, clock), TypeError);
  assert.throws(() => nextNfcReturnCpfFailure(Number.NaN, clock), TypeError);
});
