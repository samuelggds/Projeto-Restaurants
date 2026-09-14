import styled from 'styled-components';
import { SectionHeading } from './SuperAdminComponents.styles';

export const Root = styled.div`
  --brand: #233f32;
  --brand-ink: color-mix(in srgb, var(--brand) 78%, #122e22);
  --ink: #1c3028;
  --muted: #647568;
  --border: #dfe5dd;
  --surface: #fffefb;
  --focus: #658568;
  min-height: 100vh;
  min-height: 100dvh;
  background: #f5f6f2;
  color: var(--ink);
  display: grid;
  grid-template-columns: 256px minmax(0, 1fr);
  font-family:
    'Manrope',
    ui-sans-serif,
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  h1,
  h2,
  h3,
  h4 {
    font-family: inherit;
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  button,
  input,
  select,
  textarea {
    font: inherit;
  }
  button,
  a,
  input,
  select,
  textarea {
    &:focus-visible {
      outline: 3px solid var(--focus);
      outline-offset: 3px;
    }
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  button {
    touch-action: manipulation;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  @media (max-width: 860px) {
    display: block;
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

export const Sidebar = styled.aside<{ $open: boolean }>`
  position: sticky;
  top: 0;
  height: 100dvh;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  scrollbar-width: thin;
  scrollbar-color: #5c7062 transparent;
  background: #1c352b;
  color: #fff;
  padding: 30px 16px 20px;
  display: flex;
  flex-direction: column;
  z-index: 80;
  @media (max-width: 860px) {
    position: fixed;
    inset: 0 auto 0 0;
    width: min(88vw, 310px);
    transform: translateX(${(p) => (p.$open ? '0' : '-105%')});
    visibility: ${(p) => (p.$open ? 'visible' : 'hidden')};
    pointer-events: ${(p) => (p.$open ? 'auto' : 'none')};
    transition:
      transform 0.22s ease,
      visibility 0.22s;
    box-shadow: 24px 0 70px #10251b35;
    padding-top: 32px;
  }
`;

export const Brand = styled.div`
  padding: 1px 12px 26px;
  border-bottom: 1px solid #ffffff14;
  span {
    display: flex;
    align-items: center;
    gap: 11px;
    font:
      700 21px/1.3 'Manrope',
      sans-serif;
    letter-spacing: -0.04em;
    overflow-wrap: anywhere;
    color: #fff;
  }
  img {
    flex-shrink: 0;
    object-fit: contain;
    filter: invert(1);
    mix-blend-mode: screen;
  }
  small {
    display: block;
    color: #b1c2b4;
    font-size: 10px;
    line-height: 1.6;
    letter-spacing: 0.16em;
    margin-top: 13px;
  }
`;

export const Nav = styled.nav`
  display: grid;
  gap: 5px;
  margin: 12px 0 28px;
  .nav-label {
    display: block;
    padding: 17px 14px 7px;
    color: #a7bdad;
    font-size: 10px;
    line-height: 1.5;
    font-weight: 600;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }
  button {
    min-height: 46px;
    min-width: 0;
    border: 1px solid transparent;
    border-radius: 11px;
    background: transparent;
    color: #d2ded4;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 13px;
    cursor: pointer;
    text-align: left;
    font-size: 12px;
    line-height: 1.5;
    font-weight: 550;
    transition:
      background 0.16s,
      color 0.16s;
  }
  button:hover {
    background: #ffffff0b;
    color: #fff;
  }
  button.active {
    color: #203d2f;
    background: #e0eabb;
    border-color: #e7eece;
    font-weight: 750;
    box-shadow: 0 3px 12px #0c241b18;
  }
  button > span:not(.nav-indicator) {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .nav-indicator {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
    margin-left: auto;
  }
  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    stroke-width: 1.7;
  }
