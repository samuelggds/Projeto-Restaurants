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
    button { width: 20px; height: 20px; padding: 0; display: grid; place-items: center; border: 0; background: transparent; color: #1f1e1a; }
    svg { width: 18px; height: 18px; }
    h1 { margin: 0; font-size: 22px; font-weight: 800; }
  }
`;

export const DesktopHeader = styled.header`
  height: 80px;
  padding: 0 max(40px, calc((100vw - 1120px) / 2));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  border-bottom: 1px solid #efece6;
  background: #fff;

  .brand { border: 0; background: transparent; color: #1f1e1a; font: inherit; display: flex; align-items: center; gap: 12px; text-align: left; cursor: pointer; }
  .logo { width: 40px; height: 40px; display: grid; place-items: center; overflow: hidden; border-radius: 12px; background: var(--checkout-primary); color: #fff; font-size: 20px; font-weight: 800; }
  .logo img { width: 100%; height: 100%; object-fit: cover; }
  .brand > span:last-child { display: grid; gap: 2px; }
  .brand b { font-size: 18px; }
  .brand small { display: flex; align-items: center; gap: 6px; color: #72706b; font-size: 12px; }
  .brand small i { width: 8px; height: 8px; border-radius: 50%; background: #b4b0ab; }
  .brand small i.open { background: #41a267; }
  .search-placeholder { width: min(380px, 32vw); padding: 10px 16px; border: 1px solid #efece6; border-radius: 100px; background: #fafaf8; color: #72706b; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .actions { display: flex; align-items: center; gap: 20px; }
  .account, .cart { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; white-space: nowrap; }
  .actions svg { width: 18px; }
  .cart { padding: 10px 14px; border-radius: 999px; background: var(--checkout-primary); color: #fff; }
  .cart i { min-width: 18px; height: 18px; padding: 0 5px; display: grid; place-items: center; border-radius: 9px; background: #1f1e1a; color: #fff; font-size: 10px; font-style: normal; }

  @media (max-width: 980px) {
    padding-inline: 32px;
    .search-placeholder { width: 280px; }
  }
  @media (max-width: 760px) { display: none; }
`;

export const Content = styled.main`
  width: min(1120px, calc(100% - 48px));
  min-height: 900px;
  margin: 0 auto;
  padding: 40px 0 80px;
  display: grid;
  grid-template-columns: minmax(0, 640px) minmax(320px, 448px);
  gap: 32px;
  align-items: start;

  @media (max-width: 1000px) {
    grid-template-columns: minmax(0, 1fr) 340px;
    width: calc(100% - 40px);
    gap: 20px;
  }

  @media (max-width: 760px) {
    width: 100%;
    min-height: 0;
    padding: 0 0 100px;
    display: block;
  }
`;

export const Left = styled.section`
  min-width: 0;
  display: grid;
  gap: 24px;
  > h1 { margin: 0; font-size: 28px; font-weight: 800; }
  @media (max-width: 760px) {
    gap: 0;
    > h1 { display: none; }
  }
`;

export const Methods = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  button { min-height: 42px; padding: 0 20px; border: 1px solid #efece6; border-radius: 12px; background: #fff; color: #1f1e1a; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  button.active { border-color: var(--checkout-primary); background: #fdf2ec; color: var(--checkout-primary); font-weight: 700; }
  @media (max-width: 760px) {
    gap: 12px;
    padding: 0 20px 16px;
    button { min-height: 40px; padding: 0 10px; font-size: 14px; }
  }
`;

export const SavedAddresses = styled.section`
  padding: 20px;
  display: grid;
  gap: 16px;
  border: 1px solid #efece6;
  border-radius: 16px;
  background: #fff;
  h2 { margin: 0; font-size: 16px; font-weight: 800; }
  .add-address { width: max-content; padding: 4px 0; display: inline-flex; align-items: center; gap: 8px; border: 0; background: transparent; color: var(--checkout-primary); font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
  .add-address svg { width: 16px; }

  @media (max-width: 760px) {
    padding: 8px 20px 20px;
    gap: 12px;
    border: 0;
    border-radius: 0;
    background: transparent;
    h2 { font-size: 16px; }
  }
`;

export const AddressList = styled.div`
  display: grid;
  gap: 12px;
  > button {
    min-width: 0;
    padding: 16px;
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) 20px;
    align-items: center;
    gap: 12px;
    border: 1px solid #efece6;
    border-radius: 16px;
    background: #fff;
    color: #1f1e1a;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  > button.selected { border-color: var(--checkout-primary); border-left-width: 4px; padding-left: 13px; }
  .address-icon { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 20px; background: #fafaf8; color: #72706b; }
  .address-icon svg { width: 18px; }
  .address-copy { min-width: 0; display: grid; gap: 2px; }
  .address-copy b { overflow: hidden; font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
  .address-copy small { overflow: hidden; color: #72706b; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
  .radio { width: 20px; height: 20px; display: grid; place-items: center; border: 2px solid #efece6; border-radius: 50%; }
  .selected .radio { border-color: var(--checkout-primary); }
  .selected .radio i { width: 10px; height: 10px; border-radius: 50%; background: var(--checkout-primary); }

  @media (max-width: 760px) {
    gap: 12px;
    > button { grid-template-columns: 40px minmax(0, 1fr) 20px; }
  }
`;

export const EmptyAddresses = styled.div`
  padding: 20px;
  display: grid;
  justify-items: center;
  gap: 16px;
  border: 1px solid #efece6;
  border-radius: 16px;
  text-align: center;
  .empty-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 24px; background: #fdf2ec; color: var(--checkout-primary); }
  .empty-icon svg { width: 24px; }
  div { display: grid; gap: 4px; }
  b { font-size: 15px; }
  small { color: #72706b; font-size: 13px; }
  button { min-height: 38px; padding: 0 20px; border: 1px solid var(--checkout-primary); border-radius: 8px; background: #fff; color: var(--checkout-primary); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
`;

export const NewAddressCard = styled.section`
  padding: 24px;
  display: grid;
  gap: 16px;
  border: 1px solid #efece6;
  border-radius: 16px;
  background: #fff;
  h2 { margin: 0; font-size: 16px; }
  @media (max-width: 760px) {
    padding: 0 20px 20px;
    border: 0;
    background: transparent;
  }
`;

export const MapCard = styled.section`
  padding: 20px;
  display: grid;
  gap: 16px;
  border: 1px solid #efece6;
  border-radius: 16px;
  background: #fff;
  h2 { margin: 0; font-size: 16px; }
  p { margin: 0; color: #72706b; font-size: 12px; line-height: 1.45; }
  @media (max-width: 760px) {
    padding: 0 20px 20px;
    border: 0;
    background: transparent;
    h2, p { display: none; }
  }
`;

export const Right = styled.aside`
  min-width: 0;
  @media (max-width: 760px) { display: none; }
`;

export const SummaryCard = styled.section`
  padding: 20px;
  display: grid;
  gap: 14px;
  border: 1px solid #efece6;
  border-radius: 16px;
  background: #fff;
  h2 { margin: 0; font-size: 16px; }
  .items { display: grid; gap: 10px; }
  .items div, .row, .total { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
  .items span, .row span { color: #72706b; }
  .divider { height: 1px; background: #efece6; }
  .total { font-size: 15px; font-weight: 700; }
  .total strong { color: var(--checkout-primary); font-size: 18px; }
  button { min-height: 44px; border: 0; border-radius: 12px; background: linear-gradient(90deg, #ff6a3d, #ff3d1f); color: #fff; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
  button:disabled { opacity: .5; cursor: not-allowed; }
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
    z-index: 2;
    left: 0; right: 0; bottom: 0;
    padding: 12px 20px 24px;
    display: block;
    border-top: 1px solid #efece6;
    background: #fff;
    button { width: 100%; min-height: 48px; border: 0; border-radius: 12px; background: linear-gradient(90deg, #ff6a3d, #ff3d1f); color: #fff; font: inherit; font-size: 15px; font-weight: 700; }
    button:disabled { opacity: .5; }
  }
`;
