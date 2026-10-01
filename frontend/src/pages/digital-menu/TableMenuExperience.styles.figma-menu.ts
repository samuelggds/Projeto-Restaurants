import styled from 'styled-components';

type TableActionTone = 'order' | 'waiter' | 'bill';

export const FigmaShell = styled.main<{ $primary: string; $fontFamily?: string }>`
  --primary: ${({ $primary }) => $primary};
  --text: #1a1a2e;
  --muted: #6d6d80;
  --line: #eaeae6;
  --surface: #ffffff;
  --background: #fafaf8;
  min-height: 100vh;
  overflow-x: hidden;
  background: var(--background);
  color: var(--text);
  font-family: 'Plus Jakarta Sans', ${({ $fontFamily }) => $fontFamily || 'sans-serif'}, sans-serif;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  button,
  input,
  textarea {
    font: inherit;
  }

  button {
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  img {
    display: block;
    max-width: 100%;
  }

  .mobile-only {
    display: none;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 759px) {
    .desktop-only {
      display: none !important;
    }

    .mobile-only {
      display: inline;
    }
  }
`;

export const FigmaHeader = styled.header<{ $hasTitle?: boolean }>`
  width: 100%;
  min-height: 72px;
  padding: 18px 48px;
  border-bottom: 1px solid var(--line);
  background: #fff;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 48px;

  .left {
    min-width: 0;
    display: flex;
    align-items: center;
  }

  .mobile-back,
  .context-title {
    display: none;
  }

  nav {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 32px;
  }

  nav button {
    position: relative;
    padding: 0 0 6px;
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 14px;
    line-height: 18px;
    font-weight: 500;
  }

  nav button:hover,
  nav button:focus-visible {
    color: var(--primary);
  }

  nav button.active {
    color: var(--primary);
    font-weight: 700;
  }

  nav button.active::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    width: 16px;
    height: 2px;
    border-radius: 1px;
    background: var(--primary);
  }

  .right {
    justify-self: end;
  }

  &.cart-header {
    --primary: #ff4b4b;
  }

  &.cart-header .brand .mark,
  &.cart-header .brand img {
    border-radius: 6px;
  }

  &.cart-header .brand .name b {
    color: #1a1a2e;
    font-weight: 400;
  }

  &.cart-header .brand .name small {
    color: #6d6d80;
  }

  &.cart-header .cart-table-pill {
    border-color: #ff4b4b;
    border-radius: 6px;
    background: #fff1f1;
    color: #ff4b4b;
  }

  &.cart-header .right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .clear-cart-header {
    min-height: 34px;
    padding: 0 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #ef4444;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition:
      background-color 160ms ease,
      transform 160ms ease;
  }

  .clear-cart-header:hover {
    background: #fff1f1;
  }

  .clear-cart-header:active {
    transform: scale(.96);
  }

  @media (max-width: 759px) {
    min-height: 65px;
    padding: 16px 20px;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 12px;

    .left {
      gap: 10px;
    }

    nav {
      display: none;
    }

    .mobile-back {
      display: none;
    }

    &.cart-header .mobile-back {
      width: 36px;
      height: 36px;
      padding: 0;
      border: 0;
      background: transparent;
      color: #1a1a2e;
      display: grid;
      place-items: center;
    }

    &.cart-header .mobile-back svg {
      width: 30px;
      height: 30px;
      stroke-width: 2.3;
    }

    &.cart-header .brand {
      display: none;
    }

    &.cart-header .context-title {
      display: grid;
    }

    .context-title {
      min-width: 0;
      display: grid;
      gap: 2px;
      white-space: nowrap;
    }

    .context-title b {
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text);
      font-size: 14px;
      line-height: 18px;
      font-weight: 700;
    }

    .context-title small {
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--muted);
      font-size: 10px;
      line-height: 13px;
      font-weight: 500;
    }

    ${({ $hasTitle }) =>
      $hasTitle
        ? `
      .brand .name {
        display: none;
      }
    `
        : ''}
  }

  @media (max-width: 359px) {
    padding-inline: 14px;
  }
`;

