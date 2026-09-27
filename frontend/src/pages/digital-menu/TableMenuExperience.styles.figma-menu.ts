import styled from 'styled-components';

function tableFontStack(fontFamily?: string) {
  if (fontFamily === 'Manrope') return 'Manrope, ui-sans-serif, system-ui, sans-serif';
  if (fontFamily === 'DM Sans') return "'DM Sans', ui-sans-serif, system-ui, sans-serif";
  return 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
}

export const FigmaShell = styled.main<{ $primary: string; $fontFamily?: string }>`
  --primary: ${({ $primary }) => $primary};
  --text: #111111;
  --muted: #6b7280;
  --line: #e5e7eb;
  --soft: #f8f8f8;
  min-height: 100vh;
  overflow-x: hidden;
  background: #ffffff;
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

  img {
    display: block;
    max-width: 100%;
  }
`;

export const FigmaHeader = styled.header<{ $hasTitle?: boolean }>`
  position: sticky;
  top: 0;
  z-index: 32;
  width: 100%;
  min-height: 78px;
  padding: 0 40px;
  border-bottom: 1px solid #f0f0f1;
  background: rgba(255, 255, 255, 0.97);
  backdrop-filter: blur(18px);
  display: grid;
  grid-template-columns: minmax(330px, 1fr) auto minmax(230px, 1fr);
  align-items: center;
  gap: 24px;

  .left {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 40px;
  }

  .mobile-back {
    display: none;
  }

  .context-title {
    min-width: 0;
    color: #303036;
    font-size: 16px;
    font-weight: 800;
    white-space: nowrap;
  }

  nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 28px;
  }

  nav button {
    padding: 8px 0;
    border: 0;
    background: transparent;
    color: #66666e;
    font-size: 13px;
    font-weight: 750;
  }

  nav button.active {
    color: var(--primary);
  }

  .right {
    justify-self: end;
  }

  @media (max-width: 759px) {
    position: relative;
    min-height: 76px;
    padding: 0 18px;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    border-bottom-color: #f3f3f4;
    backdrop-filter: none;

    .left {
      gap: 12px;
    }

    .mobile-back {
      width: 30px;
      height: 30px;
      padding: 0;
      border: 0;
      border-radius: 9px;
      background: transparent;
      color: #111;
      display: grid;
      place-items: center;
      flex: 0 0 30px;
    }

    .context-title {
      font-size: 18px;
      line-height: 1;
    }

    nav {
      display: none;
    }

    ${({ $hasTitle }) =>
      $hasTitle &&
      `
        .brand {
          display: none;
        }
      `}
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
    border-radius: 50%;
    object-fit: cover;
  }

  .mark {
    display: grid;
    place-items: center;
    background: var(--primary);
    color: #fff;
    font-size: 15px;
    font-weight: 950;
  }

  .name {
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 0;
    overflow: hidden;
  }

  .name b {
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 22px;
    line-height: 1;
    font-weight: 900;
  }

  @media (max-width: 759px) {
    gap: 10px;

    .mark,
    img {
      width: 40px;
      height: 40px;
      flex-basis: 40px;
    }

    .name b {
      max-width: 170px;
      font-size: 19px;
    }
  }

  @media (max-width: 360px) {
    .name b {
      max-width: 135px;
      font-size: 17px;
    }
  }
`;

export const FigmaTablePill = styled.div`
  min-width: 170px;
  min-height: 46px;
  padding: 0 16px;
  border: 1px solid color-mix(in srgb, var(--primary) 24%, #e8e8eb);
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 4%, #fff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #151515;
  font-size: 14px;
  font-weight: 850;

  svg {
    color: var(--primary);
  }

  @media (max-width: 759px) {
    min-width: 96px;
    min-height: 42px;
    padding: 0 12px;
    gap: 6px;
    font-size: 12px;

    svg {
      width: 18px;
      height: 18px;
    }
  }
`;

