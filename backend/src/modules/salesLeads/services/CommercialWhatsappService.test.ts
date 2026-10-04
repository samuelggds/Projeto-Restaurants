import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canRecoverPlatformEvolutionLogoutFailure,
  isPlatformEvolutionInstanceNotFound,
  PlatformEvolutionRequestError,
} from './CommercialWhatsappService.js';

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


test('trata somente 404 de fetchInstances como sessão de plataforma ausente', () => {
  assert.equal(
    isPlatformEvolutionInstanceNotFound(
      new PlatformEvolutionRequestError(404, 'instance/fetchInstances'),
    ),
    true,
  );
  assert.equal(
    isPlatformEvolutionInstanceNotFound(
      new PlatformEvolutionRequestError(401, 'instance/fetchInstances'),
    ),
    false,
  );
  assert.equal(
    isPlatformEvolutionInstanceNotFound(
      new PlatformEvolutionRequestError(404, 'instance/delete'),
    ),
    false,
  );
});
