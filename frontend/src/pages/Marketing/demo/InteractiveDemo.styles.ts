import styled from 'styled-components';

export const Root = styled.div`
  --demo-primary: #d64d08;
  --demo-primary-strong: #b83e04;
  --demo-bg: #f6f7f4;
  --demo-card: #ffffff;
  --demo-border: #e4ddd5;
  --demo-text: #191816;
  --demo-muted: #716d68;
  min-height: 100vh;
  background:
    linear-gradient(rgba(60, 48, 40, 0.026) 1px, transparent 1px),
    linear-gradient(90deg, rgba(60, 48, 40, 0.026) 1px, transparent 1px),
    var(--demo-bg);
  background-size: 32px 32px;
  color: var(--demo-text);
  font-family: 'DM Sans', Inter, system-ui, sans-serif;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  button,
  input,
  select {
    font: inherit;
  }

  button,
  select {
    cursor: pointer;
  }
`;

export const Topbar = styled.header`
  position: sticky;
  top: 0;
  z-index: 40;
  border-bottom: 1px solid rgba(228, 221, 213, 0.9);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(14px);
`;

export const TopbarInner = styled.div`
  width: min(calc(100% - 32px), 1180px);
  min-height: 72px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;

  @media (max-width: 720px) {
    width: min(calc(100% - 20px), 1180px);
    min-height: 64px;
  }
`;

export const Brand = styled.button`
  border: 0;
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  color: inherit;

  span:first-child {
    width: 38px;
    height: 38px;
    border-radius: 13px;
    display: grid;
    place-items: center;
    background: var(--demo-primary);
    color: #fff;
    font-family: Sora, sans-serif;
    font-weight: 800;
    box-shadow: 0 10px 24px rgba(214, 77, 8, 0.22);
  }

  b {
    display: block;
    font-family: Sora, sans-serif;
    font-size: 16px;
  }

  small {
    display: block;
    color: var(--demo-muted);
    font-size: 12px;
    text-align: left;
  }
`;

export const TopbarActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  @media (max-width: 680px) {
    .desktop-label {
      display: none;
    }
  }
