import styled from 'styled-components';

export const Dock = styled.div<{ $primary: string; $hasWhatsapp: boolean; $aboveNudge: boolean }>`
  --home-primary: ${({ $primary }) => $primary};
  --primary: ${({ $primary }) => $primary};
  --hub-ink: #23332b;
  position: fixed;
  right: 24px;
  --hub-bottom: calc(
    ${({ $hasWhatsapp, $aboveNudge }) => ($aboveNudge ? 152 : $hasWhatsapp ? 94 : 24)}px +
      env(safe-area-inset-bottom, 0px)
  );
  bottom: var(--hub-bottom);
  z-index: 59;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  max-width: calc(100vw - 28px);
  pointer-events: none;
  > * {
    pointer-events: auto;
  }
  &,
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  button {
    font-family: inherit;
  }
  button:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-primary) 55%, #354b3d);
    outline-offset: 3px;
  }
  @media (max-width: 700px) {
    right: 14px;
    --hub-bottom: calc(
      ${({ $hasWhatsapp, $aboveNudge }) => ($aboveNudge ? 144 : $hasWhatsapp ? 82 : 16)}px +
        env(safe-area-inset-bottom, 0px)
    );
  }
`;

export const Launcher = styled.button`
  min-height: 52px;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  gap: 11px;
  padding: 6px 17px 6px 7px;
  border: 1px solid #ffffff32;
  border-radius: 99px;
  color: #fff;
  background: #26392f;
  box-shadow: 0 6px 22px #182b2630;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
  .launcher-icon {
    position: relative;
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    background: #ffffff15;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .launcher-icon i {
    position: absolute;
    width: 8px;
    height: 8px;
    right: 1px;
    top: 1px;
    background: #d5e6ac;
    border: 2px solid #26392f;
    border-radius: 50%;
  }
  .chevron {
    opacity: 0.7;
    transition: transform 180ms ease;
  }
  .chevron.open {
    transform: rotate(180deg);
  }
  &:hover {
    background: #314b3d;
  }
  @media (prefers-reduced-motion: reduce) {
    .chevron {
      transition: none;
    }
  }
`;

export const Panel = styled.section`
  width: min(350px, calc(100vw - 28px));
  max-height: calc(100dvh - var(--hub-bottom) - 80px - env(safe-area-inset-top, 0px));
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid #e0e5df;
  border-radius: 22px;
  background: #fffefa;
  color: var(--hub-ink);
  box-shadow:
    0 18px 55px #192a2526,
    0 3px 10px #192a2508;
  scrollbar-width: thin;
  header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 20px 18px 17px;
    border-bottom: 1px solid #e8ece5;
  }
  header > div {
    flex: 1;
    min-width: 0;
  }
  header span {
    font-size: 9px;
    color: #6a796a;
    letter-spacing: 0.1em;
    font-weight: 700;
  }
  h2 {
    margin: 7px 0 5px;
    font-size: 18px;
    line-height: 1.25;
    letter-spacing: -0.025em;
  }
  header p {
    margin: 0;
    color: #717970;
    font-size: 12px;
    line-height: 1.5;
  }
  header > button {
    display: grid;
    place-items: center;
    min-width: 44px;
    height: 44px;
    margin: -6px -7px 0 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: #687368;
    cursor: pointer;
  }
  header > button:hover {
    background: #edf1e9;
  }
  .hub-content {
    display: grid;
    gap: 12px;
    padding: 16px;
  }
  footer {
    padding: 0 18px 17px;
    text-align: center;
    color: #737d72;
    font-size: 10px;
    line-height: 1.5;
  }
  [data-inline='true'] {
    border-radius: 14px;
    box-shadow: none;
    min-height: 66px;
    background: #fafbf7;
    color: var(--hub-ink);
    border-color: #e2e7df;
  }
  [data-inline='true'] b {
    font-size: 13px;
    white-space: normal;
  }
  [data-inline='true'] small {
    font-size: 11px;
    white-space: normal;
  }
  @media (max-width: 350px) {
    header {
      padding: 17px 14px 14px;
    }
    .hub-content {
      padding: 12px;
    }
    h2 {
      font-size: 17px;
    }
  }
  @media (max-height: 560px) {
    header p,
    footer {
      display: none;
    }
  }
`;
