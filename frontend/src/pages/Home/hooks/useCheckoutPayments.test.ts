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

  it('converte o detalhe técnico do Zod em uma mensagem compreensível', () => {
    expect(
      getCheckoutErrorMessage({
        response: {
          data: {
            error: JSON.stringify([
              {
                code: 'too_small',
                path: ['customerPhone'],
                message: 'Informe um celular/WhatsApp válido com DDD.',
              },
            ]),
          },
        },
      }),
    ).toBe('Informe um celular/WhatsApp válido com DDD.');
  });

  it('não expõe uma resposta técnica inválida ao cliente', () => {
    expect(
      getCheckoutErrorMessage({ response: { data: { error: '[resposta inválida' } } }),
    ).toBe('Revise os dados do pedido e tente novamente.');
  });

  it('retorna vazio para valores desconhecidos', () => {
    expect(getCheckoutErrorMessage('erro')).toBe('');
  });
});
