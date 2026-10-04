import assert from 'node:assert/strict';
import test from 'node:test';
import { canRecoverPlatformEvolutionLogoutFailure } from './CommercialWhatsappService.js';

test('recupera logout 500 somente quando o estado canônico confirma sessão encerrada', () => {
  assert.equal(canRecoverPlatformEvolutionLogoutFailure(500, 'close'), true);
  assert.equal(canRecoverPlatformEvolutionLogoutFailure(500, 'closed'), true);
  assert.equal(canRecoverPlatformEvolutionLogoutFailure(500, 'disconnected'), true);
  assert.equal(canRecoverPlatformEvolutionLogoutFailure(500, 'missing'), true);

  assert.equal(canRecoverPlatformEvolutionLogoutFailure(500, 'open'), false);
  assert.equal(canRecoverPlatformEvolutionLogoutFailure(500, 'connecting'), false);
  assert.equal(canRecoverPlatformEvolutionLogoutFailure(500, ''), false);
  assert.equal(canRecoverPlatformEvolutionLogoutFailure(401, 'close'), false);
  assert.equal(canRecoverPlatformEvolutionLogoutFailure(404, 'close'), false);
});
