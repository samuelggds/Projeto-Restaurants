import styled from 'styled-components';

export const Page = styled.div<{ $primary: string }>`
  --checkout-primary: ${({ $primary }) => $primary};
  position: fixed;
  inset: 0;
  z-index: 1200;
  overflow-y: auto;
  background: #fdfcf9;
  color: #1f1e1a;
`;

export const MobileHeader = styled.header`
  display: none;

  @media (max-width: 760px) {
    height: 66px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 12px;

    button {
      width: 20px;
      height: 20px;
      padding: 0;
      display: grid;
      place-items: center;
      border: 0;
      background: transparent;
      color: #1f1e1a;
      cursor: pointer;
    }

    svg { width: 20px; height: 20px; }
    h1 { margin: 0; font-size: 22px; font-weight: 800; }
  }
`;

export const LoggedDesktopHeader = styled.header`
  height: 64px;
  padding: 0 max(40px, calc((100vw - 1120px) / 2));
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #efece6;
  background: #fff;

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand span {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: var(--checkout-primary);
    color: #fff;
    font-weight: 800;
  }

  .brand b { font-size: 18px; }

  nav {
    display: flex;
    align-items: center;
    gap: 32px;
    color: #72706b;
    font-size: 13px;
  }

  nav b { color: #1f1e1a; }

  @media (max-width: 760px) { display: none; }
`;

export const Content = styled.main<{ $loggedIn: boolean }>`
  width: min(1120px, calc(100% - 48px));
  min-height: ${({ $loggedIn }) => ($loggedIn ? '600px' : '673px')};
  margin: 0 auto;
  padding: 40px 0 80px;
  display: grid;
  grid-template-columns: minmax(0, 700px) 380px;
  gap: 40px;
  align-items: start;

  @media (max-width: 1000px) {
    width: calc(100% - 40px);
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 24px;
  }

  @media (max-width: 760px) {
    width: 100%;
    min-height: 0;
    padding: 0 20px 110px;
    display: block;
  }
`;

export const MethodColumn = styled.section`
  min-width: 0;
  display: grid;
  gap: 12px;

  > h1 {
    margin: 0 0 12px;
    font-size: 28px;
    font-weight: 800;
  }

  > h2 {
    display: none;
    margin: 0;
    font-size: 16px;
  }

  @media (max-width: 760px) {
    > h1 { display: none; }
    > h2 { display: block; }
  }
`;

export const SummaryCard = styled.aside`
  padding: 24px;
  display: grid;
  gap: 16px;
  border: 1px solid #efece6;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 4px 6px rgba(16, 24, 39, 0.02);

  h2 { margin: 0; font-size: 18px; }

  .items {
    display: grid;
    gap: 10px;
  }

  .items div,
  .row,
  .total {
    display: flex;
    justify-content: space-between;
    gap: 14px;
  }

  .items div { font-size: 13px; }
  .items span, .row span { color: #72706b; }
  .items strong, .row strong { white-space: nowrap; }

  .divider { height: 1px; background: #efece6; }

  .row { font-size: 13px; }
  .row .free { color: #268c43; }

  .total {
    align-items: center;
    font-size: 17px;
    font-weight: 700;
  }

  .total strong {
    color: var(--checkout-primary);
    font-size: 22px;
  }

  button {
    min-height: 46px;
    border: 0;
    border-radius: 12px;
    background: linear-gradient(90deg, #ff6a3d, #ff3d1f);
    color: #fff;
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }

  button:disabled { opacity: .5; cursor: not-allowed; }

  @media (max-width: 760px) { display: none; }
`;

export const MobileRecap = styled.section`
  display: none;

  @media (max-width: 760px) {
    margin-top: 4px;
    padding: 8px 0 100px;
    display: grid;
    gap: 10px;

    h3 { margin: 0; font-size: 16px; }
    div { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
    span { color: #72706b; }
    strong { font-weight: 500; }
  }
`;

export const DesktopFooter = styled.footer`
  padding: 64px max(40px, calc((100vw - 1120px) / 2));
  display: grid;
  gap: 48px;
  background: #1f1e1a;
  color: #72706b;

  .top { display: grid; grid-template-columns: 320px 1fr 1fr 280px; gap: 48px; }
  section { display: grid; align-content: start; gap: 16px; font-size: 14px; }
  section p { margin: 0; line-height: 22px; }
  section b { color: #fff; }
  .footer-brand { display: flex; align-items: center; gap: 12px; color: #fff; font-size: 20px; }
  .footer-brand span { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 10px; background: var(--checkout-primary); color: #fff; font-weight: 800; }
  .bottom { padding-top: 24px; display: flex; justify-content: space-between; border-top: 1px solid #35332f; font-size: 13px; }

  @media (max-width: 980px) {
    padding-inline: 40px;
    .top { grid-template-columns: 1.2fr 1fr 1fr; }
    .top section:last-child { display: none; }
  }

  @media (max-width: 760px) { display: none; }
`;

export const MobileAction = styled.div`
  display: none;

  @media (max-width: 760px) {
    position: fixed;
    z-index: 3;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 12px 20px 24px;
    display: block;
    border-top: 1px solid #efece6;
    background: #fff;

    button {
      width: 100%;
      min-height: 46px;
      border: 0;
      border-radius: 12px;
      background: linear-gradient(90deg, #ff6a3d, #ff3d1f);
      color: #fff;
      font: inherit;
      font-size: 15px;
      font-weight: 700;
    }

    button:disabled { opacity: .5; }
  }
`;
