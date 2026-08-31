import styled from 'styled-components';

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 20px;
  background: linear-gradient(135deg, rgba(20, 18, 16, 0.64), rgba(20, 18, 16, 0.57));
  contain: paint;
  animation: admin-unsaved-backdrop-in 180ms ease both;

  @keyframes admin-unsaved-backdrop-in {
    from {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const Dialog = styled.section`
  position: relative;
  width: min(100%, 470px);
  min-height: 300px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 24px;
  padding: 30px;
  background: #fffdfb;
  color: #211e1b;
  box-shadow: 0 30px 90px rgba(20, 14, 10, 0.28);
  display: flex;
  flex-direction: column;
  justify-content: center;
  contain: layout paint style;
  backface-visibility: hidden;
  will-change: transform, opacity;
  animation: admin-unsaved-dialog-enter 250ms cubic-bezier(0.22, 0.8, 0.35, 1) both;

  @keyframes admin-unsaved-dialog-enter {
    from {
      opacity: 0;
      transform: translate3d(0, 14px, 0) scale(0.975);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  @media (max-width: 520px) {
    min-height: 286px;
    padding: 24px 18px;
    border-radius: 20px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const ChoiceIcon = styled.span`
  width: 50px;
  height: 50px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  color: var(--a, #d64d08);
  background: color-mix(in srgb, var(--a, #d64d08) 11%, #fff);

  svg {
    width: 24px;
    height: 24px;
  }
`;

export const ChoiceCopy = styled.div`
  margin-top: 20px;

  h2 {
    margin: 0;
    font-size: 23px;
    letter-spacing: -0.025em;
  }

  p {
    margin: 10px 0 0;
    color: #746d67;
    font-size: 14px;
    line-height: 1.55;
  }
`;

export const Actions = styled.footer`
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 10px;
  margin-top: 28px;

  button {
    position: relative;
    isolation: isolate;
    height: 49px;
    overflow: hidden;
    border-radius: 13px;
    padding: 0 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    contain: paint;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      opacity 160ms ease;
  }

  button::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: rgba(30, 22, 17, 0.2);
    backface-visibility: hidden;
    transform: translate3d(0, 0, 0) scaleX(0);
    transform-origin: left center;
  }

  button[data-progress='true']::before {
    will-change: transform;
    animation: admin-unsaved-button-progress 1200ms cubic-bezier(0.3, 0.75, 0.35, 1) forwards;
  }

  button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  button:disabled:not([data-progress='true']) {
    opacity: 0.48;
  }

  button[data-progress='true'] svg {
    will-change: transform;
    animation: admin-unsaved-spinner 800ms linear infinite;
  }

  .discard {
    border: 1px solid #ded7d0;
    background: #fff;
    color: #514b46;
  }

  .discard::before {
    background: #e5ddd6;
  }

  .save {
    border: 0;
    background: var(--a, #d64d08);
    color: #fff;
    box-shadow: 0 9px 22px color-mix(in srgb, var(--a, #d64d08) 28%, transparent);
  }

  @keyframes admin-unsaved-button-progress {
    to {
      transform: translate3d(0, 0, 0) scaleX(1);
    }
  }

  @keyframes admin-unsaved-spinner {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 420px) {
    grid-template-columns: 1fr;

    .save {
      order: -1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    button[data-progress='true']::before {
      animation: none;
      transform: translate3d(0, 0, 0) scaleX(1);
    }

    button[data-progress='true'] svg {
      animation: none;
    }
  }
`;

export const Result = styled.div<{ $tone: 'success' | 'discarded' }>`
  display: grid;
  justify-items: center;
  text-align: center;

  .result-icon {
    width: 68px;
    height: 68px;
    border-radius: 22px;
    color: ${({ $tone }) => ($tone === 'success' ? '#237346' : '#9a493d')};
    background: ${({ $tone }) => ($tone === 'success' ? '#eaf7ef' : '#fff0ed')};
    display: grid;
    place-items: center;
    box-shadow: 0 12px 30px
      ${({ $tone }) => ($tone === 'success' ? 'rgba(35, 115, 70, 0.13)' : 'rgba(154, 73, 61, 0.13)')};
  }

  .result-icon svg {
    width: 32px;
    height: 32px;
  }

  h2 {
    margin: 22px 0 0;
    font-size: 24px;
    letter-spacing: -0.025em;
  }

  p {
    max-width: 330px;
    margin: 9px 0 0;
    color: #746d67;
    font-size: 14px;
    line-height: 1.5;
  }

  small {
    margin-top: 22px;
    color: #918981;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
`;