export const FigmaBrand = styled.div.attrs({ className: 'brand' })`
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 12px;

  .mark,
  img {
    width: 36px;
    height: 32px;
    flex: 0 0 36px;
    border-radius: 10px;
    object-fit: cover;
  }

  .mark {
    display: grid;
    place-items: center;
    background: var(--primary);
    color: #fff;
    font-size: 20px;
    line-height: 25px;
    font-weight: 400;
  }

  .name {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .name b {
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
    font-size: 16px;
    line-height: 20px;
    font-weight: 400;
  }

  .name small {
    color: var(--muted);
    font-size: 11px;
    line-height: 14px;
    font-weight: 500;
  }

  .mobile-subtitle {
    display: none;
  }

  @media (max-width: 759px) {
    gap: 10px;

    .mark,
    img {
      width: 32px;
      height: 32px;
      flex-basis: 32px;
    }

    .mark {
      font-size: 18px;
      line-height: 23px;
    }

    .name b {
      max-width: 150px;
      font-size: 14px;
      line-height: 18px;
      font-weight: 700;
    }

    .name small {
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 10px;
      line-height: 13px;
    }

    .desktop-subtitle {
      display: none;
    }

    .mobile-subtitle {
      display: block;
    }
  }
`;

export const FigmaTablePill = styled.div`
  min-width: 102px;
  min-height: 32px;
  padding: 8px 16px;
  border: 1px solid var(--primary);
  border-radius: 12px;
  background: color-mix(in srgb, var(--primary) 8%, #fff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--primary);
  font-size: 13px;
  line-height: 16px;
  font-weight: 700;

  svg {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 759px) {
    min-width: 84px;
    min-height: 26px;
    padding: 6px 12px;
    gap: 4px;
    font-size: 11px;
    line-height: 14px;
  }
`;

export const MenuHero = styled.section`
  position: relative;
  width: 100%;
  height: 320px;
  overflow: hidden;
  color: #fff;

  .hero-bg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .hero-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(167deg, rgba(0, 0, 0, 0.2) 25%, rgba(0, 0, 0, 0.5) 75%);
  }

  .copy {
    position: relative;
    z-index: 2;
    width: calc(100% - 160px);
    height: 100%;
    margin: 0 80px;
    padding: 56px 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .eyebrow {
    color: var(--primary);
    font-size: 13px;
    line-height: 18px;
    font-weight: 700;
    letter-spacing: 2px;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.65);
  }

  .eyebrow-mobile,
  .cta-mobile {
    display: none;
  }

  h1 {
    width: 100%;
    margin: 12px 0 0;
    color: #fff;
    font-size: 48px;
    line-height: 1.1;
    font-weight: 800;
    letter-spacing: -0.5px;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.65);
  }

  p {
    width: 100%;
    margin: 12px 0 0;
    color: rgba(250, 250, 248, 0.7);
    font-size: 16px;
    line-height: 20px;
    font-weight: 500;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.65);
  }

  .cta {
    min-height: 42px;
    margin-top: auto;
    padding: 12px 24px;
    border: 0;
    border-radius: 100px;
    background: var(--primary);
    color: #fff;
    font-size: 15px;
    line-height: 19px;
    font-weight: 700;
  }

  .indicators {
    position: absolute;
    z-index: 3;
    top: 12px;
    left: 40px;
    right: 40px;
    height: 4px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(30px, 1fr));
    gap: 6px;
  }

  .indicators button {
    height: 4px;
    padding: 0;
    border: 0;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.35);
  }

  .indicators button.active {
    background: rgba(255, 255, 255, 0.95);
  }

  @media (max-width: 759px) {
    height: 210px;

    .copy {
      width: 100%;
      margin: 0;
      padding: 20px;
    }

    .eyebrow {
      font-size: 10px;
      line-height: 13px;
      letter-spacing: 1.5px;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
    }

    .eyebrow-desktop,
    .cta-desktop {
      display: none;
    }

    .eyebrow-mobile,
    .cta-mobile {
      display: inline;
    }

    h1 {
      width: 320px;
      max-width: 94%;
      margin-top: 4px;
      font-size: 26px;
      line-height: 1.2;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
    }

    p {
      max-width: 225px;
      margin-top: auto;
      font-size: 13px;
      line-height: 17px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
    }

    .cta {
      position: absolute;
      right: 20px;
      bottom: 20px;
      min-height: 32px;
      padding: 8px 16px;
      font-size: 12px;
      line-height: 15px;
    }

    .indicators {
      top: 8px;
      left: 20px;
      right: 20px;
      height: 3px;
      gap: 4px;
    }

    .indicators button {
      height: 3px;
      border-radius: 1.5px;
    }
  }
`;

export const MenuPage = styled.section`
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 40px 80px 64px;
  display: flex;
  flex-direction: column;
  gap: 40px;

  @media (max-width: 1100px) and (min-width: 760px) {
    padding-inline: 40px;
  }

  @media (max-width: 759px) {
    padding: 20px;
    gap: 20px;
  }

  @media (max-width: 359px) {
    padding-inline: 14px;
  }
`;