`;

export const User = styled.div`
  margin-top: auto;
  border-top: 1px solid #ffffff17;
  padding: 20px 4px 0;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 10px;
  .avatar {
    width: 38px;
    height: 38px;
    background: #ffffff0d;
    border: 1px solid #ffffff26;
    border-radius: 12px;
    display: grid;
    place-items: center;
    color: #e5eeca;
    font-size: 14px;
  }
  .info {
    display: grid;
    min-width: 0;
    gap: 5px;
  }
  .info b {
    font-size: 12px;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  .info small {
    font-size: 10px;
    color: #aec0b2;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .logout {
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: #c0d0c4;
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .logout:hover {
    color: #fff;
    background: #ffffff0b;
  }
  svg {
    width: 18px;
    height: 18px;
  }
`;

export const Close = styled.button`
  display: none;
  position: absolute;
  right: 10px;
  top: 8px;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 10px;
  background: #ffffff0e;
  color: #fff;
  cursor: pointer;
  @media (max-width: 860px) {
    display: grid;
    place-items: center;
  }
`;

export const Overlay = styled.div`
  display: none;
  @media (max-width: 860px) {
    display: block;
    position: fixed;
    inset: 0;
    background: #11291c66;
    backdrop-filter: blur(3px);
    z-index: 70;
  }
`;

export const Main = styled.main`
  min-width: 0;
`;

export const Header = styled.header`
  min-height: 120px;
  background: #fffefbef;
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--border);
  padding: 24px 34px;
  display: flex;
  align-items: center;
  gap: 18px;
  position: sticky;
  top: 0;
  z-index: 30;
  .title {
    min-width: 0;
  }
  .crumb {
    display: block;
    font-size: 10px;
    line-height: 1.5;
    font-weight: 700;
    color: var(--muted);
    letter-spacing: 0.09em;
  }
  .title h1 {
    margin: 7px 0 5px;
    font-size: clamp(24px, 2vw, 30px);
    font-weight: 700;
    letter-spacing: -0.055em;
    line-height: 1.2;
  }
  .title p {
    margin: 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.6;
  }
  .header-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 10px;
    flex-shrink: 0;
  }
  .quick-search {
    border: 1px solid var(--border);
    background: #f2f5ed;
    color: #4b624f;
    border-radius: 11px;
    min-height: 44px;
    cursor: pointer;
    padding: 10px 12px;
    font-size: 12px;
    line-height: 1.4;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .quick-search svg {
    flex-shrink: 0;
    width: 13px;
    height: 13px;
  }
  .quick-search kbd {
    padding: 2px 5px;
    border: 1px solid #d8e0d1;
    border-radius: 5px;
    font-family: inherit;
    font-size: 10px;
  }
  .primary {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid transparent;
    border-radius: 11px;
    background: var(--brand-ink);
    color: #fff;
    padding: 0 16px;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.5;
    white-space: nowrap;
    cursor: pointer;
    box-shadow: 0 4px 10px #213b2812;
    transition: filter 0.15s;
  }
  .primary:hover {
    filter: brightness(0.94);
  }
  @media (max-width: 1250px) {
    .quick-search span,
    .quick-search kbd {
      display: none;
    }
  }
  @media (max-width: 1000px) {
    padding: 22px 25px;
  }
  @media (max-width: 680px) {
    min-height: 0;
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr);
    gap: 12px;
    padding: 16px;
    .title h1 {
      margin: 4px 0 0;
      font-size: 24px;
    }
    .title p {
      display: none;
    }
    .crumb {
      font-size: 9px;
      letter-spacing: 0.06em;
    }
    .header-actions {
      grid-column: 1 / -1;
      margin-left: 0;
      width: 100%;
    }
    .primary {
      flex: 1;
      min-height: 44px;
    }
  }
`;

export const MobileMenu = styled.button`
  display: none;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
  @media (max-width: 860px) {
    display: grid;
    place-items: center;
  }
`;

export const Content = styled.div`
  width: 100%;
  max-width: 1480px;
  margin: auto;
  padding: 28px 34px 70px;
  @media (max-width: 1000px) {
    padding: 24px 25px 60px;
  }
  @media (max-width: 650px) {
    padding: 18px 14px 48px;
  }
