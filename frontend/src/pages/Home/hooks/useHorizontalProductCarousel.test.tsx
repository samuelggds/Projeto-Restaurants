import { act, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHorizontalProductCarousel } from './useHorizontalProductCarousel';

class ResizeObserverMock {
  static callbacks: Array<() => void> = [];

  constructor(callback: () => void) {
    ResizeObserverMock.callbacks.push(callback);
  }

  observe() {}
  disconnect() {}

  static flush() {
    ResizeObserverMock.callbacks.forEach((callback) => callback());
  }
}

function Harness() {
  const { trackRef, scroll, hasOverflow, canPrevious, canNext } = useHorizontalProductCarousel({
    itemSelector: '[data-card]',
    itemsKey: '1|2|3|4|5',
  });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    Object.defineProperty(track, 'clientWidth', { configurable: true, value: 600 });
    Object.defineProperty(track, 'scrollWidth', { configurable: true, value: 1200 });
    Object.defineProperty(track, 'scrollLeft', {
      configurable: true,
      writable: true,
      value: 0,
    });
    const card = track.querySelector<HTMLElement>('[data-card]');
    if (card) {
      Object.defineProperty(card, 'offsetWidth', { configurable: true, value: 265 });
      card.getBoundingClientRect = () =>
        ({
          width: 265,
          height: 294,
          top: 0,
          left: 0,
          right: 265,
          bottom: 294,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect;
    }
    Object.defineProperty(track, 'scrollTo', {
      configurable: true,
      value: vi.fn(({ left }: ScrollToOptions) => {
        track.scrollLeft = Number(left || 0);
        track.dispatchEvent(new Event('scroll'));
      }),
    });
    ResizeObserverMock.flush();
  }, [trackRef]);

  return (
    <>
      <button type="button" onClick={() => scroll(-1)}>Anterior</button>
      <button type="button" onClick={() => scroll(1)}>Próximo</button>
      <output data-testid="state">
        {String(hasOverflow)}:{String(canPrevious)}:{String(canNext)}
      </output>
      <div ref={trackRef}>
        <article data-card />
        <article data-card />
        <article data-card />
        <article data-card />
        <article data-card />
      </div>
    </>
  );
}

describe('useHorizontalProductCarousel', () => {
  beforeEach(() => {
    ResizeObserverMock.callbacks = [];
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  it('detecta overflow e navega um card por vez para frente e para trás', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<Harness />);
    });

    const state = () => container.querySelector('[data-testid="state"]')?.textContent;
    expect(state()).toBe('true:false:true');

    const buttons = container.querySelectorAll('button');
    await act(async () => {
      (buttons[1] as HTMLButtonElement).click();
    });
    expect(state()).toBe('true:true:true');

    await act(async () => {
      (buttons[0] as HTMLButtonElement).click();
    });
    expect(state()).toBe('true:false:true');

    act(() => root.unmount());
    container.remove();
  });
});
