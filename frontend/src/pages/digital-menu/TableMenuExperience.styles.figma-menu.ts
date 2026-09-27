import styled from 'styled-components';

function tableFontStack(fontFamily?: string) {
  if (fontFamily === 'Manrope') return 'Manrope, ui-sans-serif, system-ui, sans-serif';
  if (fontFamily === 'DM Sans') return "'DM Sans', ui-sans-serif, system-ui, sans-serif";
  return 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
}

export const FigmaShell = styled.main<{ $primary: string; $fontFamily?: string }>`
  --primary: ${({ $primary }) => $primary};
  --text: #0f1113;
  --muted: #6b7380;
  --line: #e5e8ed;
  --soft: #f4f5f7;
  min-height: 100vh;
  overflow-x: hidden;
  background: #f9f9fb;
  color: var(--text);
  font-family: ${({ $fontFamily }) => tableFontStack($fontFamily)};

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
  }

  img {
    display: block;
    max-width: 100%;
  }

  @media (max-width: 759px) {
    background: #fafafb;
  }
`;

export const FigmaHeader = styled.header<{ $hasTitle?: boolean }>`
  position: relative;
  z-index: 30;
  width: 100%;
  height: 78px;
  padding: 0 40px;
  background: #fff;
  display: grid;
  grid-template-columns: minmax(360px, 1fr) auto minmax(250px, 1fr);
  align-items: center;

  .left {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 42px;
  }

  .mobile-back {
    display: none;
  }

  .context-title {
    color: #0f1113;
    font-size: 16px;
    line-height: 19px;
    font-weight: 650;
    white-space: nowrap;
  }

  nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 37px;
  }

  nav button {
    padding: 4px 0;
    border: 0;
    background: transparent;
    color: #6b7380;
    font-size: 13px;
    font-weight: 500;
  }

  nav button:hover,
  nav button:focus-visible {
    color: var(--primary);
  }

  .right {
    justify-self: end;
  }

  @media (max-width: 759px) {
    height: 69px;
    padding: 0 18px;
    background: #fafafb;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;

    .left {
      gap: 12px;
    }

    .mobile-back {
      width: 24px;
      height: 24px;
      padding: 0;
      border: 0;
      background: transparent;
      color: #0f1113;
      display: grid;
      place-items: center;
      flex: 0 0 24px;
    }

    .context-title {
      font-size: 18px;
      line-height: 24px;
      font-weight: 750;
    }

    nav {
      display: none;
    }

    ${({ $hasTitle }) =>
      $hasTitle
        ? `
      .brand {
        display: none;
      }
    `
        : ''}
  }
`;

export const FigmaBrand = styled.div.attrs({ className: 'brand' })`
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 12px;

  .mark,
  img {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    border-radius: 14px;
    object-fit: cover;
  }

  .mark {
    display: grid;
    place-items: center;
    background: var(--primary);
    color: #fff;
    font-size: 19px;
    font-weight: 800;
  }

  .name {
    min-width: 0;
    display: block;
  }

  .name b {
    display: block;
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #0f1113;
    font-size: 20px;
    line-height: 24px;
    font-weight: 800;
  }

  @media (max-width: 759px) {
    gap: 10px;

    .mark,
    img {
      width: 40px;
      height: 40px;
      flex-basis: 40px;
      border-radius: 14px;
    }

    .name b {
      max-width: 170px;
      font-size: 18px;
      line-height: 22px;
    }
  }

  @media (max-width: 360px) {
    .name b {
      max-width: 136px;
    }
  }
`;

export const FigmaTablePill = styled.div`
  width: 170px;
  height: 46px;
  padding: 0 14px;
  border: 1px solid #e5e8ed;
  border-radius: 16px;
  background: #fff;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #0f1113;
  font-size: 14px;
  font-weight: 650;

  svg {
    width: 24px;
    height: 24px;
    color: var(--primary);
  }

  @media (max-width: 759px) {
    width: 96px;
    height: 42px;
    padding: 0 11px;
    gap: 6px;
    font-size: 13px;

    svg {
      width: 22px;
      height: 22px;
    }
  }
`;

export const MenuPage = styled.section`
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 28px 40px 72px;

  @media (max-width: 759px) {
    padding: 0 20px 52px;
  }

  @media (max-width: 359px) {
    padding-inline: 14px;
  }
`;

