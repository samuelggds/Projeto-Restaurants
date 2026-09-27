import styled, { keyframes } from 'styled-components';

// Layout, catalog, product details and footer for the customer-facing Home page.

const productReveal = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;
const modalBackdropReveal = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;
const productModalReveal = keyframes`
  from { opacity: 0; transform: translateY(18px) scale(0.965); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;
const modalContentReveal = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

function homeFontStack(fontFamily?: string) {
  if (fontFamily === 'Manrope') return 'Manrope, ui-sans-serif, system-ui, sans-serif';
  if (fontFamily === 'DM Sans') return "'DM Sans', ui-sans-serif, system-ui, sans-serif";
  return 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif';
}

export const HomeExperience = styled.div<{
  $fontFamily?: string;
  $primary: string;
  $tableMenu?: boolean;
}>`
  --home-primary: ${({ $primary }) => $primary};
  --primary: ${({ $primary }) => $primary};
  --home-border: #eadfd3;
  --home-text: #191816;
  --home-muted: #6f6a63;
  min-height: 100vh;
  font-family: ${({ $fontFamily }) => homeFontStack($fontFamily)};
  ${({ $tableMenu }) =>
    $tableMenu &&
    `
      padding-bottom: 94px;

      @media (max-width: 700px) {
        padding-bottom: calc(92px + env(safe-area-inset-bottom, 0px));
      }
    `}
`;

export const HomeRoot = styled.div<{ $primary: string; $fontFamily?: string }>`
  --home-primary: ${({ $primary }) => $primary};
  --primary: ${({ $primary }) => $primary};
  --home-border: #ececec;
  --home-text: #1d1d1f;
  --home-muted: #747474;
  width: 100%;
  min-height: 100vh;
  background: #ffffff;
  color: var(--home-text);
  font-family: ${({ $fontFamily }) => homeFontStack($fontFamily)};
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  button,
  input {
    font: inherit;
  }
  button,
  a {
    -webkit-tap-highlight-color: transparent;
  }
  img {
    display: block;
    max-width: 100%;
  }
`;
export const Main = styled.main`
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
  padding: 18px clamp(18px, 3vw, 44px) 56px;
  @media (max-width: 800px) {
    padding: 12px 12px 82px;
  }
`;
export const HeroStage = styled.section`
  width: 100%;
  margin: 0 auto;
`;
export const InfoBar = styled.div`
  min-height: 48px;
  margin: 10px 0 14px;
  border: 1px solid #eeeeee;
  border-radius: 13px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  align-items: center;
  background: #fff;
  box-shadow: 0 5px 18px rgba(22, 22, 22, 0.035);
  span {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    border-right: 1px solid #eeeeee;
    font-size: 12px;
    font-weight: 750;
  }
  span:last-child {
    border: 0;
  }
  b {
    color: #4f8b40;
  }
  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 14px 8px;
    span {
      justify-content: flex-start;
      border: 0;
      font-size: 12px;
    }
  }
`;
export const SectionTitle = styled.h2`
  width: 100%;
  margin: 30px auto 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--home-text);
  font-family: inherit;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: -0.025em;

  @media (max-width: 760px) {
    margin: 24px 0 12px;
    font-size: 20px;
  }
`;
export const CategoryRow = styled.div`
  width: 100%;
  margin: 0 auto;
  display: flex;
  align-items: stretch;
  gap: 10px;
  overflow-x: auto;
  overflow-y: visible;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  padding: 2px 0 12px;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 760px) {
    width: calc(100% + 24px);
    margin-inline: -12px;
    padding: 2px 12px 12px;
  }
