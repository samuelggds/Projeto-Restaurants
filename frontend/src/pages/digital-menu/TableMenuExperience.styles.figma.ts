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
  min-height: 192px;
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
    padding: 12px 48px 14px 14px;
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
    min-height: 192px;

    .media {
      height: 96px;
    }

    .copy {
      padding: 10px 42px 11px 12px;
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
    padding: 12px 48px 13px 13px;
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
      padding: 10px 40px 11px 10px;
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

export const FlowPage = styled.section`
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 42px 52px 72px;

  @media (max-width: 759px) {
    padding: 6px 20px 44px;
  }

  @media (max-width: 359px) {
    padding-inline: 14px;
  }
`;

export const FlowTitle = styled.header`
  margin-bottom: 24px;

  h1 {
    margin: 0;
    font-size: clamp(28px, 3.2vw, 44px);
    line-height: 1.05;
    letter-spacing: -0.03em;
    font-weight: 900;
  }

  p {
    max-width: 720px;
    margin: 8px 0 0;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.45;
  }

  @media (max-width: 759px) {
    margin: 4px 0 16px;

    h1 {
      font-size: 22px;
    }

    p {
      margin-top: 5px;
      font-size: 10px;
    }
  }
`;

export const CartDesktopLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 820px) minmax(320px, 1fr);
  gap: 42px;
  align-items: start;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

export const FlowCard = styled.section`
  border: 1px solid #e8e9ec;
  border-radius: 18px;
  background: #fff;
`;

export const CartLines = styled.div`
  display: grid;
  gap: 8px;
`;

export const CartLine = styled.article`
  min-height: 86px;
  padding: 10px 12px;
  border: 1px solid #ececf0;
  border-radius: 12px;
  background: #fff;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;

  .image {
    width: 66px;
    height: 66px;
    overflow: hidden;
    border-radius: 10px;
    background: var(--soft);
  }

  .image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .info {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .info b {
    font-size: 14px;
  }

  .info small {
    color: var(--muted);
    font-size: 10px;
    line-height: 1.35;
  }

  .side {
    display: grid;
    justify-items: end;
    gap: 8px;
  }

  .price {
    font-size: 13px;
    font-weight: 850;
    white-space: nowrap;
  }

  .remove {
    padding: 0;
    border: 0;
    background: transparent;
    color: #97979e;
  }

  @media (max-width: 759px) {
    min-height: 76px;
    padding: 10px;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 10px;

    .image {
      width: 56px;
      height: 56px;
      border-radius: 9px;
    }

    .info b {
      font-size: 11px;
    }

    .info small {
      font-size: 8px;
    }

    .price {
      font-size: 10px;
    }
  }
`;

export const QuantityControl = styled.div`
  width: max-content;
  display: inline-grid;
  grid-template-columns: 26px 24px 26px;
  border: 1px solid #e2e3e6;
  border-radius: 8px;
  overflow: hidden;

  button {
    width: 26px;
    height: 26px;
    padding: 0;
    border: 0;
    background: #fff;
    color: var(--primary);
    display: grid;
    place-items: center;
  }

  span {
    display: grid;
    place-items: center;
    font-size: 9px;
    font-weight: 850;
  }
`;

export const AddMoreButton = styled.button`
  width: 100%;
  min-height: 46px;
  margin-top: 18px;
  border: 1px solid #e2e3e6;
  border-radius: 11px;
  background: #fff;
  color: var(--primary);
  font-size: 12px;
  font-weight: 850;
`;

export const SummaryCard = styled(FlowCard)`
  padding: 20px;
  display: grid;
  gap: 12px;

  .row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
    color: #5f616a;
    font-size: 13px;
  }

  .row strong {
    color: #161616;
  }

  .divider {
    height: 1px;
    background: #ececf0;
  }

  .total {
    color: #111;
    font-size: 16px;
    font-weight: 850;
  }

  .total strong {
    color: var(--primary);
    font-size: 23px;
  }

  @media (max-width: 759px) {
    padding: 16px;
    border-radius: 13px;

    .row {
      font-size: 10px;
    }

    .total {
      font-size: 12px;
    }

    .total strong {
      font-size: 18px;
    }
  }
`;

export const PrimaryAction = styled.button`
  width: 100%;
  min-height: 52px;
  padding: 0 18px;
  border: 0;
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 900;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.52;
  }

  @media (max-width: 759px) {
    min-height: 54px;
    font-size: 12px;
  }
`;

export const SecondaryAction = styled.button`
  width: 100%;
  min-height: 52px;
  padding: 0 18px;
  border: 1px solid #dfe0e4;
  border-radius: 12px;
  background: #fff;
  color: #171717;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 850;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.52;
  }
`;

