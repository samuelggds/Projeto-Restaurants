import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AuthProvider } from '../../../contexts/authContext';
import BillingRestrictedAdmin from './BillingRestrictedAdmin';

describe('painel administrativo restrito por cobrança', () => {
  it('mantém somente a regularização financeira disponível para o admin', () => {
    const markup = renderToStaticMarkup(
      <AuthProvider>
        <BillingRestrictedAdmin />
      </AuthProvider>,
    );

    expect(markup).toContain('Mensalidades');
    expect(markup).toContain('Assinatura em atraso');
    expect(markup).toContain('Regularize sua assinatura');
    expect(markup).toContain('Verificar pagamento');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Carregando mensalidade');
    expect(markup).toContain('Gastro');
    expect(markup).toContain('Nexa');
  });
});
