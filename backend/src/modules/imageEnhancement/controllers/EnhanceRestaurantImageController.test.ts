import assert from 'node:assert/strict';
import test from 'node:test';
import OpenAI from 'openai';
import {
  ImageEnhancementConfigurationError,
  ImageEnhancementInputError,
  ImageEnhancementResultError,
} from '../errors/ImageEnhancementErrors.js';
import { toImageEnhancementHttpError } from './EnhanceRestaurantImageController.js';

function upstreamError(status: number, details: Record<string, unknown>) {
  return OpenAI.APIError.generate(status, { error: details }, undefined, {});
}

test('mantém mensagens de validação local sem expor detalhes internos', () => {
  assert.deepEqual(
    toImageEnhancementHttpError(
      new ImageEnhancementInputError('Envie uma imagem JPG, PNG ou WebP válida.'),
    ),
    {
      status: 400,
      body: {
        error: 'Envie uma imagem JPG, PNG ou WebP válida.',
        code: 'IMAGE_AI_INVALID_INPUT',
      },
    },
  );
});

test('não devolve credencial ou mensagem de autenticação recebida do provedor', () => {
  const mapped = toImageEnhancementHttpError(
    upstreamError(401, {
      message: 'Incorrect API key provided: sk-proj-segredo',
      type: 'invalid_request_error',
      code: 'invalid_api_key',
    }),
  );

  assert.equal(mapped.status, 503);
  assert.equal(mapped.body.code, 'IMAGE_AI_AUTH_ERROR');
  assert.doesNotMatch(JSON.stringify(mapped), /sk-proj-segredo|incorrect api key/i);
});

test('distingue cota esgotada de excesso temporário de solicitações', () => {
  const quota = toImageEnhancementHttpError(
    upstreamError(429, {
      message: 'You exceeded your current quota.',
      type: 'insufficient_quota',
      code: 'insufficient_quota',
    }),
  );
  const rateLimit = toImageEnhancementHttpError(
    upstreamError(429, {
      message: 'Rate limit reached.',
      type: 'rate_limit_error',
      code: 'rate_limit_exceeded',
    }),
  );

  assert.equal(quota.status, 429);
  assert.equal(quota.body.code, 'IMAGE_AI_QUOTA_EXCEEDED');
  assert.equal(rateLimit.status, 429);
  assert.equal(rateLimit.body.code, 'IMAGE_AI_RATE_LIMITED');
});

test('traduz timeout e falhas inesperadas sem devolver a mensagem original', () => {
  const timeout = toImageEnhancementHttpError(
    new OpenAI.APIConnectionTimeoutError({ message: 'timeout com segredo interno' }),
  );
  const unexpected = toImageEnhancementHttpError(new Error('segredo interno'));

  assert.equal(timeout.status, 504);
  assert.equal(timeout.body.code, 'IMAGE_AI_TIMEOUT');
  assert.equal(unexpected.status, 500);
  assert.doesNotMatch(JSON.stringify({ timeout, unexpected }), /segredo interno/i);
});

test('mapeia configuração ausente e resultado vazio para estados operacionais corretos', () => {
  const configuration = toImageEnhancementHttpError(new ImageEnhancementConfigurationError());
  const emptyResult = toImageEnhancementHttpError(new ImageEnhancementResultError());

  assert.equal(configuration.status, 503);
  assert.equal(configuration.body.code, 'IMAGE_AI_NOT_CONFIGURED');
  assert.equal(emptyResult.status, 502);
  assert.equal(emptyResult.body.code, 'IMAGE_AI_PROVIDER_ERROR');
});
