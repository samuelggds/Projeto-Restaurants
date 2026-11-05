import { describe, expect, it } from 'vitest';
import { nfcFriendlyError, nfcFriendlyOrderStatus } from './nfcFriendlyMessages';

const apiError = (error: string, status = 409) => ({ response: { status, data: { error } } });

describe('NFC messages for customers and staff', () => {
  it('explains a changed order without leaking implementation details', () => {
    expect(nfcFriendlyError(apiError('Itens diferentes dos confirmados pelo cliente.')))
      .toBe('Os itens deste pedido foram alterados. Confira a sacola e faça uma nova confirmação.');
  });

  it('gives clear guidance for locked attempts, expiration and pending payments', () => {
    expect(nfcFriendlyError(apiError('Confirmação temporariamente bloqueada por tentativas incorretas.', 429)))
      .toContain('Aguarde');
    expect(nfcFriendlyError(apiError('Confirmação expirada. Inicie outra.'))).toContain('prazo');
    expect(nfcFriendlyError(apiError('Pagamento não confirmado pelo provedor.'))).toContain('pendência');
  });

  it('does not reveal raw server, database, token or internal trace details', () => {
    for (const raw of [
      'PrismaClientKnownRequestError P2002',
      'PostgreSQL RLS tenantId=123',
      'Unhandled request /nfc-registration/cards/payment-context',
      'ECONNRESET at backend service',
    ]) {
      const message = nfcFriendlyError(apiError(raw, 500));
      expect(message).toBe('Não foi possível concluir esta ação. Tente novamente.');
      expect(message).not.toContain(raw);
    }
  });

  it('uses safe, actionable messages for authorization and transient errors', () => {
    expect(nfcFriendlyError(apiError('Access token invalid', 401))).toContain('Entre novamente');
    expect(nfcFriendlyError(apiError('forbidden', 403))).toContain('pessoas autorizadas');
    expect(nfcFriendlyError(apiError('rate limit', 429))).toContain('Aguarde');
    expect(nfcFriendlyError(apiError('bad request', 422))).toContain('Confira');
  });

  it('does not present raw order status codes in the staff comanda', () => {
    expect(nfcFriendlyOrderStatus('PENDENTE')).toBe('Recebido');
    expect(nfcFriendlyOrderStatus('PREPARANDO')).toBe('Em preparo');
    expect(nfcFriendlyOrderStatus('ENTREGUE')).toBe('Entregue');
    expect(nfcFriendlyOrderStatus('SOME_NEW_INTERNAL_STATUS')).toBe('Acompanhe com a equipe');
  });
});
