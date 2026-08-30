import { describe, expect, it } from 'vitest';
import { resolveProfileView } from './profileView';

describe('resolveProfileView', () => {
  it('abre diretamente Meus cartões quando solicitado pela URL', () => {
    expect(resolveProfileView('paymentMethods')).toBe('paymentMethods');
  });

  it('mantém uma tela segura para valores desconhecidos', () => {
    expect(resolveProfileView('unknown')).toBe('overview');
    expect(resolveProfileView(null)).toBe('overview');
  });
});
