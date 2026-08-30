import { memo, useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HomeBanner } from '../types';
import {
  PROMOTION_CAROUSEL_INTERVAL_MS,
  usePromotionCarousel,
} from '../hooks/usePromotionCarousel';
import { resolveCarouselSwipe } from '../domain/promotionCarouselGesture';
import * as S from './PromotionCarousel.styles';

type PromotionCarouselProps = {
  banners: HomeBanner[];
  onOpenMenu?: () => void;
};

export const PromotionCarousel = memo(function PromotionCarousel({
  banners,
  onOpenMenu,
}: PromotionCarouselProps) {
  const [announcement, setAnnouncement] = useState('');
  const touchStartRef = useRef<{ identifier: number; x: number; y: number } | null>(null);
  const { activeIndex, autoplayPaused, goTo, goNext, goPrevious } = usePromotionCarousel(
    banners.map((banner) => banner.id),
  );

  useEffect(() => {
    if (banners.length < 2) return;
    const nextBanner = banners[(activeIndex + 1) % banners.length];
    if (!nextBanner?.image) return;

    const image = new Image();
    image.decoding = 'async';
    image.src = nextBanner.image;
    if (typeof image.decode === 'function') {
      void image.decode().catch(() => undefined);
    }
  }, [activeIndex, banners]);

  if (!banners.length) return null;

  const hasControls = banners.length > 1;
  const announceSlide = (index: number) => {
    const banner = banners[index];
    if (!banner) return;
    setAnnouncement(`Promoção ${index + 1} de ${banners.length}: ${banner.title}`);
  };
  const showPrevious = () => {
    const nextIndex = (activeIndex - 1 + banners.length) % banners.length;
    goPrevious();
    announceSlide(nextIndex);
  };
  const showNext = () => {
    const nextIndex = (activeIndex + 1) % banners.length;
    goNext();
    announceSlide(nextIndex);
  };
  const showBanner = (index: number) => {
    goTo(index);
    announceSlide(index);
  };
  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStartRef.current = {
      identifier: touch.identifier,
      x: touch.clientX,
      y: touch.clientY,
    };
  };
  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const touch = Array.from(event.changedTouches).find(
      (candidate) => candidate.identifier === start.identifier,
    );
    if (!touch) return;

    const direction = resolveCarouselSwipe(start, { x: touch.clientX, y: touch.clientY });
    if (direction === 'NEXT') showNext();
    if (direction === 'PREVIOUS') showPrevious();
  };
  const handleDotKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let targetIndex: number | null = null;
    if (event.key === 'ArrowLeft') targetIndex = (index - 1 + banners.length) % banners.length;
    if (event.key === 'ArrowRight') targetIndex = (index + 1) % banners.length;
    if (event.key === 'Home') targetIndex = 0;
    if (event.key === 'End') targetIndex = banners.length - 1;
    if (targetIndex === null) return;

    event.preventDefault();
    const buttons =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button');
    showBanner(targetIndex);
    buttons?.[targetIndex]?.focus();
  };
  return (
    <S.Carousel
      role="region"
      aria-label="Promoções do restaurante"
      aria-roledescription="carousel"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => {
        touchStartRef.current = null;
      }}
    >
      {banners.map((banner, index) => {
        const active = index === activeIndex;
        return (
          <S.Slide
            key={banner.id}
            role="group"
            aria-label={`${index + 1} de ${banners.length}: ${banner.title}`}
            aria-roledescription="slide"
            aria-hidden={!active}
            hidden={!active}
          >
            <S.BannerImage
              src={banner.image}
              alt=""
              aria-hidden="true"
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={index === 0 ? 'high' : 'auto'}
            />
            <S.Shade aria-hidden="true" />
            <S.Copy>
              <S.Eyebrow>
                <span aria-hidden="true" />
                Oferta em destaque
              </S.Eyebrow>
              <h1>
                <span>{banner.title}</span>
                {banner.highlight && <em>{banner.highlight}</em>}
              </h1>
              {banner.description && <p>{banner.description}</p>}
              <button type="button" onClick={onOpenMenu}>
                {banner.buttonLabel || 'Ver cardápio'}
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </S.Copy>
          </S.Slide>
        );
      })}

      {hasControls && (
        <>
          <S.ArrowButton
            $side="left"
            type="button"
            aria-label="Promoção anterior"
            onClick={showPrevious}
          >
            <ChevronLeft aria-hidden="true" />
          </S.ArrowButton>
          <S.ArrowButton
            $side="right"
            type="button"
            aria-label="Próxima promoção"
            onClick={showNext}
          >
            <ChevronRight aria-hidden="true" />
          </S.ArrowButton>
          <S.Dots
            $paused={autoplayPaused}
            $durationMs={PROMOTION_CAROUSEL_INTERVAL_MS}
            role="group"
            aria-label="Escolher promoção"
          >
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`Mostrar promoção ${index + 1}: ${banner.title}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                data-complete={index < activeIndex ? 'true' : undefined}
                tabIndex={index === activeIndex ? 0 : -1}
                onClick={() => showBanner(index)}
                onKeyDown={(event) => handleDotKeyDown(event, index)}
              />
            ))}
          </S.Dots>
        </>
      )}

      <S.ScreenReaderStatus role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </S.ScreenReaderStatus>
    </S.Carousel>
  );
});
