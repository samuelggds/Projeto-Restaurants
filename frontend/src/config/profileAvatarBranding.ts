import { readSessionUserRaw } from '../modules/auth/session/authSession';

function safeCssUrl(value: string) {
  return `url(${JSON.stringify(value)})`;
}

export function syncProfileAvatarBranding(avatarOverride?: string | null) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  let avatar = String(avatarOverride || '').trim();
  if (!avatar) {
    try {
      const user = JSON.parse(readSessionUserRaw() || 'null') as Record<string, unknown> | null;
      avatar = String(user?.avatar || '').trim();
    } catch {
      avatar = '';
    }
  }

  if (
    avatar &&
    (/^data:image\/(png|jpeg|webp);base64,/u.test(avatar) || /^https:\/\//u.test(avatar))
  ) {
    document.documentElement.style.setProperty('--gastronexa-profile-avatar', safeCssUrl(avatar));
    document.documentElement.dataset.gastronexaProfileAvatar = 'true';
    return;
  }

  document.documentElement.style.removeProperty('--gastronexa-profile-avatar');
  delete document.documentElement.dataset.gastronexaProfileAvatar;
}

syncProfileAvatarBranding();
window.addEventListener('storage', (event) => {
  if (!event.key || event.key === 'user') syncProfileAvatarBranding();
});
window.addEventListener('popstate', () => syncProfileAvatarBranding());
document.addEventListener('click', (event) => {
  if ((event.target as Element | null)?.closest('a,button')) {
    window.setTimeout(() => syncProfileAvatarBranding(), 0);
  }
});
