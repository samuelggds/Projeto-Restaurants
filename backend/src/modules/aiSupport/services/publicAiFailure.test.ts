import assert from 'node:assert/strict';
import test from 'node:test';
import OpenAI from 'openai';
import { AiCreditsExhaustedError } from './AiCreditService.js';
import { publicAiFailure } from './publicAiFailure.js';

test('public AI failures never persist or return provider credentials or request content', () => {
  for (const error of [
    new Error('private-database-url'),
    OpenAI.APIError.generate(401, { message: 'private-api-credential' }, undefined, {}),
    new OpenAI.APIConnectionTimeoutError({ message: 'private-request-data' }),
    'private-generated-content',
  ]) {
    assert.doesNotMatch(publicAiFailure(error), /private-/u);
  }
  const balanceError = new AiCreditsExhaustedError();
  assert.equal(publicAiFailure(balanceError), balanceError.message);
});
