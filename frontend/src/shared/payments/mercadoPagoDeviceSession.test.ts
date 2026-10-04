import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SECURITY_SCRIPT_URL = 'https://www.mercadopago.com/v2/security.js';
const scriptSelector = `script[src="${SECURITY_SCRIPT_URL}"]`;

describe('collectMercadoPagoDeviceSession', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    delete window.MP_DEVICE_SESSION_ID;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    document.querySelectorAll(scriptSelector).forEach((script) => script.remove());
    delete window.MP_DEVICE_SESSION_ID;
  });

  it('reaproveita imediatamente a sessão real disponível, sem outro script', async () => {
    const { collectMercadoPagoDeviceSession } = await import('./mercadoPagoDeviceSession');
    window.MP_DEVICE_SESSION_ID = ' existing-provider-session ';

    await expect(collectMercadoPagoDeviceSession()).resolves.toBe('existing-provider-session');
    expect(document.querySelector(scriptSelector)).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('carrega o script oficial uma vez e aguarda a sessão publicada depois do load', async () => {
    const { collectMercadoPagoDeviceSession } = await import('./mercadoPagoDeviceSession');
    const first = collectMercadoPagoDeviceSession();
    const second = collectMercadoPagoDeviceSession();
    const script = document.querySelector<HTMLScriptElement>(scriptSelector)!;
    const completed = vi.fn();
    void first.then(completed);

    expect(second).toBe(first);
    expect(document.querySelectorAll(scriptSelector)).toHaveLength(1);
    expect(script.async).toBe(true);
    expect(script.getAttribute('view')).toBe('checkout');

    script.dispatchEvent(new Event('load'));
    await vi.advanceTimersByTimeAsync(100);
    expect(completed).not.toHaveBeenCalled();
    window.MP_DEVICE_SESSION_ID = 'provider-session-after-load';
    await vi.advanceTimersByTimeAsync(50);

    await expect(first).resolves.toBe('provider-session-after-load');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reaproveita um script existente sem duplicar a coleta', async () => {
    const { collectMercadoPagoDeviceSession } = await import('./mercadoPagoDeviceSession');
    const script = document.createElement('script');
    script.src = SECURITY_SCRIPT_URL;
    document.head.appendChild(script);

    const pending = collectMercadoPagoDeviceSession();
    window.MP_DEVICE_SESSION_ID = 'session-from-existing-script';
    await vi.advanceTimersByTimeAsync(50);

    await expect(pending).resolves.toBe('session-from-existing-script');
    expect(document.querySelectorAll(scriptSelector)).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('libera o pagamento sem inventar uma sessão quando a coleta excede 1500 ms', async () => {
    const { collectMercadoPagoDeviceSession } = await import('./mercadoPagoDeviceSession');
    const pending = collectMercadoPagoDeviceSession();
    await vi.advanceTimersByTimeAsync(1500);

    await expect(pending).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
    await expect(collectMercadoPagoDeviceSession()).resolves.toBeUndefined();
    expect(document.querySelectorAll(scriptSelector)).toHaveLength(1);

    // If the provider finishes later, the next payment uses that authentic ID.
    window.MP_DEVICE_SESSION_ID = 'late-provider-session';
    await expect(collectMercadoPagoDeviceSession()).resolves.toBe('late-provider-session');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('libera o pagamento e remove a espera quando o script é bloqueado', async () => {
    const { collectMercadoPagoDeviceSession } = await import('./mercadoPagoDeviceSession');
    const pending = collectMercadoPagoDeviceSession();
    document.querySelector(scriptSelector)!.dispatchEvent(new Event('error'));

    await expect(pending).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
    await expect(collectMercadoPagoDeviceSession()).resolves.toBeUndefined();
  });
});
