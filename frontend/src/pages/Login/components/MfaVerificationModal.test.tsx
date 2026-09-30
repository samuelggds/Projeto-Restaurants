import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../Services/authService', () => ({
  default: {
    getPendingMfaChallenge: vi.fn(() => null),
    resendLogin2fa: vi.fn(),
  },
}));

import { MfaVerificationModal } from './MfaVerificationModal';

describe('MfaVerificationModal do cliente', () => {
  beforeEach(() => vi.clearAllMocks());

  it('limita a experiência do cliente ao código enviado por e-mail', () => {
    const markup = renderToStaticMarkup(
      <MfaVerificationModal
        open
        emailOnly
        destination="c***@teste.com"
        selectedChannel="EMAIL"
        resendAfterSeconds={30}
        onVerify={vi.fn(async () => ({ ok: true }))}
        onResend={vi.fn(async () => ({
          selectedChannel: 'EMAIL' as const,
          destination: 'c***@teste.com',
          resendAfterSeconds: 60,
        }))}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(markup).toContain('Verificação em duas etapas');
    expect(markup).toContain('enviado para seu e-mail');
    expect(markup).toContain('c***@teste.com');
    expect(markup).toContain('Reenviar código');
    expect(markup).not.toContain('app autenticador');
    expect(markup).not.toContain('Usar outro método');
    expect(markup).not.toContain('Ajuda');
  });

  it('renderiza os seis campos do código e as versões desktop e mobile do CTA', () => {
    const markup = renderToStaticMarkup(
      <MfaVerificationModal
        open
        emailOnly
        selectedChannel="EMAIL"
        onVerify={vi.fn(async () => 'ok')}
        onResend={vi.fn(async () => ({ selectedChannel: 'EMAIL' as const }))}
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect((markup.match(/Dígito [1-6] do código/g) || []).length).toBe(6);
    expect(markup).toContain('Verificar e Continuar');
    expect(markup).toContain('>Verificar</span>');
    expect(markup).toContain('Voltar ao login');
  });
});