export const HelperText = styled.p`
  margin: 12px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.4;
  text-align: center;
`;

export const SuccessHero = styled.section`
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 10px;
  padding: 10px 0 22px;

  .ring {
    width: 112px;
    height: 112px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--primary) 7%, #fff);
    display: grid;
    place-items: center;
  }

  .check {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    background: #25ad53;
    color: #fff;
    display: grid;
    place-items: center;
  }

  h1 {
    margin: 2px 0 0;
    font-size: 28px;
    font-weight: 900;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }

  @media (max-width: 759px) {
    padding-top: 12px;

    .ring {
      width: 100px;
      height: 100px;
    }

    .check {
      width: 50px;
      height: 50px;
    }

    h1 {
      font-size: 22px;
    }

    p {
      max-width: 310px;
      font-size: 10px;
    }
  }
`;

export const OrderSummaryBar = styled(FlowCard)`
  min-height: 72px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;

  .label {
    display: grid;
    gap: 4px;
  }

  small {
    color: var(--muted);
    font-size: 11px;
  }

  strong {
    font-size: 21px;
  }

  .amount {
    color: var(--primary);
    font-size: 22px;
    font-weight: 900;
  }

  @media (max-width: 759px) {
    min-height: 58px;
    padding: 12px 16px;
    border-radius: 12px;

    small {
      font-size: 9px;
    }

    strong {
      font-size: 12px;
    }

    .amount {
      font-size: 16px;
    }
  }
`;

export const TimelineCard = styled(FlowCard)`
  padding: 20px;

  @media (max-width: 759px) {
    padding: 16px;
    border-radius: 13px;
  }
`;

export const Timeline = styled.div`
  display: grid;
`;

export const TimelineStep = styled.div<{ $active: boolean; $current?: boolean }>`
  position: relative;
  min-height: 64px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 14px;
  align-items: start;

  &:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 16px;
    top: 34px;
    width: 2px;
    height: 31px;
    background: ${({ $active }) => ($active ? 'var(--primary)' : '#e2e3e6')};
  }

  .dot {
    position: relative;
    z-index: 1;
    width: 34px;
    height: 34px;
    border: 2px solid ${({ $active }) => ($active ? 'var(--primary)' : '#dfe0e4')};
    border-radius: 50%;
    background: ${({ $active }) => ($active ? 'var(--primary)' : '#fff')};
    color: ${({ $active }) => ($active ? '#fff' : '#999ba3')};
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 900;
  }

  .copy {
    padding-top: 4px;
    display: grid;
    gap: 4px;
  }

  b {
    color: ${({ $active }) => ($active ? '#171717' : '#8d8f97')};
    font-size: 14px;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.35;
  }

  @media (max-width: 759px) {
    min-height: 44px;
    grid-template-columns: 24px minmax(0, 1fr);
    gap: 12px;

    &:not(:last-child)::after {
      left: 11px;
      top: 24px;
      height: 21px;
    }

    .dot {
      width: 24px;
      height: 24px;
      border-width: 1.5px;
      font-size: 8px;
    }

    .copy {
      padding-top: 1px;
    }

    b {
      font-size: 10px;
    }

    p {
      font-size: 8px;
    }
  }
`;

export const ConfirmationActions = styled.div`
  width: min(620px, 100%);
  margin: 28px auto 0;
  display: grid;
  gap: 12px;

  @media (max-width: 759px) {
    margin-top: 18px;
  }
`;

export const TrackingLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 680px) minmax(0, 604px);
  gap: 52px;
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

export const StatusCard = styled(FlowCard)`
  min-height: 152px;
  padding: 24px;
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: 18px;
  align-items: center;

  .icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    background: color-mix(in srgb, var(--primary) 8%, #fff);
    color: var(--primary);
    display: grid;
    place-items: center;
  }

  h2 {
    margin: 0 0 6px;
    font-size: 24px;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }

  @media (max-width: 759px) {
    min-height: 114px;
    padding: 18px;
    grid-template-columns: 54px minmax(0, 1fr);
    gap: 16px;
    border-radius: 14px;

    .icon {
      width: 54px;
      height: 54px;
      border-radius: 14px;
    }

    h2 {
      font-size: 18px;
    }

    p {
      font-size: 10px;
    }
  }
`;

export const OrderItemsCard = styled(FlowCard)`
  padding: 28px;

  h2 {
    margin: 0 0 20px;
    font-size: 24px;
  }

  @media (max-width: 759px) {
    padding: 16px;
    border-radius: 14px;

    h2 {
      margin-bottom: 10px;
      font-size: 18px;
    }
  }
`;

