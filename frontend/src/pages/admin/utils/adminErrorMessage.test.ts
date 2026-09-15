import { describe, expect, it } from 'vitest';
import { adminErrorMessage } from './adminErrorMessage';

describe('adminErrorMessage', () => {
  it('hides database internals behind a safe support message', () => {
    expect(
      adminErrorMessage({
        response: {
          data: {
            error: 'The column Order.creationRequestKey does not exist in the current database.',
          },
        },
      }),
    ).toBe(
      'Esta função está temporariamente indisponível. Tente novamente mais tarde ou fale com o suporte.',
    );
  });

  it('keeps a useful API message when it is safe to show', () => {
    expect(adminErrorMessage({ response: { data: { error: 'Pedido já foi pago.' } } })).toBe(
      'Pedido já foi pago.',
    );
  });

  it('translates payment setup errors into an actionable admin message', () => {
    expect(adminErrorMessage(new Error('PAGBANK_TOKEN não configurado.'))).toContain(
      'conta de recebimento ainda não está vinculada',
    );
  });
});
