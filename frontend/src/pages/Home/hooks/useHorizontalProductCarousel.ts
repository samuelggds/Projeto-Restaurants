import { useCallback, useEffect, useRef, useState } from 'react';

type CarouselState = {
  hasOverflow: boolean;
  canPrevious: boolean;
  canNext: boolean;
};

type HorizontalProductCarouselOptions = {
  itemSelector: string;
  itemsKey: string;
  fallbackStep?: number;
};

function sameState(left: CarouselState, right: CarouselState) {
  return (
    left.hasOverflow === right.hasOverflow &&
    left.canPrevious === right.canPrevious &&
    left.canNext === right.canNext
  );
}

export function useHorizontalProductCarousel({
  itemSelector,
  itemsKey,
  fallbackStep = 260,
}: HorizontalProductCarouselOptions) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<CarouselState>({
    hasOverflow: false,
    canPrevious: false,
    canNext: false,
  });

  const sync = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const maxScrollLeft = Math.max(0, Math.ceil(track.scrollWidth - track.clientWidth));
    const currentScrollLeft = Math.max(0, Math.min(maxScrollLeft, track.scrollLeft));
    const hasOverflow = maxScrollLeft > 2;
    const nextState: CarouselState = {
      hasOverflow,
      canPrevious: hasOverflow && currentScrollLeft > 2,
      canNext: hasOverflow && currentScrollLeft < maxScrollLeft - 2,
    };

    setState((current) => (sameState(current, nextState) ? current : nextState));
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      sync();
      secondFrame = window.requestAnimationFrame(sync);
    });

    const onScroll = () => sync();
    const onResize = () => sync();

    track.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    const observer =
      typeof ResizeObserver === 'function' ? new ResizeObserver(() => sync()) : null;
    observer?.observe(track);
    Array.from(track.children).forEach((child) => observer?.observe(child));

    const images = Array.from(track.querySelectorAll('img'));
    images.forEach((image) => {
      if (!image.complete) image.addEventListener('load', onResize, { once: true });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
      observer?.disconnect();
      track.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      images.forEach((image) => image.removeEventListener('load', onResize));
    };
  }, [itemsKey, sync]);

  const scroll = useCallback(
    (direction: -1 | 1) => {
      const track = trackRef.current;
      if (!track) return;

      const firstCard = track.querySelector<HTMLElement>(itemSelector);
      const computed = window.getComputedStyle(track);
      const gap =
        Number.parseFloat(computed.columnGap || computed.gap || '0') || 0;
      const measuredWidth =
        firstCard?.getBoundingClientRect().width || firstCard?.offsetWidth || 0;
      const step =
        measuredWidth > 0
          ? measuredWidth + gap
          : Math.max(track.clientWidth * 0.82, fallbackStep);
      const maxScrollLeft = Math.max(0, track.scrollWidth - track.clientWidth);
      const target = Math.max(
        0,
        Math.min(maxScrollLeft, track.scrollLeft + direction * step),
      );

      if (Math.abs(target - track.scrollLeft) <= 1) {
        sync();
        return;
      }

      const reducedMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (typeof track.scrollTo === 'function') {
        track.scrollTo({
          left: target,
          behavior: reducedMotion ? 'auto' : 'smooth',
        });
      } else {
        track.scrollLeft = target;
      }

      window.requestAnimationFrame(sync);
    },
    [fallbackStep, itemSelector, sync],
  );

  return {
    trackRef,
    hasOverflow: state.hasOverflow,
    canPrevious: state.canPrevious,
    canNext: state.canNext,
    scroll,
    sync,
  };
}
