import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../../../contexts/authContext';
import BillingRestrictedAdmin from './BillingRestrictedAdmin';

describe('painel administrativo restrito por cobrança', () => {
  it('mostra apenas mensalidades e sinaliza as demais áreas como bloqueadas', () => {
    const markup = renderToStaticMarkup(
      <AuthProvider>
        <BillingRestrictedAdmin />
      </AuthProvider>,
    );

    expect(markup).toContain('Mensalidades e faturas');
    expect(markup).toContain('REGULARIZAÇÃO');
    expect(markup).toContain('OPERAÇÃO TEMPORARIAMENTE PAUSADA');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Carregando planos e mensalidades');
  });
});
