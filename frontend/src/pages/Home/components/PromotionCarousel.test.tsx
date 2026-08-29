import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeBanner } from '../types';
import { PROMOTION_CAROUSEL_INTERVAL_MS } from '../hooks/usePromotionCarousel';
import { PromotionCarousel } from './PromotionCarousel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const banners: HomeBanner[] = [
  {
    id: 1,
    title: 'Festival de pizzas',
    highlight: '30% OFF',
    description: 'Somente nesta sexta-feira.',
    buttonLabel: 'Escolher promoção',
    image: 'https://cdn.example.com/pizza.webp',
    active: true,
    position: 0,
  },
  {
    id: 2,
    title: 'Combo em família',
    description: 'Pizza, acompanhamento e bebida.',
    buttonLabel: 'Ver combo',
    image: 'https://cdn.example.com/combo.webp',
    active: true,
    position: 1,
  },
];

function dispatchTouch(
  target: Element,
  type: 'touchstart' | 'touchend',
  touch: { identifier: number; clientX: number; clientY: number },
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    touches: { value: type === 'touchstart' ? [touch] : [] },
    changedTouches: { value: type === 'touchend' ? [touch] : [] },
  });
  target.dispatchEvent(event);
}

describe('PromotionCarousel', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('expõe semântica acessível e deixa somente a promoção atual interativa', () => {
    act(() => root.render(<PromotionCarousel banners={banners} />));

    const carousel = container.querySelector('[aria-roledescription="carousel"]');
    const slides = container.querySelectorAll('[aria-roledescription="slide"]');
    expect(carousel?.getAttribute('aria-label')).toBe('Promoções do restaurante');
    expect(slides).toHaveLength(2);
    expect((slides[0] as HTMLElement).hidden).toBe(false);
    expect((slides[1] as HTMLElement).hidden).toBe(true);
    expect(slides[0].textContent).toContain('30% OFF');
    expect(slides[0].querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('permite navegar, escolher um banner e mantém a rotação após clicar no cardápio', async () => {
    const onOpenMenu = vi.fn();
    act(() => root.render(<PromotionCarousel banners={banners} onOpenMenu={onOpenMenu} />));

    act(() => {
      (container.querySelector('[aria-label="Próxima promoção"]') as HTMLButtonElement).click();
    });
    const slides = container.querySelectorAll('[aria-roledescription="slide"]');
    expect((slides[0] as HTMLElement).hidden).toBe(true);
    expect((slides[1] as HTMLElement).hidden).toBe(false);
    expect(container.querySelector('[role="status"]')?.textContent).toContain('Promoção 2 de 2');

    act(() => {
      (container.querySelector('[aria-label^="Mostrar promoção 1"]') as HTMLButtonElement).click();
    });
    expect((slides[0] as HTMLElement).hidden).toBe(false);

    act(() => {
      const menuButton = container.querySelector(
        'article:not([hidden]) button',
      ) as HTMLButtonElement;
      menuButton.focus();
      menuButton.click();
    });
    expect(onOpenMenu).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PROMOTION_CAROUSEL_INTERVAL_MS);
    });
    expect((slides[1] as HTMLElement).hidden).toBe(false);
  });

  it('mantém setas laterais e apenas o indicador ativo no fluxo do teclado', () => {
    act(() => root.render(<PromotionCarousel banners={banners} />));

    expect(container.querySelector('[aria-label="Promoção anterior"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Próxima promoção"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Pausar rotação automática"]')).toBeNull();

    const dots = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[aria-label="Escolher promoção"] button'),
    );
    expect(dots).toHaveLength(2);
    expect(dots[0].getAttribute('aria-current')).toBe('true');
    expect(dots[0].getAttribute('data-complete')).toBeNull();
    expect(dots[0].tabIndex).toBe(0);
    expect(dots[1].tabIndex).toBe(-1);

    act(() => {
      dots[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });

    expect(dots[1].getAttribute('aria-current')).toBe('true');
    expect(dots[0].getAttribute('data-complete')).toBe('true');
    expect(dots[1].tabIndex).toBe(0);
    expect(document.activeElement).toBe(dots[1]);

    act(() => {
      (container.querySelector('[aria-label="Promoção anterior"]') as HTMLButtonElement).click();
    });
    expect(dots[0].getAttribute('aria-current')).toBe('true');
  });

  it('não mostra navegação nem pausa quando existe somente um banner', () => {
    act(() => root.render(<PromotionCarousel banners={[banners[0]]} />));

    expect(container.querySelector('[aria-label="Promoção anterior"]')).toBeNull();
    expect(container.querySelector('[aria-label="Próxima promoção"]')).toBeNull();
    expect(container.querySelector('[aria-label="Escolher promoção"]')).toBeNull();
    expect(container.querySelector('[aria-label="Pausar rotação automática"]')).toBeNull();
  });

  it('alterna os banners com gesto horizontal no touchscreen', () => {
    act(() => root.render(<PromotionCarousel banners={banners} />));
    const carousel = container.querySelector('[aria-roledescription="carousel"]') as HTMLElement;
    const slides = container.querySelectorAll('[aria-roledescription="slide"]');

    act(() => {
      dispatchTouch(carousel, 'touchstart', { identifier: 1, clientX: 250, clientY: 90 });
      dispatchTouch(carousel, 'touchend', { identifier: 1, clientX: 145, clientY: 96 });
    });
    expect((slides[1] as HTMLElement).hidden).toBe(false);

    act(() => {
      dispatchTouch(carousel, 'touchstart', { identifier: 2, clientX: 130, clientY: 92 });
      dispatchTouch(carousel, 'touchend', { identifier: 2, clientX: 235, clientY: 86 });
    });
    expect((slides[0] as HTMLElement).hidden).toBe(false);
  });
});