export const OrderItemLine = styled.article`
  min-height: 86px;
  padding: 12px;
  border: 1px solid #ececf0;
  border-radius: 12px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;

  & + & {
    margin-top: 12px;
  }

  .image {
    width: 62px;
    height: 62px;
    overflow: hidden;
    border-radius: 10px;
    background: var(--soft);
  }

  .image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .copy {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  b {
    font-size: 14px;
  }

  small {
    color: var(--muted);
    font-size: 10px;
    line-height: 1.35;
  }

  strong {
    font-size: 13px;
    white-space: nowrap;
  }

  @media (max-width: 759px) {
    min-height: 76px;
    padding: 10px;
    gap: 10px;

    .image {
      width: 56px;
      height: 56px;
    }

    b {
      font-size: 11px;
    }

    small {
      font-size: 8px;
    }

    strong {
      font-size: 10px;
    }
  }
`;

export const PaymentOptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 620px));
  gap: 44px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

export const PaymentChoiceCard = styled(FlowCard)`
  min-height: 300px;
  padding: 32px;
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  grid-template-rows: auto auto 1fr auto;
  column-gap: 26px;

  .icon {
    grid-row: 1 / span 3;
    width: 64px;
    height: 64px;
    border-radius: 17px;
    background: color-mix(in srgb, var(--primary) 7%, #fff);
    color: var(--primary);
    display: grid;
    place-items: center;
  }

  h2 {
    margin: 0;
    font-size: 26px;
  }

  p {
    margin: 8px 0 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.45;
  }

  small {
    margin-top: 12px;
    color: #777982;
    font-size: 11px;
  }

  button {
    grid-column: 1 / -1;
    align-self: end;
    width: 100%;
    min-height: 52px;
    border-radius: 11px;
    font-weight: 850;
  }

  .primary {
    border: 0;
    background: var(--primary);
    color: #fff;
  }

  .secondary {
    border: 1px solid #dfe0e4;
    background: #fff;
    color: #161616;
  }

  @media (max-width: 759px) {
    min-height: 146px;
    padding: 18px;
    grid-template-columns: 48px minmax(0, 1fr);
    column-gap: 16px;
    border-radius: 14px;

    .icon {
      width: 48px;
      height: 48px;
      border-radius: 13px;
    }

    h2 {
      font-size: 18px;
    }

    p {
      margin-top: 4px;
      font-size: 10px;
    }

    small {
      margin-top: 5px;
      font-size: 9px;
    }

    button {
      min-height: 40px;
      margin-top: 10px;
      font-size: 10px;
    }
  }
`;

export const PaymentSummary = styled(OrderSummaryBar)`
  margin-top: 48px;

  @media (max-width: 759px) {
    margin-top: 18px;
  }
`;

export const PixLayout = styled.div`
  display: grid;
  grid-template-columns: 560px minmax(0, 728px);
  gap: 48px;
  align-items: start;

  @media (max-width: 1050px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

export const PixQrCard = styled(FlowCard)`
  min-height: 760px;
  padding: 28px 32px;
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 12px;
  text-align: center;

  .amount {
    justify-self: start;
    color: #111;
    font-size: 38px;
    font-weight: 900;
  }

  .order {
    justify-self: start;
    color: var(--muted);
    font-size: 11px;
  }

  .qr {
    width: 350px;
    height: 350px;
    margin-top: 42px;
    padding: 24px;
    border: 1px solid #e4e5e8;
    border-radius: 18px;
    background: #fff;
    display: grid;
    place-items: center;
  }

  .qr svg {
    width: 100%;
    height: 100%;
  }

  .pix-badge {
    min-width: 150px;
    min-height: 42px;
    margin-top: 14px;
    border-radius: 999px;
    background: #eefbfa;
    color: #13a99b;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 12px;
    font-weight: 850;
  }

  @media (max-width: 759px) {
    min-height: 0;
    padding: 18px 16px;
    border: 0;
    border-radius: 0;

    .amount {
      font-size: 27px;
    }

    .order {
      font-size: 9px;
    }

    .qr {
      width: min(290px, 100%);
      height: auto;
      aspect-ratio: 1;
      margin-top: 14px;
      padding: 18px;
    }

    .pix-badge {
      min-width: 120px;
      min-height: 36px;
      margin-top: 4px;
      font-size: 10px;
    }
  }