export const SearchCategoryRow = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 864px) minmax(0, 392px);
  gap: 24px;
  align-items: center;

  @media (max-width: 1180px) and (min-width: 760px) {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  @media (max-width: 759px) {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 20px;
  }
`;

export const MenuSearch = styled.label`
  width: 100%;
  min-height: 46px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  align-items: center;
  gap: 12px;

  svg {
    width: 16px;
    height: 16px;
    color: var(--text);
  }

  input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--text);
    font-size: 14px;
    line-height: 18px;
  }

  input::placeholder {
    color: var(--muted);
    opacity: 1;
  }

  @media (max-width: 759px) {
    min-height: 40px;
    padding: 12px 14px;
    gap: 10px;

    input {
      font-size: 13px;
      line-height: 16px;
    }
  }
`;

export const CategoryRail = styled.div`
  width: 392px;
  display: flex;
  align-items: flex-start;
  gap: 24px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 1180px) and (min-width: 760px) {
    width: auto;
    max-width: 392px;
  }

  @media (max-width: 759px) {
    width: 100%;
    gap: 16px;
    overflow-x: auto;
  }
`;

export const CategoryPill = styled.button<{ $active?: boolean }>`
  width: 80px;
  min-width: 80px;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${({ $active }) => ($active ? 'var(--primary)' : '#262626')};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  .category-image {
    width: 72px;
    height: 72px;
    overflow: hidden;
    border-radius: 50%;
    background: #fff;
  }

  .category-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .category-label {
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    line-height: 16px;
    font-weight: ${({ $active }) => ($active ? 700 : 600)};
  }

  @media (max-width: 759px) {
    flex: 1 1 0;
    min-width: 0;
    width: auto;
    gap: 8px;

    .category-image {
      width: 60px;
      height: 60px;
    }

    .category-label {
      max-width: 76px;
      font-size: 12px;
      line-height: 15px;
    }
  }

  @media (max-width: 359px) {
    .category-image {
      width: 54px;
      height: 54px;
    }

    .category-label {
      font-size: 11px;
    }
  }
`;

export const ComboSection = styled.section`
  width: 100%;
  display: grid;
  gap: 24px;

  @media (max-width: 759px) {
    gap: 12px;
  }
`;

export const SectionHeading = styled.header`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  .title {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  h2 {
    margin: 0;
    color: var(--text);
    font-size: 32px;
    line-height: 40px;
    font-weight: 400;
    letter-spacing: 0;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
    line-height: 18px;
    font-weight: 400;
  }

  button {
    flex: 0 0 auto;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--primary);
    font-size: 12px;
    line-height: 15px;
    font-weight: 700;
  }

  @media (max-width: 759px) {
    h2 {
      font-size: 22px;
      line-height: 28px;
    }

    p {
      display: none;
    }

    button {
      font-size: 12px;
    }
  }
`;

export const ComboRail = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;

  @media (max-width: 1100px) and (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 759px) {
    width: 100%;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 169px;
    grid-template-columns: none;
    gap: 12px;
    overflow-x: auto;
    scrollbar-width: none;
    scroll-snap-type: x proximity;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

export const ComboCard = styled.article<{ $hasImage?: boolean }>`
  position: relative;
  min-width: 0;
  height: 254px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);

  .media {
    height: 140px;
    overflow: hidden;
    background: var(--background);
  }

  .media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .copy {
    height: 114px;
    padding: 16px;
    display: grid;
    grid-template-rows: 19px 15px 32px;
    gap: 8px;
    align-content: start;
  }

  h3 {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
    font-size: 15px;
    line-height: 19px;
    font-weight: 700;
  }

  p {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--muted);
    font-size: 12px;
    line-height: 15px;
  }

  .price {
    align-self: center;
    color: var(--primary);
    font-size: 16px;
    line-height: 20px;
    font-weight: 400;
  }

  .main {
    position: absolute;
    inset: 0;
    z-index: 1;
    border: 0;
    background: transparent;
  }

  .add {
    position: absolute;
    z-index: 2;
    right: 16px;
    bottom: 16px;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: var(--primary);
    color: #fff;
    display: grid;
    place-items: center;
  }

  .add svg {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 759px) {
    height: 185px;
    box-shadow: none;

    .media {
      height: 96px;
    }

    .copy {
      height: 89px;
      padding: 12px;
      grid-template-rows: 16px 13px 28px;
      gap: 4px;
    }

    h3 {
      font-size: 13px;
      line-height: 16px;
    }

    p {
      font-size: 10px;
      line-height: 13px;
    }

    .price {
      font-size: 14px;
      line-height: 18px;
    }

    .add {
      right: 12px;
      bottom: 12px;
      width: 24px;
      height: 24px;
    }

    .add svg {
      width: 12px;
      height: 12px;
    }
  }
