import styled from 'styled-components';

export const Page = styled.div<{ $primary: string }>`
  --checkout-primary: ${({ $primary }) => $primary || '#e85a2b'};
  position: fixed;
  inset: 0;
  z-index: 1200;
  overflow-y: auto;
  background: #fdfcf9;
  color: #1f1e1a;
  font-family: inherit;
`;

export const MobileStatus = styled.div`
  display: none;
  @media (max-width: 760px) {
    height: 44px;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
  }
`;

export const MobileHeader = styled.header`
  display: none;
  @media (max-width: 760px) {
    height: 60px;
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
    svg { width: 18px; height: 18px; }
    h1 { margin: 0; font-size: 22px; font-weight: 800; line-height: normal; }
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

  .brand, .actions button { border: 0; background: transparent; color: #1f1e1a; font: inherit; cursor: pointer; }
  .brand { display: flex; align-items: center; gap: 12px; text-align: left; }
  .logo { width: 40px; height: 40px; display: grid; place-items: center; overflow: hidden; border-radius: 12px; background: var(--checkout-primary); color: #fff; font-size: 20px; font-weight: 800; }
  .logo img { width: 100%; height: 100%; object-fit: cover; }
  .brand-copy { display: grid; gap: 2px; }
  .brand-copy b { font-size: 18px; }
  .brand-copy small { display: flex; align-items: center; gap: 6px; color: #72706b; font-size: 12px; }
  .brand-copy i { width: 8px; height: 8px; border-radius: 50%; background: #b4b0ab; }
  .brand-copy i.open { background: #41a267; }

  .search { width: 380px; padding: 10px 16px; display: flex; align-items: center; gap: 12px; border: 1px solid #efece6; border-radius: 100px; background: #fafaf8; color: #72706b; font-size: 14px; }
  .search svg { width: 16px; height: 16px; }

  .actions { display: flex; align-items: center; gap: 20px; }
  .actions button { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
  .actions svg { width: 18px; height: 18px; }
  .actions .cart { padding: 10px 14px; border-radius: 999px; background: var(--checkout-primary); color: #fff; }
  .actions .cart i { min-width: 20px; height: 20px; padding: 0 6px; display: grid; place-items: center; border-radius: 10px; background: #fff; color: var(--checkout-primary); font-size: 11px; font-style: normal; }

  @media (max-width: 760px) { display: none; }
`;

export const Content = styled.main`
  width: min(1120px, calc(100% - 48px));
  min-height: 1365px;
  margin: 0 auto;
  padding: 40px 0 80px;
  display: grid;
  grid-template-columns: 640px 448px;
  gap: 32px;
  align-items: start;

  @media (max-width: 760px) {
    width: 100%;
    min-height: 0;
    padding: 0 0 100px;
    display: block;
  }
`;

export const Left = styled.section`
  display: grid;
  gap: 24px;
  > h1 { margin: 0; font-size: 28px; font-weight: 800; line-height: normal; }

  @media (max-width: 760px) {
    gap: 0;
    > h1 { display: none; }
  }
`;

