import styled, { css, keyframes } from 'styled-components';

const arrive = keyframes`
  0% { opacity: 0; transform: translateY(8px) scale(0.82); }
  70% { opacity: 1; transform: translateY(0) scale(1.04); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;

const drawMark = keyframes`
  from { stroke-dashoffset: 1; }
  to { stroke-dashoffset: 0; }
`;

const countDown = keyframes`
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
`;

export const Page = styled.div<{ $embedded: boolean }>`
  --result-ink: #242c28;
  --result-muted: #606961;
  --result-accent: #52675d;
  --result-soft: #edf2ee;
  --result-ring: #dfe8e1;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  color: var(--result-ink);
  font-family: inherit;

  & *,
  & *::before,
  & *::after {
    box-sizing: border-box;
  }

  &[data-status='PAID'] {
    --result-accent: #187347;
    --result-soft: #edf8f0;
    --result-ring: #d8eddf;
  }

  &[data-status='FAILED'],
  &[data-status='CANCELED'] {
    --result-accent: #ba3232;
    --result-soft: #fff1f0;
    --result-ring: #f9dfdc;
  }

  &[data-status='PENDING'],
  &[data-status='EXPIRED'],
  &[data-status='ERROR'] {
    --result-accent: #876011;
    --result-soft: #fff7e4;
    --result-ring: #f4e8c8;
  }

  ${({ $embedded }) =>
    !$embedded &&
    css`
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: clamp(20px, 5vw, 56px) 20px;
      background: radial-gradient(ellipse at 50% 0%, #e7ede4 0, transparent 65%), #f5f3ee;

      @media (max-width: 540px) {
        padding: 20px 12px calc(20px + env(safe-area-inset-bottom));
      }
    `}
`;

export const Panel = styled.section<{ $embedded: boolean }>`
  width: min(100%, 520px);
  min-width: 0;
  margin-inline: auto;
  overflow: hidden;
  border: 1px solid #e1e5de;
  border-radius: 24px;
  background: #fffefa;
  box-shadow: ${({ $embedded }) =>
    $embedded ? 'none' : '0 24px 70px -24px rgba(37, 52, 40, 0.24)'};
`;

export const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 20px clamp(20px, 5vw, 36px);
  border-bottom: 1px solid #eceee7;

  > span {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    border: 1px solid #e4e6df;
    border-radius: 12px;
    background: #f6f6ef;
    color: #52675d;
  }

  > div {
    min-width: 0;
  }

  small,
  strong {
    display: block;
    overflow-wrap: anywhere;
  }

  small {
    margin-bottom: 3px;
    color: var(--result-muted);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  strong {
    font-size: 14px;
    line-height: 1.4;
  }
`;

export const Body = styled.div`
  padding: 32px clamp(20px, 5vw, 36px) 28px;
`;

export const Status = styled.div`
  display: grid;
  justify-items: center;
  text-align: center;
`;

export const StatusSymbol = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  width: 112px;
  height: 112px;
  margin: 4px 0 22px;
  border: 1px solid var(--result-ring);
  border-radius: 50%;
  background: var(--result-soft);
  color: var(--result-accent);
  animation: ${arrive} 600ms cubic-bezier(0.2, 0.7, 0.3, 1) both;

  &::before {
    position: absolute;
    inset: 10px;
    border: 1px solid var(--result-ring);
    border-radius: 50%;
    content: '';
  }

  > svg {
    position: relative;
    z-index: 1;
  }

  > .result-ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);

    circle {
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-dasharray: 1;
      opacity: 0.55;
      animation: ${drawMark} 650ms ease-out 150ms both;
    }
  }

  .result-mark path {
    stroke-dasharray: 1;
    animation: ${drawMark} 450ms ease-out 350ms both;

    &:nth-child(2) {
      animation-delay: 500ms;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &,
    .result-mark path,
    .result-ring circle {
      animation: none;
    }
  }
`;

export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  padding: 6px 11px;
  border-radius: 999px;
  background: var(--result-soft);
  color: var(--result-accent);
  font-size: 10px;
  line-height: 1.4;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

export const Heading = styled.h1`
  max-width: 100%;
  margin: 14px 0 0;
  color: var(--result-ink);
  font-size: clamp(25px, 6vw, 32px);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.14;
  overflow-wrap: anywhere;

  &:focus {
    /* Título recebe foco programático para anunciar a mudança, sem parecer um campo. */
    outline: none;
  }
`;

export const Description = styled.p`
  max-width: 360px;
  margin: 13px 0 0;
  color: var(--result-muted);
  font-size: 14px;
  line-height: 1.65;
  overflow-wrap: anywhere;
`;

export const Receipt = styled.dl`
  position: relative;
  display: grid;
  gap: 13px;
  margin: 26px 0 0;
  padding: 20px;
  border: 1px solid #e8e8df;
  border-radius: 14px;
  background: #f8f8f2;

  > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
  }

  dt {
    flex-shrink: 0;
    color: var(--result-muted);
    font-size: 12px;
  }

  dd {
    min-width: 0;
    margin: 0;
    color: var(--result-ink);
    font-size: 13px;
    font-weight: 650;
    text-align: right;
    overflow-wrap: anywhere;
  }

  .method {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;

    svg {
      flex-shrink: 0;
      color: #52675d;
    }
  }

  .amount {
    padding-top: 15px;
    border-top: 1px dashed #d7dcd1;

    dd {
      font-size: clamp(21px, 5vw, 27px);
      font-weight: 800;
      letter-spacing: -0.04em;
    }
  }

  @media (max-width: 360px) {
    padding: 16px 12px;

    .amount {
      flex-wrap: wrap;
    }
  }
`;

export const Actions = styled.div`
  display: grid;
  gap: 9px;
  margin-top: 24px;
`;

export const Action = styled.button<{ $primary?: boolean; $success?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  border: 1px solid ${({ $primary }) => ($primary ? 'transparent' : '#d9ded4')};
  border-radius: 12px;
  background: ${({ $primary, $success }) =>
    $primary ? ($success ? '#187347' : '#293b31') : '#fffefa'};
  color: ${({ $primary }) => ($primary ? '#ffffff' : '#3d4a40')};
  font: inherit;
  font-size: 14px;
  font-weight: 750;
  line-height: 1.4;
  cursor: pointer;
  overflow-wrap: anywhere;
  transition:
    background-color 160ms ease,
    border-color 160ms ease;

  > svg {
    flex-shrink: 0;
  }

  &:hover:not(:disabled) {
    background: ${({ $primary, $success }) =>
      $primary ? ($success ? '#105b37' : '#1b2c22') : '#f0f3eb'};
  }

  &:focus-visible {
    outline: 3px solid #43694f;
    outline-offset: 3px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const Footnote = styled.p`
  margin: 20px 0 0;
  color: var(--result-muted);
  font-size: 12px;
  line-height: 1.55;
  text-align: center;
`;

export const ReturnNotice = styled.div`
  display: grid;
  justify-items: center;
  gap: 10px;
  margin-top: 18px;
  color: var(--result-muted);
  font-size: 12px;
  line-height: 1.5;

  b {
    font-variant-numeric: tabular-nums;
  }
`;

export const ReturnProgress = styled.div`
  width: 100px;
  height: 3px;
  overflow: hidden;
  border-radius: 99px;
  background: var(--result-ring);

  > span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--result-accent);
    transform-origin: left center;
    animation: ${countDown} 5s linear both;
  }

  @media (prefers-reduced-motion: reduce) {
    > span {
      animation: none;
    }
  }
`;