`;

export const Metrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 195px), 1fr));
  gap: 15px;
  margin-bottom: 4px;
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

export const Metric = styled.article`
  min-width: 0;
  min-height: 172px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
  padding: 22px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  box-shadow: 0 3px 10px #213b2803;
  i {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 11px;
    background: #edf1e6;
    color: var(--brand);
    display: grid;
    place-items: center;
    font-style: normal;
  }
  i svg {
    width: 20px;
    height: 20px;
    stroke-width: 1.7;
  }
  .copy {
    display: grid;
    min-width: 0;
    gap: 8px;
  }
  .copy span {
    font-size: 12px;
    line-height: 1.5;
    color: var(--muted);
  }
  .copy b {
    font-size: clamp(25px, 2.2vw, 32px);
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: -0.045em;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
  }
  .copy small {
    font-size: 11px;
    line-height: 1.5;
    color: var(--muted);
  }
  @media (max-width: 480px) {
    min-height: 120px;
    flex-direction: row;
    gap: 16px;
    padding: 20px;
    i {
      margin-top: 2px;
    }
  }
`;

export const Toolbar = styled.div`
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  padding: 14px;
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  input,
  select,
  button {
    min-width: 0;
    height: 44px;
    border: 1px solid var(--border);
    border-radius: 11px;
    background: #fff;
    color: var(--ink);
    padding: 0 13px;
    font-size: 12px;
  }
  input {
    flex: 1;
    min-width: 160px;
    background: #f8faf5;
  }
  input::placeholder {
    color: #738171;
    opacity: 1;
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    cursor: pointer;
    font-weight: 650;
  }
  button:hover {
    background: #f2f5ed;
  }
  @media (max-width: 1080px) {
    flex-wrap: wrap;
    input {
      flex-basis: 100%;
    }
  }
  @media (max-width: 720px) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    input {
      grid-column: 1 / -1;
    }
  }
  @media (max-width: 440px) {
    grid-template-columns: minmax(0, 1fr);
    input {
      grid-column: auto;
    }
  }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(290px, 0.75fr);
  gap: 20px;
  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const Card = styled.section`
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--surface);
  padding: 25px;
  box-shadow: 0 3px 12px #213b2803;
  > ${SectionHeading} {
    margin-bottom: 22px;
  }
  > header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
  }
  h2 {
    font-size: 19px;
    font-weight: 700;
    line-height: 1.35;
    letter-spacing: -0.035em;
    margin: 0;
  }
  header p {
    font-size: 12px;
    line-height: 1.6;
    color: var(--muted);
    margin: 6px 0 0;
  }
  @media (max-width: 520px) {
    padding: 20px 16px;
    border-radius: 17px;
  }
`;

export const Table = styled.div`
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 14px;
  .row {
    min-width: 800px;
    display: grid;
    grid-template-columns:
      minmax(0, 1.35fr) minmax(0, 1.2fr) minmax(0, 0.8fr) minmax(0, 0.8fr)
      minmax(0, 0.95fr) minmax(0, 0.85fr);
    align-items: center;
    gap: 14px;
    padding: 17px 18px;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    line-height: 1.55;
  }
  .row > * {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .row:last-child {
    border-bottom: 0;
  }
  .row:not(.head):hover {
    background: #f9faf5;
  }
  .head {
    background: #f1f4ec;
    color: #5e705f;
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 0.035em;
  }
  .name {
    display: grid;
    gap: 5px;
  }
  .name b {
    font-size: 12px;
    font-weight: 700;
    color: var(--ink);
  }
  .name small {
    color: var(--muted);
    font-size: 11px;
  }
  .action {
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #fff;
    min-height: 44px;
    padding: 7px 10px;
    color: var(--brand-ink);
    font-size: 11px;
    line-height: 1.5;
    font-weight: 700;
    cursor: pointer;
  }
  .action:hover {
    background: #ecf1e6;
    border-color: #c7d3c0;
  }
  @media (max-width: 650px) {
    overflow: visible;
    border: 0;
    border-radius: 0;
    .head {
      display: none;
    }
    .row {
      min-width: 0;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: start;
      gap: 17px 14px;
      margin-bottom: 12px;
      padding: 18px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: #fff;
    }
    .row:last-child {
      border-bottom: 1px solid var(--border);
      margin-bottom: 0;
    }
    .row > [data-label]::before {
      content: attr(data-label);
      display: block;
      margin-bottom: 6px;
      color: var(--muted);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.035em;
      text-transform: uppercase;
    }
    .action {
      grid-column: 1 / -1;
      min-height: 44px;
      font-size: 12px;
    }
  }
  @media (max-width: 360px) {
    .row {
      grid-template-columns: minmax(0, 1fr);
      padding: 16px;
    }
    .action {
      grid-column: auto;
    }
  }
`;

