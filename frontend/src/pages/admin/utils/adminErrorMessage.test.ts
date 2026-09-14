import { describe, expect, it } from 'vitest';
import { adminErrorMessage } from './adminErrorMessage';

describe('adminErrorMessage', () => {
  it('hides database internals and explains the required action', () => {
    expect(
      adminErrorMessage({
        response: {
          data: {
            error: 'The column Order.creationRequestKey does not exist in the current database.',
          },
        },
      }),
    ).toBe(
      'O sistema precisa de uma atualização técnica antes de concluir esta ação. Avise o responsável pelo sistema para atualizar o banco de dados e tente novamente.',
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
