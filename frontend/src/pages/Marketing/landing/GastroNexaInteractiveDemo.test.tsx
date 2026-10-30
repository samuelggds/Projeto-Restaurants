import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GastroNexaInteractiveDemo } from './GastroNexaInteractiveDemo';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('animação pública QR e NFC', () => {
  let root: Root;
  let host: HTMLDivElement;
  let now = 0;
  let nextId = 0;
  let reduced = false;
  let observer: IntersectionObserverCallback;
  let frames: Map<number, FrameRequestCallback>;

  function advance(ms: number) {
    for (let i = 0; i < ms; i += 16) {
      now += 16;
      const callbacks = [...frames.values()];
      frames.clear();
      act(() => callbacks.forEach(callback => callback(now)));
    }
  }
  function click(selector: string) {
    act(() => { host.querySelector<HTMLButtonElement>(selector)!.click(); });
  }
  function show() {
    act(() => observer([{ isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry], {} as IntersectionObserver));
  }
  beforeEach(() => {
    now = 0;
    nextId = 0;
    reduced = false;
    frames = new Map();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = ++nextId;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion') && reduced,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { observer = callback; }
      observe() {}
      disconnect() {}
      unobserve() {}
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });
  afterEach(() => {
    act(() => { root.unmount(); });
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('inicia ao entrar na tela e move celular e scanner do QR', () => {
    act(() => { root.render(<GastroNexaInteractiveDemo />); });
    show();
    expect(host.querySelector('.gn-showcase-primary')?.textContent).toContain('Pausar');
    const phone = host.querySelector<HTMLElement>('.gn-scene-phone')!;
    const initialPosition = phone.style.transform;
    advance(450);
    expect(phone.style.transform).not.toBe(initialPosition);
    const initialLaser = host.querySelector<HTMLElement>('.gn-scene-laser')!.style.transform;
    advance(1600);
    expect(host.querySelector<HTMLElement>('.gn-scene-laser')!.style.transform).not.toBe(initialLaser);
  });
  it('gira o cartão automaticamente e pausa todos os movimentos', () => {
    act(() => { root.render(<GastroNexaInteractiveDemo />); });
    show();
    click('.gn-showcase-tabs button:nth-child(3)');
    const card = host.querySelector<HTMLButtonElement>('.gn-scene-card')!;
    const label = card.getAttribute('aria-label');
    advance(2200);
    expect(card.getAttribute('aria-label')).not.toBe(label);
    click('.gn-showcase-primary');
    const frozen = host.querySelector('.gn-scene-illustration')!.getAttribute('data-elapsed');
    advance(800);
    expect(host.querySelector('.gn-scene-illustration')!.getAttribute('data-elapsed')).toBe(frozen);
  });
  it('reinicia a partir da primeira etapa', () => {
    act(() => { root.render(<GastroNexaInteractiveDemo />); });
    show();
    click('.gn-showcase-tabs button:nth-child(3)');
    click('.gn-showcase-steps button:nth-child(3)');
    click('.gn-showcase-reset');
    expect(host.querySelector('.gn-showcase-steps button:first-child')?.getAttribute('aria-current')).toBe('step');
    expect(host.querySelector('.gn-scene-illustration')?.getAttribute('data-elapsed')).toBe('0');
  });
  it('respeita preferência de movimento reduzido até reprodução solicitada', () => {
    reduced = true;
    act(() => { root.render(<GastroNexaInteractiveDemo />); });
    show();
    expect(host.querySelector('.gn-showcase-primary')?.textContent).toContain('Ver animação');
    click('.gn-showcase-tabs button:nth-child(3)');
    expect(host.querySelector('.gn-showcase-primary')?.textContent).toContain('Ver animação');
    click('.gn-showcase-primary');
    advance(340);
    expect(Number(host.querySelector('.gn-scene-illustration')?.getAttribute('data-elapsed'))).toBeGreaterThan(0);
  });
});