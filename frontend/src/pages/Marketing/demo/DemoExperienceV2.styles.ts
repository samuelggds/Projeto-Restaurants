import styled from 'styled-components';

export const Root = styled.div`
  --demo-primary: #d64d08;
  --demo-primary-dark: #a83a06;
  --demo-bg: #f6f7f4;
  --demo-surface: #fff;
  --demo-border: #e4ddd5;
  --demo-text: #191816;
  --demo-muted: #716d68;
  min-height: 100vh;
  min-height: 100dvh;
  color: var(--demo-text);
  background:
    linear-gradient(rgba(60, 48, 40, 0.026) 1px, transparent 1px),
    linear-gradient(90deg, rgba(60, 48, 40, 0.026) 1px, transparent 1px), var(--demo-bg);
  background-size: 32px 32px;
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
`;

export const DemoTopbar = styled.header`
  position: sticky;
  top: 0;
  z-index: 90;
  min-height: 64px;
  border-bottom: 1px solid rgba(228, 221, 213, 0.9);
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
`;

export const DemoTopbarInner = styled.div`
  width: min(1240px, calc(100% - 28px));
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

export const BrandButton = styled.button`
  border: 0;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #191816;
  background: transparent;
  cursor: pointer;
  .g {
    width: 30px;
    display: grid;
    place-items: center;
    font-family: 'Sora', sans-serif;
    font-size: 31px;
    font-weight: 900;
    letter-spacing: -0.1em;
    line-height: 1;
  }
  b {
    display: block;
    font-family: 'Sora', sans-serif;
    font-size: 14px;
  }
  small {
    display: block;
    margin-top: 1px;
    color: #8b837c;
    font-size: 9px;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

export const TopActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  @media (max-width: 580px) {
    .wide-label {
      display: none;
    }
  }
`;

export const SoftButton = styled.button`
  min-height: 38px;
  padding: 0 13px;
  border: 1px solid var(--demo-border);
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #39332f;
  background: #fff;
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
  &:hover {
    border-color: #cfc5bc;
    background: #fbf9f7;
  }
`;

export const PrimaryButton = styled.button`
  min-height: 42px;
  padding: 0 16px;
  border: 0;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: #fff;
  background: var(--demo-primary);
  box-shadow: 0 8px 18px rgba(214, 77, 8, 0.18);
  cursor: pointer;
  font-size: 12px;
  font-weight: 850;
  &:hover {
    background: var(--demo-primary-dark);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export const PortalPage = styled.main`
  width: min(1180px, calc(100% - 28px));
  margin: 0 auto;
  padding: 48px 0 72px;
`;

export const PortalHero = styled.section`
  max-width: 850px;
  margin: 0 auto 34px;
  text-align: center;
  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #9b3c0e;
    font-size: 10px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.09em;
  }
  h1 {
    margin: 13px 0 0;
    font-family: 'Sora', sans-serif;
    font-size: clamp(34px, 6vw, 58px);
    line-height: 1.04;
    letter-spacing: -0.055em;
  }
  h1 span {
    color: var(--demo-primary);
  }
  p {
    max-width: 720px;
    margin: 17px auto 0;
    color: var(--demo-muted);
    font-size: 15px;
    line-height: 1.65;
  }
`;

export const PortalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  @media (max-width: 850px) {
    grid-template-columns: 1fr;
    max-width: 620px;
    margin: 0 auto;
  }
`;

export const PortalCard = styled.article`
  position: relative;
  min-height: 310px;
  padding: 25px;
  border: 1px solid var(--demo-border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  background: #fff;
  box-shadow: 0 10px 28px rgba(51, 35, 22, 0.05);
  .icon {
    width: 46px;
    height: 46px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    color: var(--demo-primary);
    background: #fff0e8;
  }
  h2 {
    margin: 20px 0 7px;
    font-family: 'Sora', sans-serif;
    font-size: 22px;
    letter-spacing: -0.035em;
  }
  p {
    margin: 0;
    color: var(--demo-muted);
    font-size: 13px;
    line-height: 1.55;
  }
  ul {
    margin: 18px 0 22px;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 8px;
    color: #514a45;
    font-size: 11px;
  }
  li {
    display: flex;
    align-items: center;
    gap: 7px;
  }
  li svg {
    color: #287139;
  }
  button {
    margin-top: auto;
  }
`;

export const CredentialAside = styled.aside`
  margin: 18px 0 0;
  padding: 14px;
  border: 1px solid #e5ddd5;
  border-radius: 8px;
  background: #fff8f3;
  > strong {
    display: block;
    color: #322a25;
    font-size: 12px;
  }
  > small {
    display: block;
    margin-top: 3px;
    color: #8d7768;
    font-size: 10px;
    line-height: 1.4;
  }
`;

export const CredentialList = styled.div`
  display: grid;
  gap: 6px;
  margin-top: 10px;
`;

export const CredentialButton = styled.button<{ $active?: boolean }>`
  width: 100%;
  min-height: 49px;
  padding: 8px 10px;
  border: 1px solid ${({ $active }) => ($active ? '#d64d08' : '#e2d8cf')};
  border-radius: 7px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  text-align: left;
  color: #342e2a;
  background: ${({ $active }) => ($active ? '#fff3ec' : '#fff')};
  cursor: pointer;
  b,
  small {
    display: block;
  }
  b {
    font-size: 10px;
  }
  small {
    margin-top: 2px;
    color: #7f756e;
    font-size: 9px;
  }
  code {
    padding: 4px 6px;
    border-radius: 5px;
    background: #f2ece7;
    color: #6c5141;
    font-size: 9px;
  }
`;

export const DemoRibbon = styled.div`
  position: fixed;
  left: 50%;
  bottom: 16px;
  z-index: 100;
  transform: translateX(-50%);
  min-width: min(560px, calc(100% - 24px));
  padding: 9px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  background: rgba(24, 22, 20, 0.93);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(10px);
  font-size: 10px;
  font-weight: 750;
  pointer-events: none;
`;

export const Panel = styled.section<{ $span?: number }>`
  grid-column: span ${({ $span }) => $span ?? 12};
  min-width: 0;
  border: 1px solid #e5ded7;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 6px 18px rgba(50, 39, 30, 0.035);
`;

export const PanelHeader = styled.header`
  min-height: 58px;
  padding: 13px 15px;
  border-bottom: 1px solid #eee8e2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #fffdfa;
  h2 {
    margin: 0;
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    letter-spacing: -0.025em;
  }
  small {
    display: block;
    margin-top: 3px;
    color: #857e78;
    font-size: 9px;
  }
  svg {
    color: #8c8178;
  }
`;

export const OrderList = styled.div`
  display: grid;
`;

export const OrderRow = styled.div`
  padding: 16px;
  border-bottom: 1px solid #f0ece8;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  font-size: 13px;
  &:last-child {
    border-bottom: 0;
  }
  .customer {
    grid-column: 1 / -1;
    grid-row: 2;
  }
  .customer b,
  .customer small,
  .value b,
  .value small {
    display: block;
  }
  .customer small,
  .value small {
    margin-top: 5px;
    color: #746b70;
    line-height: 1.5;
    font-size: 12px;
  }
  .value {
    text-align: right;
  }
`;

export const Status = styled.span<{ $tone: 'warning' | 'info' | 'success' | 'danger' }>`
  width: fit-content;
  padding: 5px 7px;
  border-radius: 999px;
  color: ${({ $tone }) => ($tone === 'success' ? '#287139' : $tone === 'danger' ? '#a6382e' : $tone === 'info' ? '#276677' : '#95620f')};
  background: ${({ $tone }) => ($tone === 'success' ? '#edf7ee' : $tone === 'danger' ? '#fff0ed' : $tone === 'info' ? '#edf5f7' : '#fff7e7')};
  font-size: 8px;
  font-weight: 850;
  white-space: nowrap;
`;

export const Empty = styled.div`
  min-height: 140px;
  padding: 24px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 6px;
  color: #847d77;
  text-align: center;
  b {
    color: #423d39;
    font-size: 12px;
  }
  span {
    font-size: 10px;
  }
`;

export const Toast = styled.div`
  margin-bottom: 13px;
  padding: 11px 13px;
  border: 1px solid #bad9bf;
  border-radius: 7px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #287139;
  background: #edf7ee;
  font-size: 10px;
  font-weight: 750;
`;
