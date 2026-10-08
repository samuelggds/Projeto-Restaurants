import { beforeEach, describe, expect, it } from 'vitest';
import { clearAuthSession, persistAuthSession } from '../modules/auth/session/authSession';
import { syncProfileAvatarBranding } from './profileAvatarBranding';

describe('profile avatar session', () => {
  beforeEach(() => {
    localStorage.clear();
    clearAuthSession();
    syncProfileAvatarBranding();
  });

  it('mantém o avatar da sessão atual durante a navegação e remove ao sair', () => {
    persistAuthSession({ id: 7, avatar: 'https://example.test/current.png' }, 'memory-token');
    localStorage.setItem('user', JSON.stringify({ avatar: 'https://example.test/stale.png' }));

    syncProfileAvatarBranding();

    expect(
      document.documentElement.style.getPropertyValue('--gastronexa-profile-avatar'),
    ).toContain('https://example.test/current.png');
    expect(localStorage.getItem('user')).toBeNull();

    clearAuthSession();
    syncProfileAvatarBranding();

    expect(document.documentElement.style.getPropertyValue('--gastronexa-profile-avatar')).toBe('');
    expect(document.documentElement.dataset.gastronexaProfileAvatar).toBeUndefined();
  });
});
