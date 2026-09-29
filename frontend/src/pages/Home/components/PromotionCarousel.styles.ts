import styled, { keyframes } from 'styled-components';

const revealSlide = keyframes`
  from {
    opacity: 0;
    transform: scale(1.018);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

const fillStoryIndicator = keyframes`
  from { transform: translateY(-50%) scaleX(0); }
  to { transform: translateY(-50%) scaleX(1); }
`;

export const Carousel = styled.section`
  position: relative;
  width: 100%;
  height: clamp(300px, 34vw, 430px);
  min-height: 300px;
  margin: 0;
  overflow: hidden;
  touch-action: pan-y pinch-zoom;
  border: 1px solid rgba(47, 35, 25, 0.1);
  border-radius: 18px;
  background: #18130f;
  box-shadow:
    0 18px 42px rgba(28, 28, 28, 0.10),
    0 2px 8px rgba(28, 28, 28, 0.05);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 3;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: inherit;
    pointer-events: none;
  }

  @media (max-width: 800px) {
    height: min(38svh, 300px);
    min-height: 240px;
    border-radius: 16px;
  }

  @media (max-width: 480px) {
    height: 224px;
    min-height: 224px;
  }

  @media (prefers-reduced-motion: reduce) {
    scroll-behavior: auto;
  }