export const MenuHero = styled.section`
  position: relative;
  width: 100%;
  height: 310px;
  overflow: hidden;
  border-radius: 22px;
  background:
    linear-gradient(
      116deg,
      color-mix(in srgb, var(--primary) 24%, #140604) 0%,
      color-mix(in srgb, var(--primary) 72%, #751305) 48%,
      color-mix(in srgb, var(--primary) 64%, #ff570a) 100%
    );
  color: #fff;

  .copy {
    position: relative;
    z-index: 4;
    width: 610px;
    height: 100%;
    padding: 36px 34px 26px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .eyebrow {
    color: #ffc7c7;
    font-size: 12px;
    line-height: 24px;
    font-weight: 800;
    letter-spacing: 0.01em;
  }

  h1 {
    width: 560px;
    margin: 10px 0 0;
    color: #fff;
    font-size: 50px;
    line-height: 1.02;
    font-weight: 800;
    letter-spacing: -0.035em;
  }

  p {
    width: 500px;
    margin: 22px 0 0;
    color: #ffede8;
    font-size: 16px;
    line-height: 24px;
  }

  .cta {
    width: 180px;
    height: 46px;
    margin-top: auto;
    padding: 0 16px;
    border: 0;
    border-radius: 14px;
    background: var(--primary);
    color: #fff;
    display: grid;
    place-items: center;
    font-size: 14px;
    font-weight: 650;
  }

  .hero-media {
    position: absolute;
    z-index: 2;
    right: 155px;
    top: 43px;
    width: 382px;
    height: 382px;
    display: grid;
    place-items: center;
  }

  .hero-media .halo {
    position: absolute;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.05);
  }

  .hero-media .halo-one {
    width: 381px;
    height: 381px;
  }

  .hero-media .halo-two {
    width: 272px;
    height: 272px;
    background: rgba(255, 255, 255, 0.08);
  }

  .hero-media img {
    position: relative;
    z-index: 2;
    width: 272px;
    height: 272px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.16);
  }

  .indicators {
    position: absolute;
    z-index: 6;
    right: 18px;
    bottom: 14px;
    display: inline-flex;
    gap: 5px;
  }

  .indicators button {
    width: 18px;
    height: 4px;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.42);
  }

  .indicators button.active {
    background: #fff;
  }

  @media (max-width: 759px) {
    height: 212px;
    border-radius: 18px;

    .copy {
      width: 250px;
      padding: 18px;
    }

    .eyebrow {
      font-size: 10.5px;
      line-height: 24px;
    }

    h1 {
      width: 230px;
      margin-top: 4px;
      font-size: 29px;
      line-height: 1.05;
    }

    p {
      width: 230px;
      margin-top: 14px;
      font-size: 11.5px;
      line-height: 17px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .cta {
      width: 136px;
      height: 36px;
      border-radius: 12px;
      font-size: 12px;
    }

    .hero-media {
      right: 28px;
      top: 38px;
      width: 140px;
      height: 140px;
    }

    .hero-media .halo-one {
      width: 140px;
      height: 140px;
    }

    .hero-media .halo-two {
      width: 112px;
      height: 112px;
    }

    .hero-media img {
      width: 84px;
      height: 84px;
    }

    .indicators {
      right: 10px;
      bottom: 8px;
    }
  }
`;

export const SectionHeading = styled.header`
  min-height: 34px;
  margin: 30px 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  .title {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  h2 {
    margin: 0;
    color: #0f1113;
    font-size: 28px;
    line-height: 34px;
    font-weight: 800;
    letter-spacing: -0.025em;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 11px;
  }

  button {
    flex: 0 0 auto;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--primary);
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 13px;
    font-weight: 650;
  }

  @media (max-width: 759px) {
    min-height: 25px;
    margin: 20px 0 9px;

    h2 {
      font-size: 21px;
      line-height: 25px;
    }

    p {
      font-size: 10px;
    }

    button {
      font-size: 12px;
    }
  }
`;

export const ComboRail = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 310px));
  gap: 20px;
  padding: 0 12px;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-snap-type: x proximity;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 1120px) and (min-width: 760px) {
    grid-auto-flow: column;
    grid-template-columns: none;
    grid-auto-columns: 310px;
  }

  @media (max-width: 759px) {
    margin-right: -20px;
    padding: 0 20px 0 0;
    grid-auto-flow: column;
    grid-template-columns: none;
    grid-auto-columns: 165px;
    gap: 12px;
  }
