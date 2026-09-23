type EnterpriseRecaptcha = {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

declare global {
  interface Window {
    grecaptcha?: {
      enterprise?: EnterpriseRecaptcha;
    };
  }
}

let loadedSiteKey = '';
let loadingPromise: Promise<void> | null = null;

function validSiteKey(value: unknown) {
  const siteKey = String(value || '').trim();
  return /^[A-Za-z0-9_-]{20,200}$/u.test(siteKey) ? siteKey : '';
}

function loadEnterpriseRecaptcha(siteKeyInput: unknown) {
  const siteKey = validSiteKey(siteKeyInput);
  if (!siteKey) return Promise.reject(new Error('Verificação antiabuso indisponível.'));

  if (window.grecaptcha?.enterprise && loadedSiteKey === siteKey) return Promise.resolve();
  if (loadingPromise && loadedSiteKey === siteKey) return loadingPromise;

  loadedSiteKey = siteKey;
  loadingPromise = new Promise<void>((resolve, reject) => {
    const src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`;
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-gastronexa-recaptcha="enterprise"]',
    );

    const finish = () => {
      if (window.grecaptcha?.enterprise) resolve();
      else reject(new Error('Verificação antiabuso indisponível.'));
    };

    if (existing) {
      existing.addEventListener('load', finish, { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Verificação antiabuso indisponível.')),
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.dataset.gastronexaRecaptcha = 'enterprise';
    script.addEventListener('load', finish, { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('Verificação antiabuso indisponível.')),
      { once: true },
    );
    document.head.appendChild(script);
  }).finally(() => {
    loadingPromise = null;
  });

  return loadingPromise;
}

export async function executePhoneCaptcha(siteKeyInput: unknown, action: string) {
  const siteKey = validSiteKey(siteKeyInput);
  if (!siteKey) throw new Error('Recuperação por SMS ainda não está configurada.');

  await loadEnterpriseRecaptcha(siteKey);
  const enterprise = window.grecaptcha?.enterprise;
  if (!enterprise) throw new Error('Verificação antiabuso indisponível.');

  await new Promise<void>((resolve) => enterprise.ready(resolve));
  const token = String(await enterprise.execute(siteKey, { action })).trim();
  if (token.length < 20) throw new Error('Verificação antiabuso não concluída.');
  return token;
}
