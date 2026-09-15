import { describe, expect, it } from 'vitest';
import { sanitizeApiErrorData, toUserFacingErrorMessage } from './userFacingError';

describe('userFacingError', () => {
  it.each([
    'Access token expirado',
    'Refresh token inválido',
    'Webhook endpoint indisponível',
    'OAuth callback inválido',
    'Payload inválido para o tenant',
    'Backend API retornou HTTP 500',
    'Prisma database error',
    'Request failed with status code 503',
  ])('não expõe detalhes técnicos: %s', (technicalMessage) => {
    const message = toUserFacingErrorMessage(technicalMessage);
    expect(message).not.toMatch(
      /token|webhook|oauth|callback|endpoint|payload|tenant|backend|\bapi\b|prisma|status code|http\s*\d{3}/i,
    );
    expect(message.length).toBeGreaterThan(10);
  });

  it('mantém mensagens comuns que ajudam o usuário', () => {
    expect(toUserFacingErrorMessage('Informe um CPF ou CNPJ válido.')).toBe(
      'Informe um CPF ou CNPJ válido.',
    );
    expect(toUserFacingErrorMessage('Você não tem permissão para realizar esta ação.')).toBe(
      'Você não tem permissão para realizar esta ação.',
    );
  });

  it('substitui erros de conexão por orientação simples', () => {
    expect(toUserFacingErrorMessage('Network Error')).toBe(
      'Não foi possível se comunicar com o sistema. Verifique sua conexão e tente novamente.',
    );
  });

  it('limpa error e message sem remover códigos usados pela aplicação', () => {
    expect(
      sanitizeApiErrorData({
        code: 'PAYMENT_CONNECTION_ERROR',
        error: 'Webhook endpoint retornou HTTP 500',
        message: 'Access token inválido',
        invoiceId: 12,
      }),
    ).toEqual({
      code: 'PAYMENT_CONNECTION_ERROR',
      error: 'Não foi possível concluir esta ação. Tente novamente.',
      message: 'Não foi possível validar seu acesso. Entre novamente e tente de novo.',
      invoiceId: 12,
    });
  });
});
