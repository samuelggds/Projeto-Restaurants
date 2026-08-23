import styled, { keyframes } from 'styled-components';

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

export const HomeRoot = styled.div<{ $primary: string }>`
  --home-primary: ${({ $primary }) => $primary};
  --primary: ${({ $primary }) => $primary};
  --home-border: #eadfd3;
  --home-text: #191816;
  --home-muted: #6f6a63;
  width: 100%;
  min-height: 100vh;
  background: #fffdf9;
  color: var(--home-text);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;
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
export const HeroGrid = styled.section`
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
  width: 100%;
  height: clamp(300px, 34vw, 470px);
  margin-bottom: 26px;
  @media (max-width: 800px) {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    height: auto;
    margin-bottom: 26px;
  }
`;
export const MainBanner = styled.article`
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  background: #111;
  box-shadow: 0 18px 45px rgba(52, 31, 14, 0.14);
  img {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    filter: brightness(0.54);
  }
  @media (max-width: 800px) {
    grid-row: auto;
    aspect-ratio: 16 / 9;
  }
`;
export const BannerCopy = styled.div`
  position: absolute;
  inset: 0;
  padding: clamp(24px, 3vw, 42px);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  h1 {
    max-width: 520px;
    font-size: clamp(34px, 3.4vw, 52px);
    line-height: 1;
    margin: 0 0 12px;
  }
  em {
    font-style: normal;
    color: #f17435;
  }
  p {
    font-size: 16px;
    margin: 0 0 20px;
  }
  button {
    border: 0;
    border-radius: 999px;
    background: var(--home-primary);
    color: #fff;
    padding: 14px 25px;
    display: flex;
    align-items: center;
    gap: 15px;
    font-weight: 700;
    cursor: pointer;
  }
  @media (max-width: 600px) {
    padding: 24px 21px;
    h1 {
      font-size: 37px;
    }
    p {
      font-size: 14px;
      margin-bottom: 18px;
    }
    button {
      padding: 11px 18px;
    }
  }
`;
export const MiniBanner = styled.article<{ $second?: boolean }>`
  position: relative;
  overflow: hidden;
  min-height: 0;
  border-radius: 18px;
  background: #111;
  box-shadow: 0 12px 30px rgba(52, 31, 14, 0.11);
  img {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
    filter: brightness(0.48);
  }
  div {
    position: absolute;
    left: 24px;
    top: 50%;
    transform: translateY(-50%);
    color: #fff;
  }
  strong {
    display: block;
    font-size: clamp(20px, 2vw, 27px);
    line-height: 1.08;
  }
  em {
    color: #f17435;
    font-style: normal;
  }
  small {
    display: block;
    margin-top: 9px;
    font-size: 14px;
  }
  @media (max-width: 800px) {
    aspect-ratio: 16 / 8;
    div {
      left: 20px;
    }
    strong {
      font-size: 23px;
    }
  }
`;
export const InfoBar = styled.div`
  min-height: 62px;
  margin: 14px 0 10px;
  border: 1px solid var(--home-border);
  border-radius: 16px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
  background: #fffdf9;
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
    grid-template-columns: 1fr 1fr;
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
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 12px 35px rgba(70, 45, 20, 0.055);
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
  background: linear-gradient(145deg, #fff 0%, #fffcf8 100%);
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

// ── Cart drawer
export const CartOverlay = styled.button<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(15, 12, 10, 0.6);
  backdrop-filter: blur(6px);
  border: 0;
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition:
    opacity 0.28s,
    visibility 0.28s;
  cursor: default;
`;

export const CartDrawer = styled.aside<{ $open: boolean }>`
  position: fixed;
  right: 0;
  top: 0;
  z-index: 70;
  width: min(480px, 100%);
  height: 100dvh;
  background: #fffdf9;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: hidden;
  overscroll-behavior: contain;
  transform: translateX(${({ $open }) => ($open ? '0' : '105%')});
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
  box-shadow: -24px 0 80px rgba(70, 45, 20, 0.22);
`;

export const CartHead = styled.div`
  position: sticky;
  top: 0;
  z-index: 4;
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 22px 24px 18px;
  background: #191816;
  color: #fff;

  .cart-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
  }

  small {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
    font-weight: 400;
  }

  button {
    width: 36px;
    height: 36px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font-size: 20px;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 0.18s;
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
`;

export const CartItems = styled.div`
  flex: 0 1 auto;
  width: 100%;
  max-height: 32dvh;
  overflow-y: auto;
  padding: 14px 20px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--home-border);
    border-radius: 2px;
  }