export const Methods = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  button { min-height: 42px; border: 1px solid #efece6; border-radius: 12px; background: #fff; color: #72706b; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
  button.active { border-color: var(--checkout-primary); background: #fdf2ec; color: var(--checkout-primary); font-weight: 700; }

  @media (max-width: 760px) {
    padding: 0 20px 16px;
    button { min-height: 40px; }
  }
`;

export const SectionTitle = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 800;

  @media (max-width: 760px) { padding: 8px 20px 12px; }
`;

export const EmptyCard = styled.section`
  min-height: 195px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  border: 1px solid #efece6;
  border-radius: 16px;
  background: #fff;
  text-align: center;

  .icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 24px; background: #fdf2ec; color: var(--checkout-primary); }
  .icon svg { width: 24px; height: 24px; }
  div { display: grid; gap: 4px; }
  b { font-size: 15px; }
  small { color: #72706b; font-size: 13px; }
  button { min-height: 38px; padding: 0 20px; border: 1px solid var(--checkout-primary); border-radius: 8px; background: transparent; color: var(--checkout-primary); font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }

  @media (max-width: 760px) {
    margin: 0 20px 24px;
    min-height: 211px;
  }
`;

export const FormCard = styled.section`
  padding: 24px;
  display: grid;
  gap: 16px;
  border: 1px solid #efece6;
  border-radius: 16px;
  background: #fff;
  h2 { margin: 0; font-size: 16px; font-weight: 800; }

  @media (max-width: 760px) {
    padding: 0 20px 24px;
    border: 0;
    border-radius: 0;
    background: transparent;
  }
`;

export const MapCard = styled.section`
  padding: 24px;
  display: grid;
  gap: 16px;
  border: 1px solid #efece6;
  border-radius: 16px;
  background: #fff;
  h2 { margin: 0; font-size: 16px; font-weight: 800; }
  p { margin: 0; color: #72706b; font-size: 12px; line-height: 1.45; }

  @media (max-width: 760px) {
    padding: 8px 20px 120px;
    border: 0;
    border-radius: 0;
    background: transparent;
    h2, p { display: none; }
  }
`;

export const MapVisual = styled.div`
  position: relative;
  height: 300px;
  overflow: hidden;
  border: 1px solid #e1e7ed;
  border-radius: 12px;
  background:
    linear-gradient(25deg, transparent 45%, #dce4ed 46%, #dce4ed 48%, transparent 49%) 0 0/52px 52px,
    linear-gradient(115deg, transparent 45%, #e3e8ee 46%, #e3e8ee 48%, transparent 49%) 0 0/62px 62px,
    #f7f9fb;
  .grid { position: absolute; inset: 0; background: linear-gradient(#dfe5eb 1px, transparent 1px), linear-gradient(90deg, #dfe5eb 1px, transparent 1px); background-size: 34px 34px; opacity: .55; }
  .route { position: absolute; left: 35%; top: 18%; width: 31%; height: 61%; border-left: 5px solid #5b21b6; border-bottom: 5px solid #5b21b6; transform: skew(-12deg); }
  .pin { position: absolute; left: 62%; top: 17%; width: 14px; height: 14px; border: 4px solid var(--checkout-primary); border-radius: 50% 50% 50% 0; background: #fff; transform: rotate(-45deg); }

  @media (max-width: 760px) { height: 220px; border-radius: 16px; }
`;

export const Right = styled.aside`
  @media (max-width: 760px) { display: none; }
`;

export const SummaryCard = styled.section`
  padding: 24px;
  display: grid;
  gap: 16px;
  border: 1px solid #efece6;
  border-radius: 16px;
  background: #fff;

  h2 { margin: 0; font-size: 16px; font-weight: 800; }
  .items { display: grid; gap: 12px; }
  .item, .row, .total { display: flex; justify-content: space-between; gap: 16px; font-size: 13px; }
  .item span, .row span { color: #72706b; }
  .item strong, .row strong { font-weight: 600; }
  .divider { height: 1px; background: #efece6; }
  .total { font-size: 16px; font-weight: 800; }
  .total strong { color: var(--checkout-primary); font-size: 20px; }
  button { min-height: 46px; border: 0; border-radius: 12px; background: linear-gradient(90deg, #ff6a3d, #ff3d1f); color: #fff; font: inherit; font-size: 14px; font-weight: 700; cursor: pointer; }
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

  @media (max-width: 760px) { display: none; }
`;

export const MobileAction = styled.div`
  display: none;
  @media (max-width: 760px) {
    position: fixed;
    z-index: 2;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 12px 20px 24px;
    display: block;
    border-top: 1px solid #efece6;
    background: #fff;
    button { width: 100%; min-height: 48px; border: 0; border-radius: 12px; background: linear-gradient(90deg, #ff6a3d, #ff3d1f); color: #fff; font: inherit; font-size: 15px; font-weight: 700; }
    button:disabled { opacity: .5; }
  }
`;