export const MenuPage = styled.section`
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 18px 38px 72px;

  @media (max-width: 759px) {
    padding: 0 20px calc(104px + env(safe-area-inset-bottom, 0px));
  }

  @media (max-width: 359px) {
    padding-inline: 14px;
  }
`;

export const MenuHero = styled.section`
  position: relative;
  min-height: 380px;
  overflow: hidden;
  border-radius: 22px;
  background: #16110f;
  color: #fff;

  > img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(10, 8, 7, 0.94) 0%, rgba(10, 8, 7, 0.78) 34%, rgba(10, 8, 7, 0.23) 66%, rgba(10, 8, 7, 0.03) 100%);
  }

  .copy {
    position: relative;
    z-index: 2;
    width: min(600px, 58%);
    min-height: inherit;
    padding: 38px 32px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
  }

  .eyebrow {
    margin-bottom: 10px;
    color: color-mix(in srgb, var(--primary) 84%, #fff);
    font-size: 13px;
    line-height: 1.2;
    font-weight: 850;
    letter-spacing: 0.22em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    max-width: 560px;
    font-size: clamp(42px, 4.2vw, 62px);
    line-height: 0.98;
    letter-spacing: -0.035em;
    font-weight: 900;
  }

  p {
    max-width: 500px;
    margin: 16px 0 24px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 18px;
    line-height: 1.35;
  }

  .cta {
    min-width: 250px;
    min-height: 54px;
    padding: 0 24px;
    border: 0;
    border-radius: 999px;
    background: var(--primary);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-size: 18px;
    font-weight: 850;
  }

  .indicators {
    position: absolute;
    z-index: 3;
    right: 18px;
    bottom: 16px;
    display: inline-flex;
    gap: 5px;
  }

  .indicators i {
    width: 18px;
    height: 3px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.45);
  }

  .indicators i.active {
    background: #fff;
  }

  @media (max-width: 759px) {
    min-height: 212px;
    border-radius: 18px;

    .copy {
      width: 72%;
      padding: 18px;
      justify-content: flex-start;
    }

    .eyebrow {
      margin-bottom: 4px;
      font-size: 9px;
      letter-spacing: 0.12em;
    }

    h1 {
      max-width: 230px;
      font-size: clamp(24px, 7.6vw, 32px);
      line-height: 1;
    }

    p {
      max-width: 230px;
      margin: 8px 0 12px;
      font-size: 11px;
      line-height: 1.35;
    }

    .cta {
      min-width: 136px;
      min-height: 36px;
      padding: 0 14px;
      gap: 7px;
      font-size: 11px;
    }

    .cta svg {
      width: 15px;
      height: 15px;
    }

    .indicators {
      right: 10px;
      bottom: 9px;
    }
  }
`;

export const SectionHeading = styled.header`
  min-height: 38px;
  margin: 18px 0 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;

  .title {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  h2 {
    margin: 0;
    font-size: clamp(21px, 2vw, 28px);
    line-height: 1.05;
    font-weight: 900;
    letter-spacing: -0.025em;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
  }

  button {
    flex: 0 0 auto;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--primary);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 850;
  }

  @media (max-width: 759px) {
    min-height: 25px;
    margin: 20px 0 9px;

    h2 {
      font-size: 20px;
    }

    p {
      font-size: 10px;
    }

    button {
      font-size: 11px;
    }
  }
`;

export const ComboRail = styled.div`
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(220px, 1fr);
  gap: 14px;
  overflow-x: auto;
  padding: 1px 1px 7px;
  scroll-snap-type: x proximity;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (min-width: 1100px) {
    grid-auto-flow: initial;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    overflow: visible;
  }

  @media (max-width: 759px) {
    margin-right: -20px;
    grid-auto-columns: 165px;
    gap: 12px;
    padding-right: 20px;
  }

  @media (max-width: 359px) {
    margin-right: -14px;
    padding-right: 14px;
    grid-auto-columns: 155px;
  }
`;