`;

export const CartItemRow = styled.div`
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 14px;
  padding: 14px;
  background: #fff;
  border: 1px solid var(--home-border);
  border-radius: 14px;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 16px rgba(70, 45, 20, 0.08);
  }

  img {
    width: 76px;
    height: 76px;
    border-radius: 10px;
    object-fit: cover;
  }
`;

export const CartItemInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  strong {
    font-size: 14px;
    font-weight: 700;
    display: block;
    color: #191816;
    line-height: 1.3;
  }

  .item-price {
    color: #d64d08;
    font-weight: 800;
    font-size: 15px;
  }
  .item-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 10px;
  }

  .item-options {
    display: grid;
    gap: 2px;
    margin-top: 8px;
  }

  .item-options small,
  .item-observation {
    color: #756d65;
    font-size: 11px;
    line-height: 1.4;
  }

  .item-options b {
    color: #4e4741;
  }

  .item-observation {
    margin-top: 6px;
    padding: 6px 8px;
    border-radius: 7px;
    background: #f7f3ee;
  }
`;

export const CartQty = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
  background: #f5f0ea;
  border-radius: 8px;
  width: fit-content;
  overflow: hidden;

  button {
    width: 30px;
    height: 30px;
    border: none;
    background: transparent;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    display: grid;
    place-items: center;
    color: #191816;
    transition: background 0.15s;
    &:hover {
      background: var(--home-border);
    }
  }

  b {
    font-size: 14px;
    font-weight: 700;
    min-width: 28px;
    text-align: center;
    color: #191816;
  }
`;

export const CartEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 12px;
  color: var(--home-muted);
  text-align: center;

  .icon {
    width: 72px;
    height: 72px;
    background: #f5f0ea;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 32px;
  }

  strong {
    font-size: 16px;
    font-weight: 700;
    color: #191816;
  }

  p {
    font-size: 13px;
    margin: 0;
    max-width: 240px;
    line-height: 1.5;
  }
`;

export const CartFoot = styled.div`
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  border-top: 1px solid var(--home-border);
  background: #fff;
  overflow: hidden;

  > * {
    flex: 0 0 auto;
    width: 100%;
  }

  .cart-checkout-area {
    flex: 0 0 auto;
    width: 100%;
    margin-top: auto;
    padding-top: 14px;
    background: #fff;
    border-top: 1px solid var(--home-border);
  }
`;

export const CartOptions = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  padding-top: 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;

  > * {
    flex: 0 0 auto;
    width: 100%;
  }
`;

export const CartSummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--home-muted);
  margin-bottom: 6px;
`;

export const CartTotal = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 800;
  font-size: 20px;
  color: #191816;
  margin: 12px 0 16px;
  padding-top: 12px;
  border-top: 2px solid var(--home-border);

  span:last-child {
    color: #d64d08;
  }
`;

/* ── Order type toggle (Entrega / Retirada) */
export const CartSection = styled.div`
  padding: 14px 20px;
  border-top: 1px solid var(--home-border);

  label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--home-muted);
    margin-bottom: 10px;
  }
`;

export const OrderTypeToggle = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #f5f0ea;
  border-radius: 12px;
  padding: 3px;
  gap: 3px;
`;

export const OrderTypeBtn = styled.button<{ $active: boolean }>`
  padding: 10px 8px;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.18s;

  background: ${({ $active }) => ($active ? '#fff' : 'transparent')};
  color: ${({ $active }) => ($active ? '#d64d08' : '#6f6a63')};
  box-shadow: ${({ $active }) => ($active ? '0 2px 8px rgba(70,45,20,0.10)' : 'none')};
`;

