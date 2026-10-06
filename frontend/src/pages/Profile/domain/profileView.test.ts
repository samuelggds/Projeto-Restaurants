import { describe, expect, it } from 'vitest';
import { resolveProfileView } from './profileView';

describe('resolveProfileView', () => {
  it('não reabre a antiga tela de cartões salvos pela URL', () => {
    expect(resolveProfileView('paymentMethods')).toBe('overview');
  });

  it('abre diretamente os atalhos avançados do perfil quando solicitados pela Home', () => {
    expect(resolveProfileView('loyalty')).toBe('loyalty');
    expect(resolveProfileView('help')).toBe('help');
    expect(resolveProfileView('settings')).toBe('settings');
  });

  it('mantém uma tela segura para valores desconhecidos', () => {
    expect(resolveProfileView('unknown')).toBe('overview');
    expect(resolveProfileView(null)).toBe('overview');
  });
});