export const ComboCard = styled.article<{ $hasImage?: boolean }>`
  position: relative;
  min-width: 0;
  min-height: ${({ $hasImage }) => ($hasImage ? '192px' : '132px')};
  overflow: hidden;
  border: 1px solid #eeeeef;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 5px 18px rgba(25, 25, 30, 0.06);
  scroll-snap-align: start;

  .media {
    height: 130px;
    overflow: hidden;
    background: var(--soft);
  }

  .media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .copy {
    padding: ${({ $hasImage }) => ($hasImage ? '12px 48px 14px 14px' : '20px 48px 20px 14px')};
    display: grid;
    align-content: start;
    gap: 4px;
  }

  h3 {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 16px;
    line-height: 1.15;
    font-weight: 850;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.32;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .price {
    margin-top: 5px;
    color: var(--primary);
    font-size: 19px;
    line-height: 1;
    font-weight: 900;
  }

  .add {
    position: absolute;
    right: 10px;
    bottom: 10px;
    width: 38px;
    height: 38px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--primary);
    color: #fff;
    display: grid;
    place-items: center;
  }

  .main {
    position: absolute;
    inset: 0;
    z-index: 1;
    border: 0;
    background: transparent;
  }

  .add {
    z-index: 2;
  }

  @media (max-width: 759px) {
    min-height: ${({ $hasImage }) => ($hasImage ? '192px' : '116px')};

    .media {
      height: 96px;
    }

    .copy {
      padding: ${({ $hasImage }) => ($hasImage ? '10px 42px 11px 12px' : '16px 42px 16px 12px')};
      gap: 2px;
    }

    h3 {
      font-size: 14px;
    }

    p {
      font-size: 10px;
      -webkit-line-clamp: 1;
    }

    .price {
      margin-top: 4px;
      font-size: 16px;
    }

    .add {
      width: 30px;
      height: 30px;
      right: 12px;
      bottom: 12px;
    }

    .add svg {
      width: 17px;
      height: 17px;
    }
  }
`;

export const MenuSearch = styled.label`
  min-height: 58px;
  margin-top: 20px;
  padding: 0 18px;
  border-radius: 999px;
  background: #f5f5f6;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  color: #111;

  input {
    min-width: 0;
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: #111;
    font-size: 15px;
  }

  input::placeholder {
    color: #8b90a0;
  }

  @media (max-width: 759px) {
    min-height: 50px;
    margin-top: 16px;
    padding: 0 14px;
    gap: 10px;

    input {
      font-size: 12px;
    }
  }
`;

export const CategoryRail = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 12px;
  margin-top: 12px;

  @media (max-width: 759px) {
    display: flex;
    gap: 12px;
    margin-right: -20px;
    padding-right: 20px;
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

export const CategoryPill = styled.button<{ $active?: boolean }>`
  min-height: 64px;
  padding: 8px 14px;
  border: 1px solid ${({ $active }) => ($active ? 'var(--primary)' : '#e6e7ea')};
  border-radius: 13px;
  background: ${({ $active }) =>
    $active ? 'color-mix(in srgb, var(--primary) 5%, #fff)' : '#fff'};
  color: ${({ $active }) => ($active ? 'var(--primary)' : '#151515')};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-size: 14px;
  font-weight: 800;
  white-space: nowrap;

  img {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    object-fit: cover;
  }

  @media (max-width: 759px) {
    min-width: 80px;
    min-height: 46px;
    flex: 0 0 auto;
    padding: 7px 12px;
    border-radius: 10px;
    font-size: 11px;

    img {
      width: 24px;
      height: 24px;
    }
  }
`;

export const TableActionsSection = styled.section`
  margin-top: 24px;

  h2 {
    margin: 0 0 10px;
    font-size: 20px;
    line-height: 1;
    font-weight: 900;
  }
`;

export const TableActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 759px) {
    gap: 10px;
  }
