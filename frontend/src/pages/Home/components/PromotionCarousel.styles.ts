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
  height: clamp(320px, 32vw, 455px);
  margin-bottom: 28px;
  overflow: hidden;
  touch-action: pan-y pinch-zoom;
  border: 1px solid rgba(47, 35, 25, 0.1);
  border-radius: 28px;
  background: #18130f;
  box-shadow:
    0 26px 58px rgba(52, 31, 14, 0.15),
    0 3px 10px rgba(52, 31, 14, 0.08);

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
    height: clamp(150px, 42vw, 190px);
    margin-bottom: 20px;
    border-radius: 17px;
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
  user-select: none;
`;

export const Shade = styled.span`
  position: absolute;
  inset: 0;
  z-index: -2;
  background:
    linear-gradient(90deg, rgba(13, 9, 7, 0.74) 0%, rgba(18, 12, 8, 0.42) 44%, transparent 78%),
    linear-gradient(0deg, rgba(10, 7, 5, 0.48) 0%, transparent 48%),
    linear-gradient(180deg, rgba(8, 6, 5, 0.16) 0%, transparent 35%);
  pointer-events: none;

  @media (max-width: 800px) {
    background:
      linear-gradient(90deg, rgba(13, 9, 7, 0.7) 0%, rgba(18, 11, 7, 0.42) 100%),
      linear-gradient(0deg, rgba(10, 7, 5, 0.58) 0%, transparent 65%);
  }
`;

export const Copy = styled.div`
  position: absolute;
  top: 50%;
  left: clamp(76px, 7vw, 104px);
  width: min(540px, calc(100% - 190px));
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 0;
  color: #fff;

  h1 {
    width: 100%;
    max-width: 500px;
    margin: 12px 0 0;
    font-size: clamp(34px, 3.7vw, 54px);
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.04em;
    overflow-wrap: anywhere;
    text-wrap: balance;
    text-shadow: 0 3px 24px rgba(0, 0, 0, 0.32);
  }

  h1 > span {
    display: block;
  }

  h1 em {
    display: block;
    margin-top: 7px;
    color: color-mix(in srgb, var(--home-primary) 72%, #ffc49d);
    font-style: normal;
    font-size: 0.86em;
    letter-spacing: -0.025em;
  }

  p {
    display: -webkit-box;
    max-width: 470px;
    margin: 15px 0 22px;
    overflow: hidden;
    color: rgba(255, 255, 255, 0.86);
    font-size: clamp(14px, 1.35vw, 17px);
    line-height: 1.5;
    text-shadow: 0 2px 14px rgba(0, 0, 0, 0.42);
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  > button {
    min-height: 46px;
    border: 1px solid color-mix(in srgb, var(--home-primary) 72%, white);
    border-radius: 999px;
    padding: 0 21px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    color: #fff;
    background: var(--home-primary);
    box-shadow: 0 11px 26px color-mix(in srgb, var(--home-primary) 30%, transparent);
    font-size: 14px;
    font-weight: 850;
    cursor: pointer;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      filter 160ms ease;
  }

  > button:hover {
    transform: translateY(-2px);
    filter: brightness(1.06);
    box-shadow: 0 15px 32px color-mix(in srgb, var(--home-primary) 40%, transparent);
  }

  > button:focus-visible {
    outline: 3px solid #fff;
    outline-offset: 3px;
  }

  @media (max-width: 800px) {
    top: 46%;
    left: 50%;
    width: calc(100% - 90px);
    padding: 0;
    transform: translate(-50%, -50%);

    h1 {
      margin-top: 0;
      font-size: clamp(21px, 6.4vw, 28px);
      line-height: 0.98;
    }

    h1 em {
      margin-top: 3px;
    }

    p {
      display: none;
    }

    > button {
      min-height: 36px;
      max-width: 100%;
      margin-top: 11px;
      padding: 0 15px;
      gap: 7px;
      font-size: 12px;

      svg {
        width: 15px;
        height: 15px;
      }
    }
  }

  @media (prefers-reduced-motion: reduce) {
    > button {
      transition: none;
    }
  }
`;

export const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;

  > span {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--home-primary);
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--home-primary) 18%, transparent);
  }

  @media (max-width: 800px) {
    display: none;
  }
`;

export const ArrowButton = styled.button<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${({ $side }) => ($side === 'left' ? 'left: 14px;' : 'right: 14px;')}
  z-index: 5;
  width: 58px;
  height: 76px;
  border: 0;
  border-radius: 20px;
  display: grid;
  place-items: center;
  padding: 0;
  color: #fff;
  background: transparent;
  filter: drop-shadow(0 3px 7px rgba(0, 0, 0, 0.62));
  transform: translateY(-50%);
  cursor: pointer;
  transition:
    color 180ms ease,
    background 180ms ease,
    transform 180ms ease;

  svg {
    width: 45px;
    height: 45px;
    stroke-width: 1.65;
  }

  &:hover {
    color: color-mix(in srgb, var(--home-primary) 68%, #fff);
    background: rgba(12, 9, 7, 0.24);
    transform: translateY(-50%) scale(1.06);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-primary) 60%, #fff);
    outline-offset: 0;
  }

  @media (max-width: 800px) {
    ${({ $side }) => ($side === 'left' ? 'left: 2px;' : 'right: 2px;')}
    width: 42px;
    height: 50px;

    svg {
      width: 30px;
      height: 30px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const Dots = styled.div<{ $paused: boolean; $durationMs: number }>`
  position: absolute;
  bottom: 14px;
  left: 50%;
  z-index: 5;
  width: min(520px, calc(100% - 160px));
  min-height: 30px;
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
    min-width: 32px;
    height: 30px;
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
    height: 2px;
    border-radius: 999px;
    transform: translateY(-50%);
  }

  button::before {
    background: rgba(255, 255, 255, 0.38);
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.32);
  }

  button::after {
    background: #fff;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.38);
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
    bottom: 3px;
    width: calc(100% - 104px);
    min-height: 24px;
    gap: 4px;

    button {
      min-width: 24px;
      height: 24px;
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