`;

export const ComboCard = styled.article<{ $hasImage?: boolean }>`
  position: relative;
  width: 100%;
  height: 224px;
  overflow: hidden;
  border: 1px solid #e5e8ed;
  border-radius: 18px;
  background: #fff;
  scroll-snap-align: start;

  .media {
    height: 118px;
    overflow: hidden;
    background: var(--soft);
  }

  .media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .copy {
    padding: ${({ $hasImage }) => ($hasImage ? '11px 48px 10px 15px' : '26px 48px 16px 15px')};
    display: grid;
    align-content: start;
    gap: 3px;
  }

  h3 {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #0f1113;
    font-size: 16px;
    line-height: 24px;
    font-weight: 800;
  }

  p {
    margin: -1px 0 0;
    color: #6b7380;
    font-size: 11px;
    line-height: 18px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .price {
    margin-top: 6px;
    color: var(--primary);
    font-size: 18px;
    line-height: 24px;
    font-weight: 800;
  }

  .main {
    position: absolute;
    inset: 0;
    z-index: 2;
    border: 0;
    background: transparent;
  }

  .add {
    position: absolute;
    z-index: 3;
    right: 14px;
    bottom: 13px;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: var(--primary);
    color: #fff;
    display: grid;
    place-items: center;
  }

  .main:disabled,
  .add:disabled {
    opacity: 0.45;
  }

  @media (max-width: 759px) {
    height: 192px;

    .media {
      height: 96px;
    }

    .copy {
      padding: ${({ $hasImage }) => ($hasImage ? '9px 42px 9px 11px' : '20px 42px 14px 11px')};
      gap: 0;
    }

    h3 {
      font-size: 14px;
      line-height: 22px;
    }

    p {
      font-size: 10.5px;
      line-height: 18px;
    }

    .price {
      margin-top: 4px;
      font-size: 16px;
      line-height: 24px;
    }

    .add {
      width: 30px;
      height: 30px;
      right: 12px;
      bottom: 12px;
    }

    .add svg {
      width: 20px;
      height: 20px;
    }
  }
`;

export const SearchCategoryRow = styled.div`
  margin: 28px 12px 0;
  display: grid;
  grid-template-columns: minmax(0, 1000px) auto;
  gap: 28px;
  align-items: center;

  @media (max-width: 759px) {
    margin: 16px 0 0;
    display: block;
  }
`;

export const MenuSearch = styled.label`
  height: 54px;
  padding: 0 16px;
  border: 1px solid #e5e8ed;
  border-radius: 16px;
  background: #fff;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  color: #0f1113;

  svg {
    width: 24px;
    height: 24px;
  }

  input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: #0f1113;
    font-size: 13px;
  }

  input::placeholder {
    color: #6b7380;
    opacity: 1;
  }

  @media (max-width: 759px) {
    height: 50px;
    padding: 0 14px;
    grid-template-columns: 23px minmax(0, 1fr);
    gap: 13px;

    svg {
      width: 23px;
      height: 23px;
    }

    input {
      font-size: 13px;
    }
  }
`;

export const CategoryRail = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 759px) {
    gap: 12px;
    margin-top: 14px;
    margin-right: -20px;
    padding-right: 20px;
  }
`;

export const CategoryPill = styled.button<{ $active?: boolean }>`
  width: 84px;
  height: 54px;
  flex: 0 0 84px;
  padding: 0 8px;
  border: 1px solid ${({ $active }) => ($active ? 'var(--primary)' : '#e5e8ed')};
  border-radius: 14px;
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--primary) 7%, #fff)' : '#fff'};
  color: ${({ $active }) => ($active ? 'var(--primary)' : '#0f1113')};
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 650;
  white-space: nowrap;

  @media (max-width: 759px) {
    width: 80px;
    height: 46px;
    flex-basis: 80px;
    font-size: 11.5px;
  }
`;

