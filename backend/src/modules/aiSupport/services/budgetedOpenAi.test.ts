import assert from 'node:assert/strict';
import test from 'node:test';
import OpenAI from 'openai';
import aiCreditService from './AiCreditService.js';
import { runBudgetedAi, textRequestBudget } from './budgetedOpenAi.js';

const actor = { userId: 7, restaurantId: 3 };
const input = { actor, feature: 'TEST', model: 'gpt-4o', budgetUsd: 0.1, cost: () => 0.03 };

test('reserves before calling provider and settles usage even when content is invalid', async (t) => {
  const sequence: string[] = [];
  t.mock.method(aiCreditService, 'reserve', async () => {
    sequence.push('reserve');
    return 'reservation';
  });
  t.mock.method(aiCreditService, 'settleReservation', async (value) => {
    sequence.push('settle');
    assert.equal(value.reservationId, 'reservation');
    assert.equal(value.costUsd, 0.03);
  });
  const result = await runBudgetedAi({
    ...input,
    request: async () => {
      sequence.push('provider');
      return { usage: { output_tokens: 100 }, content: 'invalid JSON' };
    },
  });
  assert.deepEqual(sequence, ['reserve', 'provider', 'settle']);
  assert.throws(() => JSON.parse(result.content));
});

test('insufficient balance prevents any provider request', async (t) => {
  t.mock.method(aiCreditService, 'reserve', async () => {
    throw new Error('insufficient');
  });
  let called = false;
  await assert.rejects(
    runBudgetedAi({
      ...input,
      request: async () => {
        called = true;
        return {};
      },
    }),
  );
  assert.equal(called, false);
});

test('retains reservation on ambiguous timeout and releases a rejected request', async (t) => {
  t.mock.method(aiCreditService, 'reserve', async () => 'reservation');
  const states: string[] = [];
  t.mock.method(aiCreditService, 'markReservation', async (_actor, _id, state) => {
    states.push(state);
  });
  for (const error of [
    new OpenAI.APIConnectionTimeoutError(),
    OpenAI.APIError.generate(400, {}, undefined, {}),
  ]) {
    await assert.rejects(
      runBudgetedAi({
        ...input,
        request: async () => {
          throw error;
        },
      }),
    );
  }
  assert.deepEqual(states, ['UNCERTAIN', 'RELEASED']);
});

test('missing usage and settlement failure do not silently release credit', async (t) => {
  t.mock.method(aiCreditService, 'reserve', async () => 'reservation');
  const states: string[] = [];
  t.mock.method(aiCreditService, 'markReservation', async (_actor, _id, state) => {
    states.push(state);
  });
  const settlement = t.mock.method(aiCreditService, 'settleReservation', async () => {
    throw new Error('database unavailable');
  });
  await assert.rejects(runBudgetedAi({ ...input, cost: () => 0, request: async () => ({}) }));
  assert.equal(settlement.mock.callCount(), 0);
  await assert.rejects(runBudgetedAi({ ...input, request: async () => ({ usage: {} }) }));
  assert.deepEqual(states, ['UNCERTAIN', 'UNCERTAIN']);
});

test('budget includes input, output and vision; unsupported models and oversized requests fail closed', () => {
  const params = { model: 'gpt-4o', messages: [{ role: 'user' as const, content: 'Olá' }] };
  assert.ok(textRequestBudget(params) > 0.04);
  assert.throws(() => textRequestBudget({ ...params, model: 'unpriced-model' }));
  assert.throws(() => textRequestBudget({ ...params, max_completion_tokens: 999999 }));
  assert.throws(() =>
    textRequestBudget({ ...params, messages: [{ role: 'user', content: 'a'.repeat(130000) }] }),
  );
});
