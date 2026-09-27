import styled from 'styled-components';

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
`;

export const FigmaHeader = styled.header<{ $hasTitle?: boolean }>`
  width: 100%;
  min-height: 68px;
  padding: 18px 48px;
  border-bottom: 1px solid var(--line);
  background: #fff;
  display: grid;
  grid-template-columns: minmax(430px, 1fr) auto minmax(190px, 1fr);
  align-items: center;
  gap: 24px;

  .left {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 48px;
  }

  .mobile-back {
    display: none;
  }

  .context-title {
    color: var(--text);
    font-size: 16px;
    font-weight: 700;
    white-space: nowrap;
  }

  nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 32px;
  }

  nav button {
    position: relative;
    padding: 5px 0;
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 14px;
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
    bottom: -5px;
    width: 16px;
    height: 2px;
    border-radius: 2px;
    background: var(--primary);
  }

  .right {
    justify-self: end;
  }

  @media (max-width: 759px) {
    min-height: 68px;
    padding: 16px 20px;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;

    .left {
      gap: 10px;
    }

    .mobile-back {
      width: 28px;
      height: 28px;
      padding: 0;
      border: 0;
      background: transparent;
      color: var(--text);
      display: grid;
      place-items: center;
      flex: 0 0 28px;
    }

    .context-title {
      font-size: 14px;
      font-weight: 700;
    }

    nav {
      display: none;
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
    font-size: 19px;
    font-weight: 700;
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
    font-weight: 500;
  }

  .name small {
    color: var(--muted);
    font-size: 11px;
    line-height: 14px;
    font-weight: 500;
  }

  @media (max-width: 759px) {
    gap: 10px;

    .mark,
    img {
      width: 32px;
      height: 32px;
      flex-basis: 32px;
      border-radius: 10px;
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
    }
  }
`;

export const FigmaTablePill = styled.div`
  min-width: 108px;
  min-height: 34px;
  padding: 7px 16px;
  border: 1px solid var(--primary);
  border-radius: 12px;
  background: color-mix(in srgb, var(--primary) 8%, #fff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--primary);
  font-size: 13px;
  font-weight: 700;

  svg {
    width: 14px;
    height: 14px;
  }

  @media (max-width: 759px) {
    min-width: 91px;
    min-height: 30px;
    padding: 6px 12px;
    gap: 4px;
    font-size: 11px;
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
    background: linear-gradient(168deg, rgba(0, 0, 0, 0.2) 24%, rgba(0, 0, 0, 0.5) 78%);
  }

  .copy {
    position: relative;
    z-index: 2;
    width: min(760px, calc(100% - 160px));
    height: 100%;
    margin-left: 80px;
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
  }

  h1 {
    width: min(760px, 100%);
    margin: 12px 0 0;
    color: #fff;
    font-size: 48px;
    line-height: 1.1;
    font-weight: 800;
    letter-spacing: -0.5px;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.65);
  }

  p {
    width: min(700px, 100%);
    margin: 10px 0 0;
    color: rgba(250, 250, 248, 0.78);
    font-size: 16px;
    line-height: 22px;
    font-weight: 500;
  }

  .cta {
    min-height: 42px;
    margin-top: auto;
    padding: 0 24px;
    border: 0;
    border-radius: 999px;
    background: var(--primary);
    color: #fff;
    font-size: 15px;
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
      max-width: 320px;
      font-size: 10px;
      line-height: 14px;
      letter-spacing: 1.5px;
    }

    h1 {
      width: 320px;
      max-width: 92%;
      margin-top: 4px;
      font-size: 26px;
      line-height: 1.2;
    }

    p {
      max-width: 230px;
      margin-top: auto;
      font-size: 13px;
      line-height: 17px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cta {
      position: absolute;
      right: 20px;
      bottom: 20px;
      min-height: 32px;
      padding: 0 16px;
      font-size: 12px;
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
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;

  @media (max-width: 759px) {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
`;

export const MenuSearch = styled.label`
  min-height: 48px;
  padding: 0 16px;
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
  }

  input::placeholder {
    color: var(--muted);
    opacity: 1;
  }

  @media (max-width: 759px) {
    min-height: 42px;
    padding: 0 14px;
    border-radius: 14px;

    input {
      font-size: 13px;
    }
  }
`;

export const CategoryRail = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 540px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 759px) {
    max-width: none;
    width: calc(100% + 20px);
    margin-right: -20px;
    padding-right: 20px;
  }
`;

export const CategoryPill = styled.button<{ $active?: boolean }>`
  min-height: 36px;
  padding: 0 20px;
  flex: 0 0 auto;
  border: 1px solid ${({ $active }) => ($active ? 'var(--primary)' : 'var(--line)')};
  border-radius: 999px;
  background: ${({ $active }) => ($active ? 'var(--primary)' : '#fff')};
  color: ${({ $active }) => ($active ? '#fff' : 'var(--text)')};
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  white-space: nowrap;

  @media (max-width: 759px) {
    min-height: 32px;
    padding: 0 14px;
  }
`;

export const SectionHeading = styled.header`
  width: 100%;
  display: flex;
  align-items: end;
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
    line-height: 38px;
    font-weight: 500;
    letter-spacing: -0.5px;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
    line-height: 18px;
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
    font-size: 12px;
    font-weight: 700;
  }

  @media (max-width: 759px) {
    align-items: center;

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

  @media (max-width: 1050px) and (min-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 759px) {
    width: calc(100% + 20px);
    margin-right: -20px;
    padding-right: 20px;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 165px;
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
    padding: 16px 46px 16px 16px;
    display: grid;
    gap: 7px;
  }

  h3 {
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
    font-size: 15px;
    line-height: 18px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 16px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .price {
    margin-top: 4px;
    color: var(--primary);
    font-size: 16px;
    line-height: 20px;
    font-weight: 500;
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

  @media (max-width: 759px) {
    border-radius: 16px;

    .media {
      height: 96px;
    }

    .copy {
      min-height: 92px;
      padding: 12px 38px 12px 12px;
      gap: 4px;
    }

    h3 {
      font-size: 13px;
    }

    p {
      font-size: 10px;
    }

    .price {
      font-size: 14px;
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

export const TableActionsSection = styled.section`
  width: 100%;
  display: grid;
  gap: 16px;

  h2 {
    margin: 0;
    color: var(--text);
    font-size: 22px;
    line-height: 28px;
    font-weight: 500;
  }

  @media (max-width: 759px) {
    gap: 12px;

    h2 {
      font-size: 20px;
      line-height: 24px;
    }
  }
`;

export const TableActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 759px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
`;

export const TableActionCard = styled.button`
  min-height: 62px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  text-align: left;

  .icon {
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
    color: var(--text);
    display: grid;
    place-items: center;
  }

  .icon svg {
    width: 18px;
    height: 18px;
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
    font-size: 13px;
    line-height: 16px;
    font-weight: 700;
  }

  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--muted);
    font-size: 10.5px;
  }

  &:hover,
  &:focus-visible {
    border-color: var(--primary);
  }

  @media (max-width: 759px) {
    min-height: 44px;
    padding: 12px;
    justify-content: flex-start;
    gap: 8px;

    .icon {
      width: 18px;
      height: 18px;
      flex-basis: 18px;
    }

    b {
      font-size: 11px;
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
