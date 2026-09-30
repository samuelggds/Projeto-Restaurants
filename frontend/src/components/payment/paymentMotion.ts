import { css, keyframes } from 'styled-components';

export const paymentScreenFade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const paymentSurfaceRise = keyframes`
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.992);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

export const paymentContentReveal = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const paymentStatusPop = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.78);
  }
  68% {
    opacity: 1;
    transform: scale(1.055);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

export const paymentPulse = keyframes`
  0%, 100% {
    opacity: 0.32;
    transform: translateY(0) scale(0.92);
  }
  50% {
    opacity: 1;
    transform: translateY(-1px) scale(1);
  }
`;

export const paymentReducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0ms !important;
    scroll-behavior: auto !important;
  }
`;