`;

export const TableActionCard = styled.button`
  min-height: 72px;
  padding: 12px 16px;
  border: 0;
  border-radius: 15px;
  background: color-mix(in srgb, var(--primary) 4%, #fafafa);
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  color: #111;
  text-align: left;

  .icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--primary) 9%, #fff);
    color: var(--primary);
    display: grid;
    place-items: center;
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
    font-size: 14px;
  }

  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--muted);
    font-size: 11px;
  }

  > svg {
    color: var(--primary);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  @media (max-width: 759px) {
    min-height: 50px;
    padding: 8px 9px;
    border-radius: 12px;
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 7px;

    .icon {
      width: 24px;
      height: 24px;
      border-radius: 7px;
    }

    .icon svg {
      width: 16px;
      height: 16px;
    }

    .copy {
      gap: 0;
    }

    b {
      font-size: 10px;
    }

    small,
    > svg {
      display: none;
    }
  }
`;

export const CatalogSection = styled.section`
  scroll-margin-top: 92px;
  margin-top: 26px;
`;

export const CatalogGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1050px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 759px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

export const CatalogCard = styled.article<{ $hasImage?: boolean }>`
  position: relative;
  min-width: 0;
  min-height: ${({ $hasImage }) => ($hasImage ? '0' : '128px')};
  overflow: hidden;
  border: 1px solid #ededf0;
  border-radius: 15px;
  background: #fff;

  .media {
    height: 160px;
    overflow: hidden;
    background: var(--soft);
  }

  .media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .copy {
    padding: ${({ $hasImage }) => ($hasImage ? '12px 48px 13px 13px' : '18px 48px 18px 13px')};
    display: grid;
    gap: 5px;
  }

  h3 {
    margin: 0;
    font-size: 15px;
    line-height: 1.18;
    font-weight: 850;
  }

  p {
    margin: 0;
    min-height: 34px;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .price {
    color: var(--primary);
    font-size: 16px;
    font-weight: 900;
  }

  .original {
    color: #96969d;
    font-size: 10px;
    font-weight: 650;
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
    right: 11px;
    bottom: 11px;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--primary);
    color: #fff;
    display: grid;
    place-items: center;
  }

  @media (max-width: 759px) {
    .media {
      height: 112px;
    }

    .copy {
      padding: ${({ $hasImage }) => ($hasImage ? '10px 40px 11px 10px' : '14px 40px 14px 10px')};
    }

    h3 {
      font-size: 12px;
    }

    p {
      min-height: 28px;
      font-size: 9px;
    }

    .price {
      font-size: 14px;
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
  padding: 28px 18px;
  border: 1px dashed #dfe0e4;
  border-radius: 14px;
  color: var(--muted);
  text-align: center;
  font-size: 13px;
`;

export const BottomNav = styled.nav`
  display: none;

  @media (max-width: 759px) {
    position: fixed;
    z-index: 40;
    left: 0;
    right: 0;
    bottom: 0;
    min-height: calc(72px + env(safe-area-inset-bottom, 0px));
    padding: 7px 24px env(safe-area-inset-bottom, 0px);
    border-top: 1px solid #ececf0;
    background: rgba(255, 255, 255, 0.98);
    grid-template-columns: repeat(3, 1fr);
    align-items: center;
    backdrop-filter: blur(16px);
    display: grid;

    button {
      position: relative;
      min-height: 56px;
      padding: 4px 0;
      border: 0;
      background: transparent;
      color: #7a8293;
      display: grid;
      justify-items: center;
      align-content: center;
      gap: 3px;
      font-size: 10px;
      font-weight: 750;
    }

    button.active {
      color: var(--primary);
    }

    button.active::after {
      content: '';
      position: absolute;
      left: 22%;
      right: 22%;
      bottom: 0;
      height: 3px;
      border-radius: 99px;
      background: var(--primary);
    }

    svg {
      width: 22px;
      height: 22px;
    }
  }
`;

