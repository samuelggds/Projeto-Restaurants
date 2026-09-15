function safeCssUrl(value: string) {
  return `url(${JSON.stringify(value)})`;
}

export function syncProfileAvatarBranding(avatarOverride?: string | null) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  let avatar = String(avatarOverride || '').trim();
  if (!avatar) {
    try {
      const user = JSON.parse(window.localStorage.getItem('user') || 'null') as
        | Record<string, unknown>
        | null;
      avatar = String(user?.avatar || '').trim();
    } catch {
      avatar = '';
    }
  }

  if (avatar && (/^data:image\/(png|jpeg|webp);base64,/u.test(avatar) || /^https:\/\//u.test(avatar))) {
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
