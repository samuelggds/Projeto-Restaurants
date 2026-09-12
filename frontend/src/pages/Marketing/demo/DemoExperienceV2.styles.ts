import styled from 'styled-components';

export const Root = styled.div`
  --demo-primary: #233f32;
  --demo-primary-dark: #192f25;
  --demo-bg: #faf9f5;
  --demo-surface: #fff;
  --demo-border: #dce1d5;
  --demo-text: #233f32;
  --demo-muted: #667062;
  min-height: 100vh;
  min-height: 100dvh;
  color: var(--demo-text);
  background: var(--demo-bg);
  font-family: 'Manrope', Inter, system-ui, sans-serif;
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
  :focus-visible {
    outline: 3px solid #7c9769;
    outline-offset: 4px;
  }
`;

export const DemoTopbar = styled.header`
  position: sticky;
  top: 0;
  z-index: 90;
  min-height: 80px;
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
    font-family: 'Manrope', sans-serif;
    font-size: 17px;
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
      position: absolute;
      width: 1px;
      height: 1px;
      clip-path: inset(50%);
      overflow: hidden;
      white-space: nowrap;
    }
  }
`;

export const SoftButton = styled.button`
  min-height: 44px;
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
  box-shadow: none;
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

export { PortalPage, PortalHero, PortalGrid, PortalCard, PortalJourney } from './DemoPortal.styles';

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

export const DemoRibbon = styled.p`
  margin: 16px 0 0;
  color: #74675d;
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
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