`;

const toneIconBackground = (tone: TableActionTone) => {
  if (tone === 'order') return '#fff1f1';
  if (tone === 'waiter') return '#fff7e6';
  return '#ecfdf5';
};

const toneIconColor = (tone: TableActionTone) => {
  if (tone === 'order') return 'var(--primary)';
  if (tone === 'waiter') return '#f59e0b';
  return '#10b981';
};

export const TableActionsSection = styled.section`
  width: 100%;
  display: grid;
  gap: 16px;

  h2 {
    margin: 0;
    color: var(--text);
    font-size: 32px;
    line-height: 40px;
    font-weight: 400;
  }

  @media (max-width: 759px) {
    gap: 12px;

    h2 {
      font-size: 20px;
      line-height: 25px;
    }
  }
`;

export const TableActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;

  @media (max-width: 759px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
`;

export const TableActionCard = styled.button<{ $tone: TableActionTone }>`
  min-height: 80px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text);
  text-align: left;

  .icon {
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    border-radius: 10px;
    background: ${({ $tone }) => toneIconBackground($tone)};
    color: ${({ $tone }) => toneIconColor($tone)};
    display: grid;
    place-items: center;
  }

  .icon svg {
    width: 20px;
    height: 20px;
  }

  .copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 15px;
    line-height: 19px;
    font-weight: 700;
  }

  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--muted);
    font-size: 12px;
    line-height: 15px;
    font-weight: 400;
  }

  &:hover,
  &:focus-visible {
    border-color: color-mix(in srgb, var(--primary) 45%, var(--line));
  }

  @media (max-width: 759px) {
    min-height: 42px;
    padding: 12px;
    border-radius: 14px;
    gap: 8px;

    .icon {
      width: 18px;
      height: 18px;
      flex-basis: 18px;
      border-radius: 5px;
      background: transparent;
    }

    .icon svg {
      width: 18px;
      height: 18px;
    }

    b {
      font-size: 11px;
      line-height: 14px;
    }

    small {
      display: none;
    }
  }
`;

export const CatalogSection = styled.section`
  scroll-margin-top: 90px;
  width: 100%;
  display: grid;
  gap: 20px;
`;

export const CatalogGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 1050px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 759px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  @media (max-width: 359px) {
    grid-template-columns: 1fr;
  }
`;

export const CatalogCard = styled.article<{ $hasImage?: boolean }>`
  position: relative;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #fff;

  .media {
    height: 150px;
    overflow: hidden;
    background: var(--background);
  }

  .media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .copy {
    min-height: 108px;
    padding: 14px 44px 14px 14px;
    display: grid;
    align-content: start;
    gap: 4px;
  }

  h3 {
    margin: 0;
    color: var(--text);
    font-size: 14px;
    line-height: 18px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 15px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .price {
    color: var(--primary);
    font-size: 15px;
    font-weight: 600;
  }

  .original {
    color: #9292a3;
    font-size: 10px;
    text-decoration: line-through;
  }

  .main {
    position: absolute;
    inset: 0;
    z-index: 1;
    border: 0;
    background: transparent;
  }

  .add {
    position: absolute;
    z-index: 2;
    right: 12px;
    bottom: 12px;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: var(--primary);
    color: #fff;
    display: grid;
    place-items: center;
  }

  @media (max-width: 759px) {
    .media {
      height: 100px;
    }

    .copy {
      min-height: 94px;
      padding: 11px 38px 11px 11px;
    }

    h3 {
      font-size: 12px;
    }

    p {
      font-size: 9.5px;
      -webkit-line-clamp: 1;
    }

    .price {
      font-size: 13px;
    }

    .add {
      width: 24px;
      height: 24px;
      right: 10px;
      bottom: 10px;
    }
  }
`;

export const EmptyCatalog = styled.div`
  padding: 24px;
  border: 1px dashed var(--line);
  border-radius: 16px;
  background: #fff;
  color: var(--muted);
  text-align: center;
  font-size: 13px;
`;

export const BottomNav = styled.nav`
  display: none;
`;
