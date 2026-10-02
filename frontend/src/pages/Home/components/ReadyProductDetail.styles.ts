import styled from 'styled-components';

export const Screen = styled.div`
  --accent: #ff4b4b;
  --ink: #26211e;
  --muted: #7d756f;
  --line: #eadfd6;
  position: fixed;
  inset: 0;
  z-index: 1500;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: #fff9f3;
  color: var(--ink);
  animation: ready-detail-fade 260ms ease both;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  button,
  textarea {
    font: inherit;
  }

  @keyframes ready-detail-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;

    *,
    *::before,
    *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 0.001ms !important;
    }
  }
`;

export const DesktopHeader = styled.header`
  position: sticky;
  top: 0;
  z-index: 8;
  min-height: 66px;
  padding: 10px clamp(24px, 4vw, 70px);
  border-bottom: 1px solid #eee3da;
  background: rgba(255, 249, 243, .94);
  backdrop-filter: blur(14px);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 20px;
  animation: ready-header-in 420ms cubic-bezier(.22, 1, .36, 1) both;

  @keyframes ready-header-in {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .brand {
    min-width: 0;
    display: grid;
    justify-items: center;
    gap: 2px;
    text-align: center;
  }

  .brand strong {
    max-width: 360px;
    overflow: hidden;
    font-size: 13px;
    line-height: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .brand small {
    max-width: 430px;
    overflow: hidden;
    color: var(--muted);
    font-size: 9px;
    line-height: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .actions {
    justify-self: end;
    display: inline-flex;
    align-items: center;
    gap: 18px;
  }

  button {
    min-height: 38px;
    border: 0;
    background: transparent;
    color: var(--ink);
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    font-weight: 750;
    cursor: pointer;
    transition: transform 180ms ease, color 180ms ease, background-color 180ms ease;
  }

  button:hover:not(:disabled) {
    color: var(--accent);
    transform: translateY(-1px);
  }

  button:active:not(:disabled) {
    transform: translateY(0) scale(.97);
  }

  button:focus-visible {
    outline: 3px solid rgba(255, 75, 75, .2);
    outline-offset: 3px;
    border-radius: 8px;
  }

  button:disabled {
    opacity: .45;
    cursor: not-allowed;
  }

  .cart {
    position: relative;
  }

  .cart i {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--accent);
    color: #fff;
    display: grid;
    place-items: center;
    font-size: 9px;
    font-style: normal;
  }

  svg {
    width: 15px;
    height: 15px;
  }

  @media (max-width: 759px) {
    display: none;
  }
`;

export const Layout = styled.main`
  width: min(1320px, calc(100% - 48px));
  min-height: calc(100dvh - 66px);
  margin: 0 auto;
  padding: 34px 0;
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(430px, .96fr);
  gap: 32px;
  align-items: start;

  @media (max-width: 1000px) and (min-width: 760px) {
    grid-template-columns: minmax(0, 1fr) minmax(360px, .9fr);
    gap: 22px;
  }

  @media (max-width: 759px) {
    width: 100%;
    min-height: 100dvh;
    padding: 0;
    grid-template-columns: 1fr;
    gap: 0;
    background: #fff;
  }
`;

export const Hero = styled.section`
  position: sticky;
  top: 100px;
  min-height: min(72vh, 760px);
  overflow: hidden;
  border-radius: 24px;
  background: #eee7e1;
  box-shadow: 0 24px 48px rgba(72, 49, 34, .12);
  animation: ready-hero-in 560ms cubic-bezier(.22, 1, .36, 1) 70ms both;

  @keyframes ready-hero-in {
    from { opacity: 0; transform: translate3d(-18px, 18px, 0) scale(.985); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }

  > img,
  > .fallback {
    width: 100%;
    height: min(72vh, 760px);
  }

  > img {
    display: block;
    object-fit: cover;
    animation: ready-image-in 900ms cubic-bezier(.22, 1, .36, 1) 120ms both;
  }

  @keyframes ready-image-in {
    from { transform: scale(1.045); filter: saturate(.9); }
    to { transform: scale(1); filter: saturate(1); }
  }

  .fallback {
    display: grid;
    place-items: center;
    background: linear-gradient(145deg, #f2ebe5, #e7ddd4);
    color: #b6a99f;
  }

  .fallback svg {
    width: 58px;
    height: 58px;
  }

  &::after {
    content: '';
    position: absolute;
    inset: auto 0 0;
    height: 48%;
    background: linear-gradient(to bottom, transparent, rgba(17, 12, 9, .78));
    pointer-events: none;
  }

  .hero-copy {
    position: absolute;
    z-index: 2;
    left: 30px;
    right: 30px;
    bottom: 28px;
    color: #fff;
    display: grid;
    gap: 7px;
    animation: ready-copy-in 520ms cubic-bezier(.22, 1, .36, 1) 250ms both;
  }

  @keyframes ready-copy-in {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .hero-copy small {
    font-size: 9px;
    line-height: 12px;
    font-weight: 850;
    letter-spacing: .04em;
  }

  .hero-copy strong {
    max-width: 560px;
    font-size: clamp(24px, 3vw, 36px);
    line-height: 1.04;
    font-weight: 850;
  }

  .hero-copy p {
    max-width: 620px;
    margin: 0;
    color: rgba(255, 255, 255, .86);
    font-size: 11px;
    line-height: 1.45;
  }

  .mobile-brand {
    display: none;
  }

  @media (max-width: 759px) {
    position: relative;
    top: auto;
    min-height: 300px;
    border-radius: 0;
    box-shadow: none;

    > img,
    > .fallback {
      height: 300px;
    }

    &::after {
      height: 36%;
    }

    .hero-copy {
      display: none;
    }

    .mobile-brand {
      position: absolute;
      z-index: 3;
      left: 16px;
      right: 16px;
      bottom: 16px;
      color: #fff;
      display: grid;
      gap: 2px;
      text-shadow: 0 2px 8px rgba(0, 0, 0, .48);
    }

    .mobile-brand strong {
      font-size: 12px;
      line-height: 15px;
      font-weight: 800;
    }

    .mobile-brand small {
      color: rgba(255, 255, 255, .82);
      font-size: 9px;
      line-height: 12px;
    }
  }
`;