`;

export const Slide = styled.article`
  position: absolute;
  inset: 0;
  isolation: isolate;
  animation: ${revealSlide} 520ms ease both;

  &[hidden] {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const BannerImage = styled.img`
  position: absolute;
  inset: 0;
  z-index: -3;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  image-rendering: auto;
  backface-visibility: hidden;
  transform: translateZ(0);
  user-select: none;
`;

export const Shade = styled.span`
  position: absolute;
  inset: 0;
  z-index: -2;
  background: linear-gradient(
    90deg,
    rgba(15, 12, 10, 0.86) 0%,
    rgba(15, 12, 10, 0.52) 42%,
    rgba(15, 12, 10, 0.26) 68%,
    rgba(15, 12, 10, 0.10) 100%
  );
  pointer-events: none;

  @media (max-width: 800px) {
    background: linear-gradient(
      90deg,
      rgba(15, 12, 10, 0.88) 0%,
      rgba(15, 12, 10, 0.56) 58%,
      rgba(15, 12, 10, 0.18) 100%
    );
  }
`;

export const Copy = styled.div`
  position: absolute;
  top: 50%;
  left: clamp(20px, 4vw, 34px);
  z-index: 2;
  width: min(68%, 440px);
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  color: #fff;

  h1 {
    margin: 0;
    max-width: 100%;
    color: #fff;
    font-family: 'Gabarito', 'Inter', system-ui, sans-serif;
    font-size: clamp(22px, 2.35vw, 34px);
    font-weight: 900;
    line-height: 1.02;
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
    text-wrap: balance;
    text-shadow:
      0 2px 8px rgba(0, 0, 0, 0.48),
      0 6px 22px rgba(0, 0, 0, 0.24);
  }

  h1 > span {
    display: block;
  }

  h1 em {
    display: block;
    margin-top: 5px;
    color: color-mix(in srgb, var(--home-primary) 86%, #ff9b65);
    font-style: normal;
    font-size: 1.12em;
    font-weight: 950;
    line-height: 0.98;
    text-shadow:
      0 2px 8px rgba(0, 0, 0, 0.42),
      0 7px 24px color-mix(in srgb, var(--home-primary) 18%, transparent);
  }

  p {
    display: -webkit-box;
    max-width: 390px;
    margin: 9px 0 0;
    overflow: hidden;
    color: rgba(255, 255, 255, 0.94);
    font-size: clamp(11px, 1.05vw, 14px);
    font-weight: 600;
    line-height: 1.38;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.52);
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  > button {
    min-height: 38px;
    margin-top: 14px;
    border: 0;
    border-radius: 10px;
    padding: 0 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #fff;
    background: var(--home-primary);
    box-shadow:
      0 8px 22px color-mix(in srgb, var(--home-primary) 30%, transparent),
      0 2px 6px rgba(0, 0, 0, 0.18);
    font-size: 12px;
    font-weight: 850;
    cursor: pointer;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      filter 160ms ease;
  }

  > button:hover {
    transform: translateY(-1px);
    filter: brightness(1.06);
    box-shadow:
      0 10px 28px color-mix(in srgb, var(--home-primary) 38%, transparent),
      0 3px 8px rgba(0, 0, 0, 0.20);
  }

  > button:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }

  @media (max-width: 800px) {
    left: 20px;
    width: min(78%, 360px);

    h1 {
      font-size: clamp(20px, 7vw, 28px);
    }

    h1 em {
      margin-top: 4px;
    }

    p {
      max-width: 290px;
      margin-top: 7px;
      font-size: 11px;
      line-height: 1.32;
    }

    > button {
      min-height: 34px;
      margin-top: 11px;
      padding: 0 15px;
      font-size: 11px;
    }

    > button svg {
      width: 14px;
      height: 14px;
    }
  }

  @media (max-width: 480px) {
    left: 18px;
    width: 76%;

    h1 {
      font-size: clamp(19px, 7.2vw, 26px);
    }

    p {
      max-width: 245px;
    }

    > button {
      min-height: 32px;
      margin-top: 9px;
      padding-inline: 14px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    > button {
      transition: none;
    }

    > button:hover {
      transform: none;
    }
  }
`;

export const ArrowButton = styled.button<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${({ $side }) => ($side === 'left' ? 'left: 14px;' : 'right: 14px;')}
  z-index: 5;
  width: 46px;
  height: 46px;
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 50%;
  display: grid;
  place-items: center;
  padding: 0;
  color: #fff;
  background: rgba(12, 9, 7, 0.24);
  backdrop-filter: blur(8px);
  filter: drop-shadow(0 3px 7px rgba(0, 0, 0, 0.62));
  transform: translateY(-50%);
  cursor: pointer;
  transition:
    color 180ms ease,
    background 180ms ease,
    transform 180ms ease;

  svg {
    width: 24px;
    height: 24px;
    stroke-width: 2;
  }

  &:hover {
    color: color-mix(in srgb, var(--home-primary) 68%, #fff);
    background: rgba(12, 9, 7, 0.52);
    transform: translateY(-50%) scale(1.06);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-primary) 60%, #fff);
    outline-offset: 0;
  }

  @media (max-width: 800px) {
    ${({ $side }) => ($side === 'left' ? 'left: 7px;' : 'right: 7px;')}
    width: 34px;
    height: 34px;

    svg {
      width: 20px;
      height: 20px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const Dots = styled.div<{ $paused: boolean; $durationMs: number }>`
  position: absolute;
  bottom: 10px;
  left: 50%;
  z-index: 5;
  width: calc(100% - 32px);
  min-height: 22px;
  padding: 0;
  overflow-x: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transform: translateX(-50%);
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  button {
    position: relative;
    width: auto;
    min-width: 24px;
    height: 22px;
    flex: 1 1 90px;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
  }

  button::before,
  button::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 0;
    left: 0;
    height: 3px;
    border-radius: 999px;
    transform: translateY(-50%);
  }

  button::before {
    background: rgba(255, 255, 255, 0.34);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  }

  button::after {
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.42);
    transform: translateY(-50%) scaleX(0);
    transform-origin: left center;
  }

  button[aria-current='true']::after {
    animation: ${fillStoryIndicator} ${({ $durationMs }) => $durationMs}ms linear both;
    animation-play-state: ${({ $paused }) => ($paused ? 'paused' : 'running')};
  }

  button[data-complete='true']::after {
    transform: translateY(-50%) scaleX(1);
  }

  button:focus-visible {
    outline: 2px solid #fff;
    outline-offset: -2px;
    border-radius: 999px;
  }

  @media (max-width: 800px) {
    bottom: 8px;
    width: calc(100% - 24px);
    min-height: 20px;
    gap: 4px;

    button {
      min-width: 18px;
      height: 20px;
    }

    button::before,
    button::after {
      height: 3px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    button[aria-current='true']::after {
      animation: none;
      transform: translateY(-50%) scaleX(1);
    }
  }
`;

export const ScreenReaderStatus = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;