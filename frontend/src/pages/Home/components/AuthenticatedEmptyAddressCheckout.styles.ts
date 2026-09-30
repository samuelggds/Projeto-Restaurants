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
      width: 36px;
      height: 36px;
      padding: 0;
      display: grid;
      place-items: center;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #1f1e1a;
      cursor: pointer;
      transition: background-color 160ms ease, transform 160ms ease;
      cursor: pointer;
    }
    button:hover { background: #f4f1ec; }
    button:active { transform: scale(.94); }
    button:focus-visible { outline: 2px solid color-mix(in srgb, var(--checkout-primary) 28%, transparent); outline-offset: 2px; }
    svg { width: 24px; height: 24px; }
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
  .brand-copy i { width: 8px; height: 8px; border-radius: 50%; background: #e5484d; }
  .brand-copy i.open { background: #33b864; }

  .search { width: 380px; padding: 10px 16px; display: flex; align-items: center; gap: 12px; border: 1px solid #efece6; border-radius: 100px; background: #fafaf8; color: #72706b; font-size: 14px; }
  .search svg { width: 16px; height: 16px; }

  .actions { display: flex; align-items: center; gap: 20px; }
  .actions button { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
  .actions svg { width: 18px; height: 18px; }
  .actions .cart { padding: 10px 14px; border-radius: 10px; background: var(--checkout-primary); color: #fff; }
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

export const ContactCard = styled.section`
  padding: 16px;
  display: grid;
  gap: 8px;
  border: 1px solid #efece6;
  border-radius: 14px;
  background: #fff;

  label {
    color: #1f1e1a;
    font-size: 13px;
    font-weight: 700;
  }

  input {
    width: 100%;
    height: 42px;
    padding: 0 12px;
    border: 1px solid #e3ded7;
    border-radius: 10px;
    background: #fafaf8;
    color: #1f1e1a;
    font: inherit;
    font-size: 14px;
    outline: none;
    transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
  }

  input:focus {
    border-color: var(--checkout-primary);
    background: #fff;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--checkout-primary) 12%, transparent);
  }

  small {
    color: #72706b;
    font-size: 11px;
  }

  @media (max-width: 760px) {
    margin: 0 20px 20px;
    padding: 14px;
  }

  .phone-warning {
    margin-top: 8px;
    padding: 12px 14px;
    display: grid;
    gap: 3px;
    border: 1px solid color-mix(in srgb, var(--checkout-primary) 35%, #f0d6cc);
    border-radius: 10px;
    background: color-mix(in srgb, var(--checkout-primary) 7%, #fff);
  }
  .phone-warning strong { color: var(--checkout-primary); font-size: 12px; }
  .phone-warning span { color: #6f665f; font-size: 12px; line-height: 1.45; }
  input[aria-invalid='true'] {
    border-color: var(--checkout-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--checkout-primary) 9%, transparent);
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
  min-height: 356px;
  box-sizing: border-box;
  padding: 64px max(40px, calc((100vw - 1120px) / 2));
  display: grid;
  gap: 48px;
  background: #1f1e1a;
  color: #72706b;
  .top { display: grid; grid-template-columns: 320px 1fr 1fr 280px; gap: 48px; }
  section { display: grid; align-content: start; gap: 16px; font-size: 14px; }
  section p { margin: 0; line-height: 22px; }
  section a,
  .legal-links a {
    color: inherit;
    text-decoration: none;
  }
  section a:hover,
  section a:focus-visible,
  .legal-links a:hover,
  .legal-links a:focus-visible {
    color: #fff;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .legal-links {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  section b { color: #fff; }
  .footer-brand { display: flex; align-items: center; gap: 12px; color: #fff; font-size: 20px; }
  .footer-brand span { width: 32px; height: 32px; min-width: 32px; max-width: 32px; min-height: 32px; max-height: 32px; flex: 0 0 32px; display: grid; place-items: center; overflow: hidden; border-radius: 10px; background: var(--checkout-primary); color: #fff; font-weight: 800; }
  .footer-brand img { width: 32px; height: 32px; max-width: 32px; max-height: 32px; display: block; object-fit: cover; }
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
