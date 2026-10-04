import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canRecoverPlatformEvolutionLogoutFailure,
  isPlatformEvolutionInstanceNotFound,
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
  const makeError = (status: number, operation: string) => {
    const error = new Error('provider');
    Object.setPrototypeOf(error, Object.getPrototypeOf(new Error()));
    Object.assign(error, { status, operation });
    return error;
  };

  assert.equal(isPlatformEvolutionInstanceNotFound(makeError(404, 'instance/fetchInstances')), false);
});
