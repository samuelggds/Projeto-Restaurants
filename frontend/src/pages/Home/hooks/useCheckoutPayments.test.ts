import { describe, expect, it } from 'vitest';
import { getCheckoutErrorMessage } from './useCheckoutPayments';

describe('getCheckoutErrorMessage', () => {
  it('prioriza a mensagem retornada pelo backend', () => {
    expect(
      getCheckoutErrorMessage({
        response: { data: { error: 'Estoque insuficiente' } },
        message: 'Falha genérica',
      }),
    ).toBe('Estoque insuficiente');
  });

  it('usa a mensagem normal do erro como alternativa', () => {
    expect(getCheckoutErrorMessage(new Error('Gateway indisponível'))).toBe('Gateway indisponível');
  });

  it('retorna vazio para valores desconhecidos', () => {
    expect(getCheckoutErrorMessage('erro')).toBe('');
  });
});
