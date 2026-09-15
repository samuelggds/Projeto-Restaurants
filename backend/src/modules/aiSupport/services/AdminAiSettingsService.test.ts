// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fallbackAiAssistantSettings,
  isMissingAiSettingsStorage,
} from './AdminAiSettingsService.js';

test('reconhece tabela de preferências da IA ausente como cenário de implantação transitório', () => {
  assert.equal(isMissingAiSettingsStorage({ code: 'P2021' }), true);
  assert.equal(
    isMissingAiSettingsStorage(
      new Error('relation "RestaurantAiAssistantSettings" does not exist'),
    ),
    true,
  );
  assert.equal(isMissingAiSettingsStorage(new Error('OpenAI indisponível')), false);
});

test('fallback da IA permanece seguro e sem automação implícita', () => {
  const settings = fallbackAiAssistantSettings(42);
  assert.equal(settings.restaurantId, 42);
  assert.equal(settings.autonomyMode, 'SUGGEST_ONLY');
  assert.equal(settings.automationsEnabled, false);
  assert.ok(settings.maxAiRequestsPerHour > 0);
  assert.ok(settings.maxConcurrentAiJobs > 0);
});
