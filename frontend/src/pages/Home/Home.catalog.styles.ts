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
      @media (max-width: 700px) {
        padding-bottom: 58px;
      }
    `}
`;

export const HomeRoot = styled.div<{ $primary: string; $fontFamily?: string }>`
  --home-primary: ${({ $primary }) => $primary};
  --primary: ${({ $primary }) => $primary};
  --home-border: #eadfd3;
  --home-text: #191816;
  --home-muted: #6f6a63;
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(rgba(255, 255, 255, 0.58), rgba(255, 255, 255, 0.58)), #f7f4ef;
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
  padding: 18px 48px 64px;
  @media (max-width: 800px) {
    padding: 10px 12px 82px;
  }
`;
export const InfoBar = styled.div`
  min-height: 62px;
  margin: 14px 0 10px;
  border: 1px solid var(--home-border);
  border-radius: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  align-items: center;
  background: rgba(255, 255, 255, 0.88);
  span {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    border-right: 1px solid var(--home-border);
    font-size: 14px;
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
  font-size: clamp(22px, 2vw, 26px);
  margin: 42px 0 18px;
  letter-spacing: -0.025em;
  display: flex;
  align-items: center;
  gap: 11px;
  &::before {
    content: '';
    width: 5px;
    height: 28px;
    flex: 0 0 auto;
    border-radius: 999px;
    background: var(--home-primary);
    box-shadow: 0 4px 12px color-mix(in srgb, var(--home-primary) 28%, transparent);
  }
  @media (max-width: 760px) {
    margin: 32px 0 15px;
    font-size: 21px;
    &::before {
      height: 24px;
      width: 4px;
    }
  }
`;
export const CategoryRow = styled.div`
  display: flex;
  align-items: stretch;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  padding: 18px;
  border: 1px solid #eee5dc;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 10px 28px rgba(70, 45, 20, 0.045);
  scroll-behavior: smooth;
  &::-webkit-scrollbar {
    display: none;
  }
  @media (max-width: 760px) {
    width: calc(100% + 24px);
    margin-inline: -12px;
    padding: 14px 12px;
    border-inline: 0;
    border-radius: 0;
  }
`;
export const CategoryButton = styled.button<{ $active: boolean }>`
  flex: 1 0 145px;
  min-width: 0;
  border: 1px solid ${({ $active }) => ($active ? 'var(--home-primary)' : 'var(--home-border)')};
  border-radius: 16px;
  overflow: hidden;
  background: ${({ $active }) => ($active ? '#fffaf6' : '#fff')};
  cursor: pointer;
  color: ${({ $active }) => ($active ? 'var(--home-primary)' : 'var(--home-text)')};
  scroll-snap-align: start;
  box-shadow: ${({ $active }) =>
    $active
      ? '0 0 0 1px var(--home-primary), 0 10px 24px rgba(70, 45, 20, 0.09)'
      : '0 6px 18px rgba(70, 45, 20, 0.045)'};
  transform: ${({ $active }) => ($active ? 'translateY(-2px)' : 'none')};
  transition:
    color 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
  &:hover {
    transform: translateY(-2px);
    border-color: var(--home-primary);
    box-shadow: 0 10px 26px rgba(70, 45, 20, 0.1);
  }
  img {
    width: 100%;
    height: 95px;
    object-fit: cover;
  }
  b {
    display: block;
    padding: 11px 9px 12px;
    font-size: 14px;
  }
  @media (max-width: 760px) {
    flex-basis: 132px;
    img {
      height: 82px;
    }
  }
`;
export const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  width: min(980px, 100%);
  margin-inline: auto;
  @media (max-width: 760px) {
    width: min(380px, calc(100% - 12px));
    margin-inline: auto;
    gap: 14px;
    overflow: visible;
  }
`;
export const ProductCategoryGroups = styled.div`
  display: flex;
  flex-direction: column;
  gap: 42px;
  width: min(980px, 100%);
  margin-inline: auto;
  @media (max-width: 760px) {
    gap: 34px;
  }
`;
export const ProductCategoryGroup = styled.section`
  padding: 18px;
  border: 1px solid #eee5dc;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 12px 32px rgba(70, 45, 20, 0.045);
  h3 {
    margin: 0 0 16px;
    padding-left: 12px;
    border-left: 4px solid var(--home-primary);
    color: var(--home-text);
    font-size: 19px;
    line-height: 1.2;
  }
  @media (max-width: 760px) {
    padding: 14px 10px 16px;
    border-radius: 16px;
    h3 {
      margin-bottom: 13px;
      font-size: 17px;
    }
  }