`;

export const PixCopyBox = styled.div`
  width: 100%;
  min-height: 74px;
  margin-top: 22px;
  padding: 12px 12px 12px 16px;
  border: 1px solid #e2e3e6;
  border-radius: 12px;
  background: #fafafa;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  text-align: left;

  code {
    min-width: 0;
    max-height: 44px;
    overflow: hidden;
    word-break: break-all;
    color: #53555e;
    font-family: inherit;
    font-size: 10px;
    line-height: 1.35;
  }

  button {
    min-width: 76px;
    min-height: 44px;
    border: 0;
    border-radius: 9px;
    background: var(--primary);
    color: #fff;
    font-size: 10px;
    font-weight: 850;
  }

  @media (max-width: 759px) {
    min-height: 64px;
    margin-top: 8px;

    code {
      font-size: 8px;
    }

    button {
      min-width: 66px;
      min-height: 40px;
    }
  }
`;

export const PixSide = styled.div`
  display: grid;
  gap: 40px;

  @media (max-width: 759px) {
    gap: 16px;
  }
`;

export const PixStatusCard = styled(FlowCard)`
  min-height: 300px;
  padding: 30px;
  display: grid;
  align-content: start;
  gap: 14px;

  h2 {
    margin: 0;
    font-size: 30px;
  }

  p {
    margin: 0;
    max-width: 620px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }

  .timer {
    width: max-content;
    margin-top: 8px;
    padding: 8px 11px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--primary) 7%, #fff);
    color: var(--primary);
    font-size: 11px;
    font-weight: 850;
  }

  .buttons {
    margin-top: auto;
    display: grid;
    gap: 10px;
  }

  @media (max-width: 759px) {
    min-height: 0;
    padding: 18px;
    border-radius: 14px;

    h2 {
      font-size: 21px;
    }

    p {
      font-size: 10px;
    }
  }
`;

export const HowToPayCard = styled(FlowCard)`
  min-height: 420px;
  padding: 28px 30px;

  h2 {
    margin: 0 0 28px;
    font-size: 26px;
  }

  ol {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 28px;
  }

  li {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 20px;
    align-items: center;
    font-size: 13px;
    font-weight: 750;
  }

  li span {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--primary) 8%, #fff);
    color: var(--primary);
    display: grid;
    place-items: center;
    font-weight: 900;
  }

  @media (max-width: 759px) {
    min-height: 0;
    padding: 18px;
    border-radius: 14px;

    h2 {
      margin-bottom: 16px;
      font-size: 19px;
    }

    ol {
      gap: 14px;
    }

    li {
      grid-template-columns: 28px minmax(0, 1fr);
      gap: 12px;
      font-size: 10px;
    }

    li span {
      width: 28px;
      height: 28px;
    }
  }
`;

export const PaymentSuccessLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 780px) minmax(0, 514px);
  gap: 42px;
  align-items: start;

  @media (max-width: 1050px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

export const PaymentSuccessMain = styled(FlowCard)`
  min-height: 716px;
  padding: 54px 78px;
  display: grid;
  justify-items: center;
  align-content: start;
  text-align: center;

  .ring {
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: #eef9f1;
    display: grid;
    place-items: center;
  }

  .check {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: #28ad54;
    color: #fff;
    display: grid;
    place-items: center;
  }

  h1 {
    margin: 36px 0 0;
    font-size: 30px;
  }

  > p {
    margin: 18px 0 34px;
    color: var(--muted);
    font-size: 13px;
  }

  @media (max-width: 759px) {
    min-height: 0;
    padding: 24px 18px;
    border: 0;

    .ring {
      width: 132px;
      height: 132px;
    }

    .check {
      width: 64px;
      height: 64px;
    }

    h1 {
      margin-top: 24px;
      font-size: 23px;
    }

    > p {
      margin: 12px 0 20px;
      font-size: 10px;
    }
  }
`;

export const PaidReceipt = styled(FlowCard)`
  width: 100%;
  min-height: 144px;
  padding: 20px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  text-align: left;

  .copy {
    display: grid;
    gap: 8px;
  }

  small {
    color: var(--muted);
    font-size: 11px;
  }

  strong {
    font-size: 28px;
  }

  .status {
    min-width: 98px;
    min-height: 34px;
    border-radius: 999px;
    background: #eaf8ee;
    color: #198844;
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 900;
  }

  @media (max-width: 759px) {
    min-height: 122px;
    padding: 16px;

    small {
      font-size: 9px;
    }

    strong {
      font-size: 22px;
    }

    .status {
      min-width: 74px;
      min-height: 30px;
      font-size: 9px;
    }
  }
`;

export const PaymentSuccessSide = styled(FlowCard)`
  min-height: 716px;
  padding: 34px 32px;

  h2 {
    margin: 0 0 14px;
    font-size: 24px;
  }

  > p {
    margin: 0 0 30px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }

  @media (max-width: 759px) {
    min-height: 0;
    padding: 20px 18px;
    border-radius: 14px;

    h2 {
      font-size: 19px;
    }

    > p {
      margin-bottom: 18px;
      font-size: 10px;
    }
  }
`;