export const TableActionsSection = styled.section`
  margin: 32px 12px 0;

  h2 {
    margin: 0 0 13px;
    color: #0f1113;
    font-size: 24px;
    line-height: 29px;
    font-weight: 800;
  }

  @media (max-width: 759px) {
    margin: 22px 0 0;

    h2 {
      margin-bottom: 8px;
      font-size: 19px;
      line-height: 23px;
    }
  }
`;

export const TableActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 250px);
  gap: 18px;

  @media (max-width: 759px) {
    grid-template-columns: repeat(3, minmax(0, 110px));
    gap: 10px;
  }
`;

export const TableActionCard = styled.button`
  height: 74px;
  padding: 0 17px;
  border: 1px solid #e5e8ed;
  border-radius: 16px;
  background: #fff;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  color: #0f1113;
  text-align: left;

  .icon {
    width: 24px;
    height: 24px;
    color: var(--primary);
    display: grid;
    place-items: center;
  }

  .icon svg {
    width: 24px;
    height: 24px;
  }

  .copy {
    min-width: 0;
    display: grid;
    gap: 5px;
  }

  b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    line-height: 16px;
    font-weight: 650;
  }

  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #6b7380;
    font-size: 10.5px;
    line-height: 13px;
  }

  &:hover,
  &:focus-visible {
    border-color: color-mix(in srgb, var(--primary) 55%, #e5e8ed);
  }

  @media (max-width: 759px) {
    height: 50px;
    padding: 0 9px;
    border-radius: 14px;
    grid-template-columns: 22px minmax(0, 1fr);
    gap: 8px;

    .icon,
    .icon svg {
      width: 22px;
      height: 22px;
    }

    .copy {
      gap: 0;
    }

    b {
      font-size: 10.5px;
      line-height: 24px;
    }

    small {
      display: none;
    }
  }
`;

export const CatalogSection = styled.section`
  scroll-margin-top: 92px;
  margin: 48px 12px 0;

  @media (max-width: 759px) {
    margin: 42px 0 0;
  }
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

  @media (max-width: 350px) {
    grid-template-columns: 1fr;
  }
`;

export const CatalogCard = styled.article<{ $hasImage?: boolean }>`
  position: relative;
  min-width: 0;
  min-height: ${({ $hasImage }) => ($hasImage ? '0' : '132px')};
  overflow: hidden;
  border: 1px solid #e5e8ed;
  border-radius: 18px;
  background: #fff;

  .media {
    height: 158px;
    overflow: hidden;
    background: var(--soft);
  }

  .media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .copy {
    padding: ${({ $hasImage }) => ($hasImage ? '12px 48px 14px 14px' : '22px 48px 18px 14px')};
    display: grid;
    gap: 5px;
  }

  h3 {
    margin: 0;
    color: #0f1113;
    font-size: 15px;
    line-height: 19px;
    font-weight: 750;
  }

  p {
    margin: 0;
    min-height: 30px;
    color: #6b7380;
    font-size: 11px;
    line-height: 15px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .price {
    color: var(--primary);
    font-size: 16px;
    line-height: 20px;
    font-weight: 800;
  }

  .original {
    color: #9298a3;
    font-size: 10px;
    text-decoration: line-through;
  }

  .main {
    position: absolute;
    inset: 0;
    z-index: 2;
    border: 0;
    background: transparent;
  }

  .add {
    position: absolute;
    z-index: 3;
    right: 12px;
    bottom: 12px;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: var(--primary);
    color: #fff;
    display: grid;
    place-items: center;
  }

  @media (max-width: 759px) {
    border-radius: 14px;

    .media {
      height: 112px;
    }

    .copy {
      padding: ${({ $hasImage }) => ($hasImage ? '10px 40px 11px 10px' : '15px 40px 15px 10px')};
    }

    h3 {
      font-size: 12px;
      line-height: 16px;
    }

    p {
      min-height: 26px;
      font-size: 9.5px;
      line-height: 13px;
    }

    .price {
      font-size: 14px;
      line-height: 18px;
    }

    .add {
      width: 28px;
      height: 28px;
      right: 9px;
      bottom: 9px;
    }
  }
`;

export const EmptyCatalog = styled.div`
  padding: 26px 18px;
  border: 1px dashed #d9dde3;
  border-radius: 16px;
  background: #fff;
  color: #6b7380;
  text-align: center;
  font-size: 13px;
`;

export const BottomNav = styled.nav`
  display: none;
`;