`;

export const CategoryButton = styled.button<{ $active: boolean }>`
  flex: 0 0 auto;
  min-width: 112px;
  min-height: 94px;
  padding: 10px 9px;
  display: grid;
  grid-template-columns: 1fr;
  justify-items: center;
  align-content: center;
  gap: 7px;
  border: 1px solid ({ $active }) =>
    $active ? 'color-mix(in srgb, var(--home-primary) 38%, #fff)' : '#eeeeee';
  border-radius: 16px;
  overflow: hidden;
  background: ({ $active }) =>
    $active ? 'color-mix(in srgb, var(--home-primary) 8%, #fff)' : '#fff';
  cursor: pointer;
  color: ({ $active }) => ($active ? 'var(--home-primary)' : 'var(--home-text)');
  scroll-snap-align: start;
  box-shadow: ({ $active }) =>
    $active
      ? '0 10px 24px color-mix(in srgb, var(--home-primary) 14%, transparent)'
      : '0 6px 20px rgba(20, 20, 20, 0.04)';
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;

  @media (hover: hover) and (pointer: fine) {
    &:hover {
      transform: translateY(-3px);
      border-color: color-mix(in srgb, var(--home-primary) 48%, #fff);
      box-shadow: 0 12px 28px rgba(20, 20, 20, 0.09);
    }
  }

  img {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    object-fit: cover;
    background: #fafafa;
  }

  b {
    padding: 0;
    font-size: 12px;
    line-height: 1.2;
    text-align: center;
    overflow-wrap: anywhere;
  }

  @media (max-width: 760px) {
    min-width: 88px;
    min-height: 82px;
    padding: 8px 7px;
    border-radius: 14px;

    img {
      width: 44px;
      height: 44px;
    }

    b {
      font-size: 11px;
    }
  }
`;
export const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  width: 100%;
  margin-inline: auto;

  @media (max-width: 1180px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 11px;
  }
`;
export const ProductCategoryGroups = styled.div`
  display: flex;
  flex-direction: column;
  gap: 42px;
  width: 100%;
  margin-inline: auto;
  @media (max-width: 760px) {
    gap: 34px;
  }
`;
export const ProductCategoryGroup = styled.section`
  padding: 0;
  h3 {
    margin: 0 0 14px;
    color: var(--home-text);
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 21px;
    line-height: 1.2;
  }
  @media (max-width: 760px) {
    padding-inline: 6px;
    h3 {
      margin-bottom: 13px;
      font-size: 17px;
    }
  }
`;
export const ProductCard = styled.article`
  position: relative;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: 1px solid #ededed;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 7px 22px rgba(18, 18, 18, 0.045);
  cursor: pointer;
  content-visibility: auto;
  contain: layout paint style;
  contain-intrinsic-size: auto 320px;
  animation: ${productReveal} 260ms ease both;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;

  .product-main-action {
    position: absolute;
    inset: 0;
    z-index: 1;
    width: 100%;
    height: 100%;
    border: 0;
    border-radius: inherit;
    background: transparent;
    cursor: pointer;
  }

  .product-main-action:focus-visible {
    outline: 3px solid var(--home-primary);
    outline-offset: -4px;
  }

  .product-main-action:disabled {
    cursor: not-allowed;
  }

  footer button {
    position: relative;
    z-index: 2;
  }

  &:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--home-primary) 32%, #ededed);
    box-shadow: 0 14px 32px rgba(18, 18, 18, 0.09);
  }

  > div:last-child {
    min-width: 0;
    min-height: 138px;
    padding: 13px 14px 14px;
    display: flex;
    flex-direction: column;
  }

  h3 {
    margin: 0;
    color: var(--home-text);
    font-size: 15px;
    font-weight: 850;
    line-height: 1.25;
  }

  p {
    min-height: 0;
    margin: 6px 0 12px;
    color: var(--home-muted);
    font-size: 11px;
    line-height: 1.42;
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  footer {
    margin-top: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
  }

  strong {
    color: var(--home-text);
    font-size: 15px;
    font-weight: 900;
  }

  footer button {
    margin-left: auto;
    width: 38px;
    height: 38px;
    border: 0;
    border-radius: 12px;
    background: var(--home-primary);
    color: #fff;
    display: grid;
    place-items: center;
    cursor: pointer;
    box-shadow: 0 6px 14px color-mix(in srgb, var(--home-primary) 20%, transparent);
  }

  footer button:disabled {
    width: auto;
    padding: 0 12px;
    background: #efefef;
    color: #777;
    cursor: not-allowed;
    box-shadow: none;
    font-size: 11px;
    font-weight: 750;
  }

  &[data-featured='true'] {
    min-height: 0;
  }

  &[data-featured='true'] > div:last-child {
    min-height: 138px;
    padding: 13px 14px 14px;
    justify-content: flex-start;
  }

  &[data-featured='true'] p {
    margin: 5px 0 11px;
    -webkit-line-clamp: 2;
  }

  &:nth-child(2) {
    animation-delay: 35ms;
  }
  &:nth-child(3) {
    animation-delay: 70ms;
  }
  &:nth-child(4) {
    animation-delay: 105ms;
  }

  @media (max-width: 620px) {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    min-height: 112px;
    contain-intrinsic-size: auto 112px;
    border-radius: 14px;

    > div:last-child,
    &[data-featured='true'] > div:last-child {
      min-height: 112px;
      padding: 11px 12px;
    }

    h3 {
      font-size: 14px;
    }

    p,
    &[data-featured='true'] p {
      margin: 4px 0 8px;
      font-size: 10.5px;
      -webkit-line-clamp: 2;
    }

    footer {
      font-size: 11px;
    }

    strong {
      font-size: 14px;
    }

    footer button {
      width: 34px;
      height: 34px;
      border-radius: 10px;
    }
  }

  @media (max-width: 360px) {
    grid-template-columns: 96px minmax(0, 1fr);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
`;
export const ProductModalOverlay = styled.button<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 300;
  border: 0;
  background: rgba(18, 14, 11, 0.68);
  backdrop-filter: blur(7px);
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  transition:
    opacity 200ms ease,
    visibility 200ms ease;
  animation: ${modalBackdropReveal} 280ms ease both;
  cursor: pointer;
`;
export const ProductModal = styled.div<{ $open: boolean; $primary: string }>`
  --home-primary: ${({ $primary }) => $primary || '#d64d08'};
  position: fixed;
  inset: 0;
  margin: auto;
  z-index: 301;
  width: min(980px, calc(100vw - 40px));
  height: min(680px, calc(100dvh - 48px));
  max-height: calc(100dvh - 48px);
  overflow: hidden auto;
  border-radius: 22px;
  background: #fffdf9;
  box-shadow: 0 30px 90px rgba(20, 12, 7, 0.35);
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  transform: scale(${({ $open }) => ($open ? 1 : 0.96)});
  transition:
    opacity 200ms ease,
    transform 220ms ease,
    visibility 200ms ease;
  animation: ${productModalReveal} 340ms cubic-bezier(0.22, 1, 0.36, 1) both;
  .modal-image {
    width: 48%;
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    object-fit: cover;
    object-position: center;
    aspect-ratio: 16 / 9;
    display: block;
    animation: ${modalContentReveal} 380ms 50ms ease both;
  }
  .modal-close {
    position: absolute;
    right: 14px;
    top: 14px;
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.94);
    color: #191816;
    box-shadow: 0 5px 18px rgba(0, 0, 0, 0.16);
    cursor: pointer;
    transition:
      transform 180ms ease,
      background 180ms ease,
      box-shadow 180ms ease;
    &:hover {
      transform: rotate(5deg) scale(1.06);
      background: #fff;
    }
  }
  .modal-content {
    min-height: 100%;
    margin-left: 48%;
    padding: 68px 42px 42px;
    background: linear-gradient(145deg, #fff9f4 0%, #f8efe6 100%);
    border-top: 1px solid color-mix(in srgb, var(--home-primary, #d64d08) 18%, #eadfd3);
    animation: ${modalContentReveal} 360ms 80ms ease both;
  }
  h2 {
    margin: 0;
    color: #201a16;
    font-size: 25px;
    letter-spacing: -0.025em;
  }
  .modal-content button:last-child {
    width: 100%;
    min-height: 48px;
    border: 0;
    border-radius: 10px;
    background: var(--home-primary);
    color: #fff;
    font-weight: 800;
    cursor: pointer;
  }
  @media (max-width: 720px) {
    width: 100vw;
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
    .modal-image {
      position: static;
      width: 100%;
      height: 230px;
    }
    .modal-content {
      margin-left: 0;
      min-height: auto;
      padding: 24px 20px 34px;
    }
  }
  p {
    margin: 10px 0 20px;
    color: #665b52;
    font-size: 14px;
    line-height: 1.55;
  }
  strong {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    padding: 8px 13px;
    border: 1px solid color-mix(in srgb, var(--home-primary, #d64d08) 24%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--home-primary, #d64d08) 10%, #fff);
    color: var(--home-primary, #d64d08);
    font-size: 20px;
    line-height: 1;
    box-shadow: 0 5px 14px color-mix(in srgb, var(--home-primary, #d64d08) 10%, transparent);
  }
  @media (max-width: 760px) {
    width: min(390px, calc(100vw - 20px));
    max-height: calc(100dvh - 20px);
    border-radius: 18px;
    .modal-image {
      height: 220px;
    }
    .modal-content {
      padding: 17px 18px 20px;
    }
    h2 {
      font-size: 21px;
    }
    p {
      margin-bottom: 16px;
      font-size: 13px;
    }
    strong {
      padding: 7px 11px;
      font-size: 18px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    .modal-image,
    .modal-content {
      animation: none;
    }
  }
`;
export const ImageWrap = styled.div`
  position: relative;
  width: 100%;
  height: 164px;
  min-height: 164px;
  overflow: hidden;
  background: #f6f3ee;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
    transition: transform 220ms ease;
  }

  button {
    position: absolute;
    z-index: 2;
    right: 9px;
    top: 9px;
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 50%;
    background: rgba(20, 20, 20, 0.38);
    color: #fff;
    display: grid;
    place-items: center;
    cursor: pointer;
    backdrop-filter: blur(6px);
    transition:
      color 180ms ease,
      background 180ms ease,
      transform 180ms ease;
  }

  button:hover {
    transform: scale(1.06);
  }

  button.favorite {
    color: var(--home-primary);
    background: rgba(255, 255, 255, 0.96);
  }

  @media (max-width: 620px) {
    width: 112px;
    height: 112px;
    min-height: 112px;

    button {
      width: 30px;
      height: 30px;
      right: 7px;
      top: 7px;
    }
  }

  @media (max-width: 360px) {
    width: 96px;
  }
`;
export const About = styled.section`
  width: 100%;
  margin: 0;
  padding: 24px 4px 28px;
  border-bottom: 1px solid var(--home-border);
  display: grid;
  grid-template-columns: minmax(150px, 0.28fr) minmax(0, 1fr);
  align-items: start;
  gap: clamp(24px, 5vw, 72px);
  text-align: left;
  small {
    display: block;
    padding-top: 7px;
    color: var(--home-primary);
    font-weight: 900;
    font-size: 11px;
    text-transform: uppercase;
  }
  p {
    max-width: 820px;
    margin: 0;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 24px;
    font-weight: 600;
    line-height: 1.38;
    white-space: pre-line;
    text-wrap: balance;
    color: var(--home-text);
  }
  @media (max-width: 700px) {
    padding: 18px 2px 22px;
    grid-template-columns: 1fr;
    gap: 8px;
    small {
      padding-top: 0;
    }
    p {
      font-size: 19px;
      line-height: 1.42;
    }
  }
`;
export const FloatingActions = styled.div<{
  $aboveNudge: boolean;
  $primary: string;
  $hasWhatsapp?: boolean;
}>`
  position: fixed;
  z-index: 59;
  right: 24px;
  bottom: ${({ $aboveNudge, $hasWhatsapp }) => ($aboveNudge ? '152px' : $hasWhatsapp ? '94px' : '24px')};
  width: min-content;
  max-width: calc(100vw - 32px);
  max-height: min(70dvh, 580px);
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  pointer-events: none;
  --home-primary: ${({ $primary }) => $primary};
  --primary: ${({ $primary }) => $primary};

  > * {
    pointer-events: auto;
  }

  [data-floating-drag-handle='true'] {
    cursor: grab;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  &[data-dragging='true'],
  &[data-dragging='true'] [data-floating-drag-handle='true'] {
    cursor: grabbing;
  }

  &[data-dragging='true'] {
    transition: none;
    will-change: transform;
    backface-visibility: hidden;
  }

  @media (max-width: 700px) {
    left: 12px;
    right: 12px;
    bottom: calc(
      ${({ $aboveNudge, $hasWhatsapp }) => ($aboveNudge ? '144px' : $hasWhatsapp ? '82px' : '12px')} +
        env(safe-area-inset-bottom, 0px)
    );
    width: auto;
    max-width: none;
  }
`;

export const CategoryPlaceholder = styled.span`
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  color: var(--home-primary);
  background: color-mix(in srgb, var(--home-primary) 9%, #fff);
  svg {
    padding: 7px;
    width: 34px;
    height: 34px;
  }
  @media (max-width: 760px) {
    width: 44px;
    height: 44px;
  }
`;

export const Footer = styled.footer`
  position: relative;
  z-index: 25;
  margin-top: 28px;
  border-top: 4px solid var(--home-primary);
  background: #17211d;
  color: #fff;
`;
export const FooterContent = styled.div`
  width: min(1240px, calc(100% - 48px));
  margin: 0 auto;
  padding: 44px 0 36px;
  display: grid;
  grid-template-columns: minmax(260px, 1fr) minmax(160px, 0.55fr) minmax(360px, 1.35fr);
  align-items: start;
  gap: 48px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 34px;

    > :last-child {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 680px) {
    width: min(100% - 24px, 560px);
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 30px 0 26px;

    > :last-child {
      grid-column: 1;
    }
  }
`;
export const FooterBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  min-width: 0;
  padding: 4px 0;
  img,
  > span {
    width: 52px;
    height: 52px;
    border-radius: 7px;
  }
  img {
    object-fit: cover;
  }
  > span {
    display: grid;
    place-items: center;
    background: var(--home-primary);
    font-size: 22px;
    font-weight: 800;
  }
  div {
    display: grid;
    gap: 6px;
    min-width: 0;
  }
  strong {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 22px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  small {
    color: #9faea6;
    line-height: 1.45;
  }
`;
export const FooterColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
  padding: 4px 0;
  > strong {
    color: color-mix(in srgb, var(--home-primary) 65%, white);
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
  }
  a,
  span {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: #aebbb4;
    font-size: 13px;
    line-height: 1.45;
    text-decoration: none;
  }
  a {
    cursor: pointer;
    transition:
      color 180ms ease,
      transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
    will-change: transform;
  }
  a:hover {
    color: #fff;
    transform: translateY(-2px);
  }
  a:active {
    transform: translateY(0) scale(0.98);
  }
  svg {
    flex: 0 0 auto;
    margin-top: 2px;
    color: var(--home-primary);
    transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  a:hover svg {
    transform: translateX(2px) scale(1.08);
  }
`;

export const FooterNavigation = styled.nav`
  width: 100%;
  display: grid;
  grid-template-columns: 1fr;
  gap: 2px;

  > a {
    width: 100%;
    min-height: 34px;
    padding: 6px 0;
    align-items: center;
    position: relative;
  }

  > a::after {
    content: '';
    position: absolute;
    right: 0;
    bottom: 2px;
    left: 0;
    height: 1px;
    background: var(--home-primary);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  > a:hover::after,
  > a:focus-visible::after {
    transform: scaleX(1);
  }

  @media (max-width: 680px) {
    grid-template-columns: repeat(auto-fit, minmax(92px, 1fr));

    > a {
      justify-content: center;
      text-align: center;
    }
  }
`;

export const FooterContactGrid = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
`;

export const FooterContactItem = styled.div<{ $wide?: boolean }>`
  min-width: 0;
  grid-column: ${({ $wide }) => ($wide ? '1 / -1' : 'auto')};

  > a,
  > span {
    width: 100%;
    max-width: 100%;
    margin-top: 0;
    min-height: 34px;
    padding: 6px 0;
    align-items: center;
    overflow-wrap: anywhere;
  }

  > span {
    color: #c9c3bd;
  }

  > a:focus-visible {
    color: #fff;
    outline: 2px solid color-mix(in srgb, var(--home-primary) 70%, white);
    outline-offset: 4px;
  }
`;
export const FooterBottom = styled.div`
  border-top: 1px solid #ffffff14;
  min-height: 58px;
  padding: 16px max(24px, calc((100vw - 1240px) / 2));
  color: #8f9d96;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 14px;
  text-align: center;

  strong {
    color: color-mix(in srgb, var(--home-primary) 78%, white);
    font-weight: 700;
    letter-spacing: 0;
  }

  @media (max-width: 680px) {
    justify-content: center;
  }
`;