export const CartCheckout = styled.button`
  width: 100%;
  height: 56px;
  background: #191816;
  color: #fff;
  border: 0;
  border-radius: 14px;
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0.01em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition:
    transform 0.18s,
    background 0.18s;

  .btn-price {
    margin-left: auto;
    font-size: 14px;
    background: rgba(255, 255, 255, 0.15);
    padding: 4px 10px;
    border-radius: 6px;
  }

  &:hover:not(:disabled) {
    background: #d64d08;
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* ── Delivery/pickup + payment section inside cart */
export const CartSectionLabel = styled.p`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #9a9591;
  margin: 0 0 8px;
`;

export const DeliveryToggle = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #f0ece6;
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
  margin-bottom: 10px;
`;

export const DeliveryBtn = styled.button<{ $active: boolean }>`
  padding: 11px 8px;
  border: none;
  border-radius: 9px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition: all 0.2s;
  background: ${({ $active }) => ($active ? '#fff' : 'transparent')};
  color: ${({ $active }) => ($active ? '#d64d08' : '#6f6a63')};
  box-shadow: ${({ $active }) => ($active ? '0 2px 10px rgba(70,45,20,.12)' : 'none')};

  .btn-icon {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: ${({ $active }) => ($active ? '#fdeee7' : '#e8e3dc')};
    display: grid;
    place-items: center;
    font-size: 14px;
    flex-shrink: 0;
    transition: background 0.2s;
  }
`;

export const PaymentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  background: #fffdf9;

  @media (max-width: 820px) {
    flex: 0 0 auto;
    height: auto;
    max-height: 34dvh;
    padding: 14px 16px 10px;
  }
  margin-bottom: 10px;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

export const AddressForm = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px;
  gap: 8px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid #e9dfd5;
  border-radius: 14px;
  background: #fcfaf7;

  .cep-field,
  .full {
    grid-column: 1 / -1;
  }
  .street {
    grid-column: 1;
  }

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
    .cep-field,
    .full,
    .street {
      grid-column: 1;
    }
  }
`;

export const AddressField = styled.label`
  display: grid;
  gap: 5px;
  min-width: 0;

  > span {
    color: #514b44;
    font-size: 11px;
    font-weight: 750;
  }
  i {
    color: #8b837a;
    font-style: normal;
    font-weight: 500;
  }
  input,
  select {
    width: 100%;
    height: 39px;
    padding: 0 12px;
    border: 1px solid #dcd2c7;
    border-radius: 10px;
    background: #fff;
    color: #191816;
    font: inherit;
    font-size: 13px;
    outline: none;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }
  input:focus,
  select:focus {
    border-color: var(--primary, #d64d08);
    box-shadow: 0 0 0 3px rgba(214, 77, 8, 0.1);
  }
  small {
    font-size: 10px;
  }
  small.loading {
    color: #7c5b20;
  }
  small.success {
    color: #18773a;
  }
  small.error {
    color: #b42318;
  }
`;

export const PaymentCard = styled.button<{ $active: boolean; $color: string }>`
  padding: 13px 11px;
  border-radius: 12px;
  border: 2px solid ${({ $active, $color }) => ($active ? $color : '#e4ddd5')};
  background: ${({ $active, $color }) => ($active ? `${$color}12` : '#fff')};
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ $color }) => $color};
    box-shadow: 0 4px 14px ${({ $color }) => $color}22;
  }

  .pm-badge {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: ${({ $active, $color }) => ($active ? $color : '#f0ece6')};
    display: grid;
    place-items: center;
    margin-bottom: 8px;
    font-size: 18px;
    transition: background 0.2s;
  }

  .pm-name {
    display: block;
    font-weight: 800;
    font-size: 13px;
    color: #191816;
    margin-bottom: 2px;
  }

  .pm-desc {
    display: block;
    font-size: 10px;
    color: #6f6a63;
    line-height: 1.3;
  }
`;

/* ── Card payment modal */
export const CardModalBg = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(15, 12, 10, 0.65);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 20px;
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition:
    opacity 0.25s,
    visibility 0.25s;
`;

export const CardModal = styled.div<{ $open: boolean }>`
  width: min(440px, 100%);
  background: #fff;
  border-radius: 20px;
  padding: clamp(24px, 4vw, 36px);
  box-shadow: 0 28px 80px rgba(15, 12, 10, 0.3);
  transform: translateY(${({ $open }) => ($open ? '0' : '16px')});
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);

  h3 {
    margin: 0 0 20px;
    font-size: 18px;
    font-weight: 800;
    color: #191816;
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

export const CardModalClose = styled.button`
  margin-left: auto;
  width: 32px;
  height: 32px;
  border: 1px solid var(--home-border);
  border-radius: 8px;
  background: #f5f0ea;
  font-size: 18px;
  cursor: pointer;
  display: grid;
  place-items: center;
  color: var(--home-muted);