`;
export const ProductCard = styled.article`
  min-width: 0;
  cursor: pointer;
  transition:
    transform 220ms ease,
    box-shadow 220ms ease,
    border-color 220ms ease;
  &:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--home-primary) 38%, var(--home-border));
    box-shadow: 0 16px 38px rgba(70, 45, 20, 0.1);
  }
  display: grid;
  grid-template-columns: minmax(230px, 320px) minmax(0, 1fr);
  min-height: 190px;
  border: 1px solid var(--home-border);
  border-radius: 15px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 9px 25px rgba(70, 45, 20, 0.035);
  animation: ${productReveal} 260ms ease both;
  &:nth-child(2) {
    animation-delay: 35ms;
  }
  &:nth-child(3) {
    animation-delay: 70ms;
  }
  &:nth-child(4) {
    animation-delay: 105ms;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
  > div:last-child {
    min-width: 0;
    padding: 22px 24px;
    display: flex;
    flex-direction: column;
  }
  h3 {
    margin: 0;
    font-size: 18px;
  }
  p {
    min-height: 0;
    margin: 8px 0 18px;
    color: var(--home-muted);
    font-size: 13px;
    line-height: 1.5;
  }
  footer {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
  }
  strong {
    color: var(--home-primary);
  }
  footer button {
    margin-left: auto;
    width: 38px;
    height: 38px;
    border: 0;
    border-radius: 10px;
    background: var(--home-primary);
    color: #fff;
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  footer button:disabled {
    width: auto;
    padding: 0 12px;
    background: #e9e5e1;
    color: #746d66;
    cursor: not-allowed;
    font-size: 12px;
    font-weight: 700;
  }
  &[data-featured='true'] {
    grid-template-columns: 176px minmax(0, 1fr);
    min-height: 156px;
    border-radius: 18px;
    box-shadow: 0 10px 26px rgba(70, 45, 20, 0.06);
  }
  &[data-featured='true'] > div:last-child {
    min-height: 156px;
    padding: 17px 18px;
    justify-content: center;
  }
  &[data-featured='true'] p {
    margin: 5px 0 12px;
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  @media (max-width: 760px) {
    width: 100%;
    max-width: 380px;
    margin-inline: auto;
    min-width: 0;
    flex: none;
    cursor: pointer;
    display: grid;
    grid-template-columns: 126px minmax(0, 1fr);
    min-height: 126px;
    > div:last-child {
      min-height: 126px;
      padding: 12px 13px;
    }
    h3 {
      font-size: 15px;
    }
    p {
      margin: 4px 0 10px;
      font-size: 11px;
      line-height: 1.35;
    }
    footer {
      gap: 7px;
      font-size: 12px;
    }
    footer button {
      width: 34px;
      height: 34px;
      border-radius: 9px;
    }
    &[data-featured='true'] {
      max-width: none;
      grid-template-columns: 108px minmax(0, 1fr);
      min-height: 112px;
      border-radius: 15px;
      box-shadow: 0 7px 20px rgba(70, 45, 20, 0.055);
    }
    &[data-featured='true'] > div:last-child {
      min-height: 112px;
      padding: 10px 11px;
    }
    &[data-featured='true'] h3 {
      font-size: 14px;
      line-height: 1.2;
    }
    &[data-featured='true'] p {
      margin: 4px 0 8px;
      -webkit-line-clamp: 1;
    }
    @media (max-width: 390px) {
      grid-template-columns: 112px minmax(0, 1fr);
      min-height: 116px;
      > div:last-child {
        min-height: 116px;
        padding: 10px 11px;
      }
      &[data-featured='true'] {
        grid-template-columns: 96px minmax(0, 1fr);
        min-height: 108px;
      }
      &[data-featured='true'] > div:last-child {
        min-height: 108px;
        padding: 9px 10px;
      }
    }
    @media (max-width: 340px) {
      &[data-featured='true'] {
        grid-template-columns: 90px minmax(0, 1fr);
        min-height: 106px;
      }
      &[data-featured='true'] > div:last-child {
        min-height: 106px;
        padding: 8px 9px;
      }
      &[data-featured='true'] p {
        display: none;
      }
    }
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
  height: 190px;
  min-height: 0;
  position: relative;
  overflow: hidden;
  background: #f6f3ee;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
  }
  button {
    position: absolute;
    right: 9px;
    top: 9px;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 50%;
    background: rgba(15, 15, 15, 0.32);
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
    color: #e53935;
    background: rgba(255, 255, 255, 0.94);
  }
  &[data-featured='true'] {
    height: 156px;
    min-height: 156px;
  }
  @media (max-width: 760px) {
    height: 126px;
    min-height: 126px;
    button {
      width: 32px;
      height: 32px;
      right: 8px;
      top: 8px;
    }
    &[data-featured='true'] {
      height: 112px;
      min-height: 112px;
    }
    @media (max-width: 390px) {
      height: 116px;
      min-height: 116px;
      &[data-featured='true'] {
        height: 108px;
        min-height: 108px;
      }
    }
    @media (max-width: 340px) {
      &[data-featured='true'] {
        height: 106px;
        min-height: 106px;
      }
    }
  }
`;
export const About = styled.section`
  width: min(860px, 100%);
  margin: 24px auto 34px;
  padding: 0 24px;
  text-align: center;
  small {
    display: inline-block;
    font-family: 'Segoe UI', Arial, sans-serif;
    color: var(--home-primary);
    letter-spacing: 0.24em;
    font-weight: 900;
    font-size: 11px;
    text-transform: uppercase;
    text-shadow:
      0 2px 10px color-mix(in srgb, var(--home-primary) 24%, transparent),
      0 1px 0 rgba(255, 255, 255, 0.9);
  }
  p {
    font-family: 'Trebuchet MS', 'Segoe UI', sans-serif;
    font-size: clamp(20px, 2.2vw, 29px);
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.42;
    margin: 11px 0 0;
    white-space: pre-line;
    text-wrap: balance;
    color: #27221e;
    text-shadow:
      0 2px 12px rgba(55, 38, 26, 0.14),
      0 1px 1px rgba(255, 255, 255, 0.95);
  }
  @media (max-width: 700px) {
    margin: 18px auto 25px;
    padding: 0 12px;
    p {
      font-size: 19px;
      line-height: 1.5;
    }
  }
`;
export const FloatingActions = styled.div<{ $aboveNudge: boolean; $primary: string }>`
  position: fixed;
  z-index: 45;
  right: 24px;
  bottom: ${({ $aboveNudge }) => ($aboveNudge ? '86px' : '24px')};
  width: min-content;
  max-width: calc(100vw - 32px);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 9px;
  pointer-events: none;
  --home-primary: ${({ $primary }) => $primary};
  --primary: ${({ $primary }) => $primary};

  > * {
    pointer-events: auto;
  }

  @media (max-width: 700px) {
    left: 12px;
    right: 12px;
    bottom: ${({ $aboveNudge }) => ($aboveNudge ? '118px' : '12px')};
    width: auto;
    max-width: none;
  }
`;

export const FloatingActionsToggle = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 8px 12px;
  border: 1px solid #eadfd3;
  border-radius: 999px;
  background: rgba(255, 253, 249, 0.96);
  color: #514b44;
  box-shadow: 0 10px 24px rgba(55, 38, 26, 0.14);
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    border-color: #d8c7b8;
    background: #fff;
  }
`;

export const Whatsapp = styled.a`
  position: relative;
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #3f8c3d;
  color: #fff;
  display: grid;
  place-items: center;
  box-shadow: 0 12px 30px rgba(40, 100, 40, 0.3);
  @media (max-width: 600px) {
    width: 52px;
    height: 52px;
  }
`;
export const CategoryPlaceholder = styled.span`
  width: 100%;
  height: 95px;
  display: grid;
  place-items: center;
  color: var(--home-primary);
  background:
    radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.95), transparent 38%),
    color-mix(in srgb, var(--home-primary) 9%, #fff);
  svg {
    padding: 8px;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 7px 20px rgba(70, 45, 20, 0.08);
  }
  @media (max-width: 760px) {
    height: 82px;
  }
`;

export const Footer = styled.footer`
  margin-top: 64px;
  background: #201d1a;
  color: #fff;
`;
export const FooterContent = styled.div`
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 44px 0 36px;
  display: grid;
  grid-template-columns: minmax(260px, 1.5fr) 1fr 1fr;
  gap: 48px;
  @media (max-width: 760px) {
    width: min(100% - 24px, 560px);
    grid-template-columns: 1fr;
    gap: 28px;
    padding: 36px 0 30px;
  }
`;
export const FooterBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  img,
  > span {
    width: 58px;
    height: 58px;
    border-radius: 15px;
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
  }
  strong {
    font-size: 18px;
  }
  small {
    color: #aaa39c;
    line-height: 1.45;
  }
`;
export const FooterColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 11px;
  > strong {
    margin-bottom: 4px;
    font-size: 14px;
  }
  a,
  span {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: #aaa39c;
    font-size: 14px;
    margin-top: auto;
    line-height: 1.45;
    text-decoration: none;
  }
  a {
    cursor: pointer;
    transition:
      color 180ms ease,
      transform 180ms ease;
  }
  a:hover {
    color: #fff;
    transform: translateX(3px);
  }
  svg {
    flex: 0 0 auto;
    margin-top: 2px;
    color: var(--home-primary);
  }
`;
export const FooterBottom = styled.div`
  border-top: 1px solid #ffffff14;
  padding: 18px 20px;
  color: #817b75;
  font-size: 12px;
  text-align: center;
`;
