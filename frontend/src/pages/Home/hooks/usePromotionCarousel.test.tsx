import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROMOTION_CAROUSEL_INTERVAL_MS, usePromotionCarousel } from './usePromotionCarousel';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function Probe({ ids }: { ids: number[] }) {
  const carousel = usePromotionCarousel(ids);
  return (
    <section data-active={carousel.activeIndex} data-paused={carousel.autoplayPaused}>
      <button type="button" data-action="previous" onClick={carousel.goPrevious} />
      <button type="button" data-action="next" onClick={carousel.goNext} />
      <button type="button" data-action="first" onClick={() => carousel.goTo(0)} />
    </section>
  );
}

describe('usePromotionCarousel', () => {
  let container: HTMLDivElement;
  let root: Root;
  let visibilityState: DocumentVisibilityState;

  const activeIndex = () => Number(container.querySelector('section')?.dataset.active);
  const paused = () => container.querySelector('section')?.dataset.paused === 'true';
  const click = (action: string) => {
    act(() => {
      (container.querySelector(`[data-action="${action}"]`) as HTMLButtonElement).click();
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    visibilityState = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState);
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

  it('avança exatamente a cada 5 segundos e volta ao primeiro banner', async () => {
    act(() => root.render(<Probe ids={[10, 20, 30]} />));

    await act(async () => vi.advanceTimersByTimeAsync(PROMOTION_CAROUSEL_INTERVAL_MS - 1));
    expect(activeIndex()).toBe(0);

    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(activeIndex()).toBe(1);

    await act(async () => vi.advanceTimersByTimeAsync(PROMOTION_CAROUSEL_INTERVAL_MS));
    expect(activeIndex()).toBe(2);

    await act(async () => vi.advanceTimersByTimeAsync(PROMOTION_CAROUSEL_INTERVAL_MS));
    expect(activeIndex()).toBe(0);
  });

  it('reinicia os cinco segundos depois de qualquer navegação manual', async () => {
    act(() => root.render(<Probe ids={[1, 2, 3]} />));
    await act(async () => vi.advanceTimersByTimeAsync(4_000));

    click('next');
    expect(activeIndex()).toBe(1);
    await act(async () => vi.advanceTimersByTimeAsync(4_999));
    expect(activeIndex()).toBe(1);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(activeIndex()).toBe(2);

    click('previous');
    expect(activeIndex()).toBe(1);
    click('first');
    expect(activeIndex()).toBe(0);
  });

  it('pausa somente com a aba oculta e recomeça um ciclo completo ao voltar', async () => {
    act(() => root.render(<Probe ids={[1, 2]} />));

    act(() => {
      visibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    expect(activeIndex()).toBe(0);

    act(() => {
      visibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await act(async () => vi.advanceTimersByTimeAsync(4_999));
    expect(activeIndex()).toBe(0);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(activeIndex()).toBe(1);
  });

  it('não agenda rotação quando existe somente um item', async () => {
    act(() => root.render(<Probe ids={[1, 2]} />));
    await act(async () => vi.advanceTimersByTimeAsync(PROMOTION_CAROUSEL_INTERVAL_MS));
    expect(activeIndex()).toBe(1);

    act(() => root.render(<Probe ids={[1]} />));
    expect(paused()).toBe(true);
    await act(async () => vi.advanceTimersByTimeAsync(20_000));
    expect(activeIndex()).toBe(0);
  });

  it('preserva o banner ativo em reordenações e remove todos os timers ao desmontar', () => {
    act(() => root.render(<Probe ids={[1, 2, 3]} />));
    click('next');
    expect(activeIndex()).toBe(1);

    act(() => root.render(<Probe ids={[3, 2, 4]} />));
    expect(activeIndex()).toBe(1);

    act(() => root.render(<Probe ids={[3, 4]} />));
    expect(activeIndex()).toBe(0);

    act(() => root.unmount());
    expect(vi.getTimerCount()).toBe(0);
    root = createRoot(container);
  });
});