export const MobileActions = styled.div`
  display: none;

  @media (max-width: 759px) {
    position: absolute;
    z-index: 5;
    top: max(14px, env(safe-area-inset-top));
    left: 14px;
    right: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;

    button {
      min-height: 36px;
      border: 0;
      background: rgba(255, 255, 255, .95);
      color: #2b2521;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 4px 14px rgba(20, 14, 10, .12);
      cursor: pointer;
    }

    .back {
      padding: 0 12px 0 9px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
    }

    .cart {
      position: relative;
      width: 38px;
      height: 38px;
      border-radius: 999px;
      color: var(--accent);
    }

    .cart i {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 999px;
      background: var(--accent);
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 8px;
      font-style: normal;
    }

    button:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

export const ProductPanel = styled.section`
  position: relative;
  padding: 28px;
  border: 1px solid #eadfd6;
  border-radius: 24px;
  background: #fff;
  box-shadow: 0 18px 42px rgba(72, 49, 34, .08);
  display: grid;
  gap: 18px;
  animation: ready-panel-in 560ms cubic-bezier(.22, 1, .36, 1) 120ms both;

  @keyframes ready-panel-in {
    from { opacity: 0; transform: translate3d(18px, 18px, 0); }
    to { opacity: 1; transform: translate3d(0, 0, 0); }
  }

  > * {
    animation: ready-item-in 420ms cubic-bezier(.22, 1, .36, 1) both;
  }

  > :nth-child(1) { animation-delay: 210ms; }
  > :nth-child(2) { animation-delay: 250ms; }
  > :nth-child(3) { animation-delay: 290ms; }
  > :nth-child(4) { animation-delay: 330ms; }
  > :nth-child(5) { animation-delay: 370ms; }
  > :nth-child(6) { animation-delay: 410ms; }
  > :nth-child(7) { animation-delay: 450ms; }

  @keyframes ready-item-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .eyebrow-row {
    min-height: 22px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
  }

  .eyebrow-row .ready {
    min-height: 22px;
    padding: 0 10px;
    border-radius: 5px;
    background: var(--accent);
    color: #fff;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 8px;
    line-height: 10px;
    font-weight: 850;
    letter-spacing: .03em;
  }

  .ready i {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #fff;
  }

  .eyebrow-row > small {
    color: #746d67;
    font-size: 8px;
    line-height: 11px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .title-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 18px;
  }

  h1 {
    margin: 0;
    color: #28221f;
    font-size: clamp(30px, 3.1vw, 46px);
    line-height: 1.02;
    letter-spacing: -1.2px;
  }

  .description {
    margin: -5px 0 0;
    color: #776f69;
    font-size: 12px;
    line-height: 1.55;
  }

  @media (max-width: 759px) {
    min-height: calc(100dvh - 300px);
    padding: 18px 16px calc(94px + env(safe-area-inset-bottom));
    border: 0;
    border-radius: 0;
    box-shadow: none;
    gap: 15px;

    .eyebrow-row {
      align-items: center;
    }

    .eyebrow-row .ready {
      font-size: 8px;
    }

    .title-row {
      align-items: center;
      gap: 12px;
    }

    h1 {
      font-size: 27px;
      line-height: 1.05;
      letter-spacing: -.7px;
    }

    .description {
      margin-top: -4px;
      font-size: 12px;
      line-height: 1.5;
    }
  }