`;

export const CardPreview = styled.div`
  height: 140px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 18px 20px;
  color: white;
  position: relative;
  overflow: hidden;
  margin-bottom: 20px;

  &::before {
    content: '';
    position: absolute;
    top: -40px;
    right: -40px;
    width: 160px;
    height: 160px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
  }

  .card-number {
    font-size: 16px;
    letter-spacing: 0.2em;
    font-weight: 600;
    margin-top: 28px;
    opacity: 0.9;
  }

  .card-row {
    display: flex;
    justify-content: space-between;
    margin-top: 16px;
    font-size: 11px;
    opacity: 0.7;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .card-name {
    font-size: 13px;
    font-weight: 700;
    opacity: 0.9;
  }
  .card-expiry {
    font-size: 13px;
    font-weight: 700;
    opacity: 0.9;
  }
`;

export const CardField = styled.label`
  display: grid;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  color: var(--home-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;

  input {
    width: 100%;
    height: 48px;
    border: 1.5px solid var(--home-border);
    border-radius: 10px;
    padding: 0 14px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    color: #191816;
    outline: none;
    transition: border-color 0.18s;
    background: #fff;

    &:focus {
      border-color: #d64d08;
      box-shadow: 0 0 0 3px rgba(214, 77, 8, 0.08);
    }
    &::placeholder {
      font-weight: 400;
      color: #bdb4aa;
    }
  }
`;

export const CardFieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

export const CardSubmit = styled.button`
  width: 100%;
  height: 52px;
  background: #191816;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
  font-family: inherit;
  margin-top: 4px;
  transition:
    background 0.18s,
    transform 0.18s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    background: #d64d08;
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }
`;

/* ── Login nudge bar (shown when user is not authenticated) */
export const LoginNudge = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: #191816;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 500;
  flex-wrap: wrap;

  span {
    color: rgba(255, 255, 255, 0.7);
  }

  a,
  button {
    height: 34px;
    padding: 0 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    transition: filter 0.18s;
    &:hover {
      filter: brightness(1.1);
    }
  }

  .nudge-login {
    background: #d64d08;
    color: #fff;
    border: none;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }

  .nudge-dismiss {
    background: transparent;
    color: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
`;

/* ── In-app notification banner */
export const NotifStack = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
  width: min(380px, calc(100vw - 40px));

  @media (max-width: 600px) {
    top: 12px;
    right: 12px;
    left: 12px;
    width: auto;
  }
`;

export const NotifItem = styled.div<{
  $type: 'success' | 'error' | 'info' | 'warning';
  $visible: boolean;
}>`
  pointer-events: auto;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border-radius: 14px;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.04),
    0 10px 30px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  border-left: 4px solid
    ${({ $type }) =>
      $type === 'success'
        ? '#4f8b40'
        : $type === 'error'
          ? '#c94040'
          : $type === 'warning'
            ? '#d97706'
            : '#d64d08'};

  transform: translateX(${({ $visible }) => ($visible ? '0' : 'calc(100% + 40px)')});
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition:
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.28s ease;

  .notif-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    font-size: 16px;
    flex-shrink: 0;
    background: ${({ $type }) =>
      $type === 'success'
        ? '#edfaeb'
        : $type === 'error'
          ? '#fdf0f0'
          : $type === 'warning'
            ? '#fef9ec'
            : '#fdeee7'};
  }

  .notif-body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .notif-title {
    font-size: 14px;
    font-weight: 700;
    color: #191816;
    line-height: 1.25;
  }

  .notif-msg {
    font-size: 13px;
    color: #6f6a63;
    line-height: 1.35;
  }

  .notif-close {
    width: 24px;
    height: 24px;
    border: none;
    background: #f5f0ea;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    display: grid;
    place-items: center;
    color: #6f6a63;
    flex-shrink: 0;
    transition: background 0.15s;
    &:hover {
      background: #eadfd3;
    }
  }
`;