export const Badge = styled.span<{ $tone?: 'green' | 'red' | 'yellow' | 'blue' | 'gray' }>`
  display: inline-flex;
  align-items: center;
  width: fit-content;
  max-width: 100%;
  padding: 5px 9px;
  border-radius: 7px;
  font-size: 10px;
  font-weight: 750;
  line-height: 1.5;
  color: ${(p) => (p.$tone === 'green' ? '#32603f' : p.$tone === 'red' ? '#a74035' : p.$tone === 'yellow' ? '#86621e' : p.$tone === 'blue' ? '#3d6382' : '#5d695f')};
  background: ${(p) => (p.$tone === 'green' ? '#e8f1e4' : p.$tone === 'red' ? '#f9eae6' : p.$tone === 'yellow' ? '#f7f0d9' : p.$tone === 'blue' ? '#eaf0f5' : '#edf0e9')};
`;

export const Stack = styled.div`
  display: grid;
  gap: 12px;
`;

export const ListItem = styled.article`
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 13px;
  padding: 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  background: #fffefb;
  .info {
    display: grid;
    min-width: 0;
    gap: 6px;
  }
  .info b {
    font-size: 13px;
    font-weight: 700;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
  .info span {
    font-size: 11px;
    color: var(--muted);
    line-height: 1.6;
    overflow-wrap: anywhere;
  }
  > strong {
    font-size: 15px;
    font-variant-numeric: tabular-nums;
  }
  button {
    min-height: 44px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #fff;
    color: var(--brand);
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
  }
  @media (max-width: 380px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const Chart = styled.div`
  height: 250px;
  border-bottom: 1px solid #cfdbcc;
  margin: 35px 8px 35px;
  display: flex;
  align-items: end;
  justify-content: space-around;
  gap: 14px;
  padding: 0 12px;
  background-image: repeating-linear-gradient(
    to top,
    transparent,
    transparent calc(25% - 1px),
    #e6ebe280 calc(25% - 1px),
    #e6ebe280 25%
  );
  .bar {
    flex: 1;
    max-width: 54px;
    background: #839967;
    border: 1px solid #778e5e;
    border-bottom: 0;
    border-radius: 9px 9px 0 0;
    position: relative;
  }
  .bar:last-child {
    background: var(--brand);
    border-color: transparent;
  }
  .bar-value {
    position: absolute;
    top: -26px;
    left: 50%;
    transform: translateX(-50%);
    color: var(--ink);
    font-size: 12px;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    width: max-content;
    max-width: calc(100% + 12px);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bar span {
    position: absolute;
    bottom: -27px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
    line-height: 1.5;
    color: var(--muted);
    white-space: nowrap;
  }
  @media (max-width: 520px) {
    height: 205px;
    gap: 9px;
    padding-inline: 6px;
    margin-inline: 4px;
  }
`;

export const PlanGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 20px;
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 580px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const PlanCard = styled.article<{ $featured?: boolean }>`
  min-width: 0;
  border: 1px solid ${(p) => (p.$featured ? '#82966e' : 'var(--border)')};
  border-radius: 20px;
  background: ${(p) => (p.$featured ? '#f4f7ed' : 'var(--surface)')};
  box-shadow: ${(p) => (p.$featured ? '0 0 0 3px #e2e9d84d' : 'none')};
  padding: 25px;
  display: flex;
  flex-direction: column;
  min-height: 410px;
  h2 {
    margin: 0;
    font-size: 22px;
    letter-spacing: -0.04em;
    line-height: 1.3;
  }
  .price {
    font-size: 30px;
    font-weight: 750;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
    margin: 19px 0 14px;
    overflow-wrap: anywhere;
  }
  .price small {
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    letter-spacing: 0;
  }
  .features {
    display: grid;
    gap: 12px;
    border-top: 1px solid var(--border);
    padding-top: 20px;
    margin-top: 6px;
    margin-bottom: 25px;
    font-size: 12px;
    line-height: 1.6;
  }
  .features span::before {
    content: '✓';
    color: #4f7251;
    margin-right: 9px;
    font-weight: 750;
  }
  .edit {
    margin-top: auto;
    min-height: 44px;
    border: 1px solid #d2ddca;
    border-radius: 11px;
    background: #fff;
    color: var(--brand-ink);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }
  .edit:hover {
    background: #eaf0e1;
  }
  @media (max-width: 520px) {
    padding: 23px;
  }
`;

export const SettingsLayout = styled.div`
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 22px;
  > * {
    min-width: 0;
  }
  > :last-child {
    container-type: inline-size;
  }
  @media (max-width: 850px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const SettingsNav = styled.div`
  align-self: start;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
  padding: 14px;
  display: grid;
  align-content: start;
  gap: 7px;
  input {
    width: 100%;
    min-width: 0;
    height: 44px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: #f8faf5;
    color: var(--ink);
    padding: 0 12px;
    margin-bottom: 12px;
    font-size: 12px;
  }
  button {
    min-height: 44px;
    min-width: 0;
    border: 1px solid transparent;
    border-radius: 10px;
    background: transparent;
    color: var(--muted);
    text-align: left;
    padding: 10px 12px;
    font-size: 12px;
    line-height: 1.5;
    cursor: pointer;
  }
  button:hover {
    background: #f3f6ee;
    color: var(--ink);
  }
  .active {
    color: #355038;
    border-color: #dce6d1;
    background: #eaf0e0;
    font-weight: 750;
  }
`;

export const FormGrid = styled.div`
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  @container (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr);
  }
  @media (max-width: 700px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const FormCard = styled(Card)`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-content: start;
  gap: 16px;
  label {
    display: grid;
    min-width: 0;
    gap: 8px;
    font-size: 12px;
    font-weight: 650;
    line-height: 1.5;
  }
  input,
  select {
    width: 100%;
    min-width: 0;
    height: 44px;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0 12px;
    background: #fff;
    color: var(--ink);
    font-size: 13px;
    font-weight: 500;
  }
  .line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    font-size: 12px;
    line-height: 1.5;
  }
  .line > :first-child {
    min-width: 0;
  }
  .toggle {
    width: 44px;
    height: 25px;
    flex-shrink: 0;
    border: 0;
    border-radius: 99px;
    background: #c8d1c5;
    position: relative;
    cursor: pointer;
  }
  .toggle.on {
    background: var(--brand);
  }
  .toggle::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 19px;
    height: 19px;
    border-radius: 50%;
    background: #fff;
  }
  .toggle.on::after {
    left: 22px;
  }
`;

export const AccessDenied = styled.div`
  min-height: 100dvh;
  display: grid;
  place-content: center;
  text-align: center;
  gap: 16px;
  background: #f5f6f2;
  color: #1c3028;
  font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
  padding: 24px;
  svg {
    margin: auto;
    color: #a45c4a;
    width: 48px;
    height: 48px;
  }
  h1 {
    margin: 0;
    font-size: 28px;
    line-height: 1.25;
    letter-spacing: -0.04em;
  }
  p {
    color: #647568;
    max-width: 460px;
    font-size: 14px;
    line-height: 1.7;
  }
`;

export * from './SuperAdminCreate.styles';
export * from './SuperAdminComponents.styles';