`;

export const Price = styled.div`
  display: grid;
  justify-items: end;
  gap: 2px;
  white-space: nowrap;

  del {
    color: #aaa09a;
    font-size: 10px;
  }

  strong {
    color: var(--accent);
    font-size: 20px;
    line-height: 24px;
    font-weight: 800;
  }

  @media (max-width: 759px) {
    strong {
      font-size: 18px;
      line-height: 22px;
    }
  }
`;

export const Facts = styled.div<{ $single: boolean }>`
  display: grid;
  grid-template-columns: ({ $single }) => ($single ? '1fr' : '1.65fr .75fr');
  overflow: hidden;
  border: 1px solid #eadfd6;
  border-radius: 12px;
  background: #fff9f5;

  article {
    min-height: 66px;
    padding: 13px 16px;
    display: grid;
    grid-template-columns: 22px minmax(0, 1fr);
    gap: 11px;
    align-items: center;
  }

  article + article {
    border-left: 1px solid #eadfd6;
  }

  svg {
    width: 16px;
    height: 16px;
    color: var(--accent);
  }

  span {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  small {
    color: #8d837c;
    font-size: 8px;
    line-height: 10px;
    font-weight: 800;
  }

  strong {
    overflow-wrap: anywhere;
    color: #302925;
    font-size: 9px;
    line-height: 1.35;
    font-weight: 750;
  }

  @media (max-width: 759px) {
    grid-template-columns: 1fr;
    border-radius: 12px;

    .composition {
      display: none;
    }

    article {
      min-height: 58px;
      padding: 12px 14px;
      grid-template-columns: 20px minmax(0, 1fr);
    }

    article + article {
      border-left: 0;
    }

    strong {
      font-size: 10px;
    }
  }
`;

export const Observation = styled.label`
  display: grid;
  gap: 8px;

  .label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  b {
    font-size: 11px;
    line-height: 14px;
  }

  small {
    color: #8d837c;
    font-size: 8px;
    line-height: 10px;
    font-weight: 750;
  }

  textarea {
    width: 100%;
    min-height: 52px;
    resize: vertical;
    padding: 14px 16px;
    border: 1px solid #eadfd6;
    border-radius: 12px;
    outline: 0;
    background: #fff9f5;
    color: #322b27;
    font-size: 10px;
    line-height: 1.45;
    transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
  }

  textarea::placeholder {
    color: #a29a94;
  }

  textarea:focus {
    border-color: var(--accent);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(255, 75, 75, .1);
  }

  @media (max-width: 759px) {
    textarea {
      min-height: 50px;
      font-size: 10px;
    }
  }
`;

export const BottomAction = styled.div`
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 10px;
  align-items: center;

  @media (max-width: 759px) {
    position: fixed;
    z-index: 10;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
    border-top: 1px solid #eee3da;
    background: rgba(255, 255, 255, .96);
    backdrop-filter: blur(14px);
    grid-template-columns: 82px minmax(0, 1fr);
    box-shadow: 0 -10px 28px rgba(55, 39, 29, .07);
    animation: ready-bottom-in 440ms cubic-bezier(.22, 1, .36, 1) 300ms both;
  }

  @keyframes ready-bottom-in {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

export const Quantity = styled.div`
  && [data-quantity-stepper] {
    width: 92px;
    height: 46px;
    padding: 0 11px;
    border: 1px solid #eadfd6;
    border-radius: 10px;
    background: #fff9f5;
    color: #322b27;
  }

  && [data-quantity-stepper] button {
    color: var(--accent);
  }

  && [data-quantity-stepper] > strong {
    color: #322b27;
    font-size: 12px;
  }

  @media (max-width: 759px) {
    && [data-quantity-stepper] {
      width: 82px;
      height: 44px;
      padding-inline: 8px;
    }
  }
`;

export const AddButton = styled.button`
  min-height: 46px;
  padding: 0 18px;
  border: 0;
  border-radius: 8px;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  font-size: 11px;
  line-height: 14px;
  font-weight: 800;
  box-shadow: 0 8px 18px rgba(255, 75, 75, .17);
  transition: transform 180ms cubic-bezier(.22, 1, .36, 1), box-shadow 180ms ease, filter 180ms ease;

  strong {
    color: inherit;
    font: inherit;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 11px 24px rgba(255, 75, 75, .23);
    filter: brightness(.98);
  }

  &:active {
    transform: translateY(0) scale(.985);
  }

  &:focus-visible {
    outline: 3px solid rgba(255, 75, 75, .22);
    outline-offset: 3px;
  }

  @media (max-width: 759px) {
    min-height: 44px;
    padding: 0 12px;
    font-size: 11px;
  }
`;

export const Assurance = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  color: #8a817b;
  font-size: 8px;
  line-height: 11px;
  text-align: center;

  svg {
    width: 12px;
    height: 12px;
    color: #4b9a67;
  }

  @media (max-width: 759px) {
    display: none;
  }
`;
