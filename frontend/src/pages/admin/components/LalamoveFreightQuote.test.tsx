import { describe, expect, it } from 'vitest';
import { safeQuoteError } from './LalamoveFreightQuote';

describe('Lalamove quote error safety', () => {
  it('shows an actionable message when the sandbox connection is missing', () => {
    expect(safeQuoteError({ response: { status: 409, data: {
      error: 'Conexão sandbox Lalamove não validada.',
    } } })).toBe('Conexão sandbox Lalamove não validada.');
  });
  it('explains missing server geocoding without exposing configuration values', () => {
    expect(safeQuoteError({ response: { status: 503, data: {
      error: 'Geocodificação não configurada no servidor. Contate o suporte.',
    } } })).toContain('Geocodificação não configurada');
  });
  it('does not render arbitrary upstream errors or secrets', () => {
    expect(safeQuoteError({ response: { data: { error: 'secret=do-not-render' } } }))
      .not.toContain('do-not-render');
    expect(safeQuoteError(new Error('private connection error')))
      .toContain('Não foi possível consultar');
  });
});