`;

export const SoftButton = styled.button`
  min-height: 40px;
  border: 1px solid var(--demo-border);
  border-radius: 12px;
  padding: 0 14px;
  background: #fff;
  color: var(--demo-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 700;

  &:hover {
    border-color: #cabeb2;
    background: #fbfaf8;
  }
`;

export const PrimaryButton = styled.button`
  min-height: 42px;
  border: 0;
  border-radius: 12px;
  padding: 0 16px;
  background: var(--demo-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 800;
  box-shadow: 0 10px 24px rgba(214, 77, 8, 0.18);

  &:hover {
    background: var(--demo-primary-strong);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

export const DangerButton = styled(SoftButton)`
  color: #a72d22;
  border-color: #f1c9c5;
  background: #fff8f7;
`;

export const PublicPage = styled.main`
  width: min(calc(100% - 32px), 1180px);
  margin: 0 auto;
  padding: 42px 0 72px;

  @media (max-width: 720px) {
    width: min(calc(100% - 20px), 1180px);
    padding-top: 24px;
  }
`;

export const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(330px, 0.85fr);
  gap: 28px;
  align-items: stretch;
  margin-bottom: 28px;

  @media (max-width: 880px) {
    grid-template-columns: 1fr;
  }
`;

export const HeroCopy = styled.div`
  border: 1px solid var(--demo-border);
  border-radius: 24px;
  background: #fff;
  padding: clamp(24px, 5vw, 52px);
  box-shadow: 0 22px 55px rgba(46, 38, 31, 0.08);

  .eyebrow {
    width: fit-content;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 999px;
    padding: 7px 11px;
    background: #fff3ec;
    color: var(--demo-primary-strong);
    font-size: 13px;
    font-weight: 800;
    margin-bottom: 18px;
  }

  h1 {
    margin: 0;
    font-family: Sora, sans-serif;
    font-size: clamp(34px, 6vw, 58px);
    line-height: 1.02;
    letter-spacing: -0.045em;
    max-width: 760px;
  }

  h1 span {
    color: var(--demo-primary);
  }

  p {
    margin: 18px 0 0;
    color: var(--demo-muted);
    font-size: 17px;
    line-height: 1.7;
    max-width: 700px;
  }
`;

export const HeroPanel = styled.div`
  border-radius: 24px;
  background: #191816;
  color: #fff;
  padding: 26px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 24px;
  box-shadow: 0 22px 55px rgba(25, 24, 22, 0.18);

  small {
    color: #cabfb4;
  }

  h2 {
    margin: 8px 0;
    font-family: Sora, sans-serif;
    font-size: 25px;
  }

  p {
    color: #d9d0c8;
    line-height: 1.6;
  }
`;

export const RoleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
  }
`;

export const RolePill = styled.button<{ $active?: boolean }>`
  min-height: 64px;
  border: 1px solid ${({ $active }) => ($active ? '#f6a57d' : '#423d38')};
  border-radius: 14px;
  background: ${({ $active }) => ($active ? '#3b2419' : '#272421')};
  color: #fff;
  padding: 12px;
  text-align: left;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: center;

  svg {
    color: #ff8b52;
  }

  b,
  small {
    display: block;
  }

  small {
    margin-top: 2px;
    color: #c8bdb2;
    font-size: 11px;
  }
`;

export const IntroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
`;

export const InfoStrip = styled.section`
  margin-bottom: 28px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;

  div {
    border: 1px solid var(--demo-border);
    border-radius: 18px;
    padding: 18px;
    background: #fff;
  }

  b,
  span {
    display: block;
  }

  b {
    font-family: Sora, sans-serif;
    margin-bottom: 5px;
  }

  span {
    color: var(--demo-muted);
    font-size: 13px;
    line-height: 1.45;
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const AuthCard = styled.section`
  width: min(100%, 640px);
  margin: 0 auto;
  border: 1px solid var(--demo-border);
  border-radius: 24px;
  background: #fff;
  padding: clamp(20px, 4vw, 32px);
  box-shadow: 0 22px 55px rgba(46, 38, 31, 0.08);

  h1 {
    margin: 0 0 6px;
    font-family: Sora, sans-serif;
    font-size: clamp(28px, 5vw, 38px);
  }

  > p {
    color: var(--demo-muted);
    line-height: 1.6;
  }
`;

export const AuthTabs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 5px;
  border-radius: 14px;
  background: #f2eee9;
  margin: 22px 0;

  button {
    border: 0;
    border-radius: 10px;
    min-height: 40px;
    background: transparent;
    font-weight: 800;
  }

  button.active {
    background: #fff;
    box-shadow: 0 4px 16px rgba(35, 31, 28, 0.08);
  }
`;

export const Form = styled.form`
  display: grid;
  gap: 14px;

  label {
    display: grid;
    gap: 6px;
    color: #4f4a45;
    font-size: 13px;
    font-weight: 700;
  }

  input,
  select {
    min-height: 46px;
    border: 1px solid var(--demo-border);
    border-radius: 12px;
    padding: 0 13px;
    background: #fff;
    color: var(--demo-text);
    outline: none;
  }

  input:focus,
  select:focus {
    border-color: #f09b72;
    box-shadow: 0 0 0 3px rgba(214, 77, 8, 0.11);
  }
`;

export const ErrorBox = styled.p`
  margin: 0;
  border: 1px solid #f0c3bf;
  border-radius: 12px;
  background: #fff6f5;
  color: #9a2b22 !important;
  padding: 11px 13px;
  font-size: 13px;
`;

export const DemoAccounts = styled.div`
  margin-top: 24px;
  border-top: 1px solid var(--demo-border);
  padding-top: 20px;

  > b {
    display: block;
    margin-bottom: 5px;
  }

  > small {
    display: block;
    color: var(--demo-muted);
    margin-bottom: 12px;
  }
`;

export const AccountList = styled.div`
  display: grid;
  gap: 8px;
`;

export const AccountButton = styled.button`
  width: 100%;
  border: 1px solid var(--demo-border);
  border-radius: 13px;
  background: #fff;
  min-height: 52px;
  padding: 9px 11px;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  text-align: left;

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 11px;
    background: #fff0e8;
    color: var(--demo-primary);
    display: grid;
    place-items: center;
    font-weight: 900;
  }

  b,
  small {
    display: block;
  }

  small {
    margin-top: 2px;
    color: var(--demo-muted);
  }

  svg {
    color: #9b928a;
  }

  &:hover {
    border-color: #e2a98c;
    background: #fffaf7;
  }
`;

export const Workspace = styled.div`
  min-height: calc(100vh - 72px);
  display: grid;
  grid-template-columns: 238px minmax(0, 1fr);

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const Sidebar = styled.aside`
  background: #1f1d1a;
  color: #fff;
  padding: 22px 16px;
  min-height: calc(100vh - 72px);
  position: sticky;
  top: 72px;
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 18px;

  @media (max-width: 900px) {
    position: static;
    min-height: auto;
    padding: 14px 14px 12px;
  }
`;

export const RestaurantBrand = styled.div`
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 0 4px 14px;
  border-bottom: 1px solid #3c3834;

  .mark {
    width: 42px;
    height: 42px;
    border-radius: 13px;
    display: grid;
    place-items: center;
    background: var(--demo-primary);
    font-family: Sora, sans-serif;
    font-weight: 900;
  }

  b,
  small {
    display: block;
  }

  small {
    color: #aaa099;
    margin-top: 2px;
  }
`;

export const Nav = styled.nav`
  display: grid;
  gap: 7px;

  button {
    min-height: 42px;
    border: 0;
    border-radius: 11px;
    background: transparent;
    color: #ddd6cf;
    padding: 0 11px;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    font-weight: 700;
  }

  button.active,
  button:hover {
    background: #332d28;
    color: #fff;
  }

  button.active svg {
    color: #ff8d55;
  }

  @media (max-width: 900px) {
    display: flex;
    overflow-x: auto;
    padding-bottom: 2px;

    button {
      flex: 0 0 auto;
    }
  }
`;

export const SidebarFooter = styled.div`
  margin-top: auto;
  border-top: 1px solid #3c3834;
  padding-top: 14px;
  display: grid;
  gap: 8px;

  b,
  small {
    display: block;
  }

  small {
    color: #aaa099;
  }

  button {
    border: 1px solid #47413b;
    border-radius: 11px;
    background: #282521;
    color: #fff;
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
`;

export const Main = styled.main`
  min-width: 0;
  padding: clamp(18px, 3vw, 34px);
`;

export const PageHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;

  h1 {
    margin: 0;
    font-family: Sora, sans-serif;
    font-size: clamp(25px, 4vw, 34px);
  }

  p {
    margin: 6px 0 0;
    color: var(--demo-muted);
  }

  @media (max-width: 620px) {
    flex-direction: column;
  }
`;

export const DemoBadge = styled.span`
  border: 1px solid #f4c3a9;
  border-radius: 999px;
  padding: 7px 10px;
  background: #fff3ec;
  color: var(--demo-primary-strong);
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
`;

export const MetricGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 18px;

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const Metric = styled.article`
  border: 1px solid var(--demo-border);
  border-radius: 17px;
  background: #fff;
  padding: 18px;
  min-width: 0;

  span,
  small,
  strong {
    display: block;
  }

  span {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: #fff0e8;
    color: var(--demo-primary);
    margin-bottom: 14px;
  }

  small {
    color: var(--demo-muted);
  }

  strong {
    margin-top: 5px;
    font-family: Sora, sans-serif;
    font-size: 23px;
  }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 14px;
`;

export const Panel = styled.section<{ $span?: number }>`
  grid-column: span ${({ $span }) => $span ?? 12};
  border: 1px solid var(--demo-border);
  border-radius: 18px;
  background: #fff;
  overflow: hidden;

  @media (max-width: 980px) {
    grid-column: span 12;
  }
`;

export const PanelHeader = styled.header`
  padding: 17px 18px;
  border-bottom: 1px solid #ece6df;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h2 {
    margin: 0;
    font-family: Sora, sans-serif;
    font-size: 17px;
  }

  small {
    color: var(--demo-muted);
  }
`;

export const OrderList = styled.div`
  display: grid;
`;

export const OrderRow = styled.article`
  display: grid;
  grid-template-columns: 84px minmax(150px, 1.2fr) minmax(120px, 0.8fr) minmax(135px, 0.8fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 72px;
  padding: 12px 18px;
  border-bottom: 1px solid #f0ebe6;

  &:last-child {
    border-bottom: 0;
  }

  b,
  span,
  small {
    min-width: 0;
  }

  small {
    color: var(--demo-muted);
  }

  .customer b,
  .customer small {
    display: block;
  }

  @media (max-width: 820px) {
    grid-template-columns: 70px minmax(0, 1fr) auto;

    .order-channel,
    .order-total {
      display: none;
    }
  }
`;

export const Status = styled.span<{ $tone?: 'warning' | 'info' | 'success' | 'neutral' | 'danger' }>`
  width: fit-content;
  border-radius: 999px;
  padding: 6px 9px;
  font-size: 11px;
  font-weight: 900;
  background: ${({ $tone }) =>
    $tone === 'success'
      ? '#eaf7ef'
      : $tone === 'info'
        ? '#edf3fb'
        : $tone === 'danger'
          ? '#fff0ef'
          : $tone === 'warning'
            ? '#fff6df'
            : '#f2efeb'};
  color: ${({ $tone }) =>
    $tone === 'success'
      ? '#287247'
      : $tone === 'info'
        ? '#315f91'
        : $tone === 'danger'
          ? '#a4342a'
          : $tone === 'warning'
            ? '#8b6419'
            : '#665f58'};
`;

export const ActionGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 7px;

  button {
    min-height: 34px;
    border: 1px solid var(--demo-border);
    border-radius: 10px;
    background: #fff;
    padding: 0 10px;
    font-size: 12px;
    font-weight: 800;
  }

  button.primary {
    border-color: var(--demo-primary);
    background: var(--demo-primary);
    color: #fff;
  }
`;

export const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const ProductCard = styled.article`
  border: 1px solid var(--demo-border);
  border-radius: 16px;
  overflow: hidden;
  background: #fff;

  .image {
    height: 120px;
    background:
      radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.55), transparent 32%),
      linear-gradient(135deg, #ee8c5d, #b93e08);
    color: #fff;
    display: grid;
    place-items: center;
    font-family: Sora, sans-serif;
    font-size: 28px;
    font-weight: 900;
  }

  .body {
    padding: 14px;
  }

  h3 {
    margin: 0 0 5px;
    font-family: Sora, sans-serif;
    font-size: 15px;
  }

  p {
    margin: 0;
    min-height: 42px;
    color: var(--demo-muted);
    font-size: 12px;
    line-height: 1.45;
  }

  footer {
    margin-top: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  footer b {
    color: var(--demo-primary-strong);
  }
`;

export const Cart = styled.section`
  border: 1px solid var(--demo-border);
  border-radius: 18px;
  background: #fff;
  padding: 16px;

  h2 {
    margin: 0 0 14px;
    font-family: Sora, sans-serif;
    font-size: 17px;
  }
`;

export const CartLine = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #eee8e2;

  b,
  small {
    display: block;
  }

  small {
    color: var(--demo-muted);
  }

  .quantity {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  button {
    width: 28px;
    height: 28px;
    border: 1px solid var(--demo-border);
    border-radius: 8px;
    background: #fff;
  }
`;

export const CartSummary = styled.div`
  padding-top: 14px;
  display: grid;
  gap: 12px;

  > div {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  label {
    display: grid;
    gap: 5px;
    font-size: 12px;
    font-weight: 800;
  }

  select {
    min-height: 40px;
    border: 1px solid var(--demo-border);
    border-radius: 10px;
    padding: 0 10px;
    background: #fff;
  }
`;

export const Empty = styled.div`
  padding: 30px 18px;
  text-align: center;
  color: var(--demo-muted);

  svg {
    margin-bottom: 8px;
    color: #b1a79e;
  }

  b,
  span {
    display: block;
  }

  span {
    margin-top: 5px;
    font-size: 13px;
  }
`;

export const TableGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;

  @media (max-width: 540px) {
    grid-template-columns: 1fr;
  }
`;

export const TableCard = styled.article`
  border: 1px solid var(--demo-border);
  border-radius: 15px;
  padding: 14px;
  background: #fff;

  header {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 10px;
  }

  b,
  small {
    display: block;
  }

  small {
    color: var(--demo-muted);
    margin-top: 3px;
  }
`;

export const CallList = styled.div`
  display: grid;
  padding: 10px 16px 16px;
  gap: 9px;
`;

export const CallCard = styled.article`
  border: 1px solid var(--demo-border);
  border-radius: 13px;
  padding: 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  b,
  small {
    display: block;
  }

  small {
    color: var(--demo-muted);
    margin-top: 2px;
  }
`;

export const Notice = styled.div`
  margin-bottom: 16px;
  border: 1px solid #f0c9b4;
  border-radius: 14px;
  padding: 12px 14px;
  background: #fff6f0;
  color: #7d3b1f;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.5;
`;
