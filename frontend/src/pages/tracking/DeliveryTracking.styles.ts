import styled from 'styled-components';

export const Page = styled.div`
  --courier-line: #efece6;
  --courier-primary: #e85a2b;
  --tracking-ink: #1f1e1a;
  --tracking-muted: #72706b;
  min-height: 100vh;
  min-height: 100dvh;
  color: var(--tracking-ink);
  background-color: #fdfcf9;
  background-image: none;
  font-family: 'Inter', system-ui, sans-serif;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
`;

export const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 1100;
  border-bottom: 1px solid #eeeeee;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(12px);
`;

export const HeaderInner = styled.div`
  width: min(1120px, calc(100% - 48px));
  min-height: 80px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  @media (max-width: 520px) {
    width: calc(100% - 24px);
    min-height: 64px;
  }
`;

export const BackButton = styled.button`
  min-height: 36px;
  padding: 0 8px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  color: #34443d;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;

  svg {
    width: 24px;
    height: 24px;
  }

  &:hover {
    background: #f0f2ef;
  }

  &:focus-visible {
    outline: 3px solid rgba(228, 81, 24, 0.24);
    outline-offset: 2px;
  }

  @media (max-width: 520px) {
    width: 36px;
    height: 36px;
    padding: 0;
    justify-content: center;

    span {
      display: none;
    }
  }
`;

export const OrderIdentity = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 11px;

  > span:first-child {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    border-radius: 18px;
    color: #fff;
    background: #1f1e1a;
  }

  > span:last-child {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  b,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  b {
    font-size: 14px;
  }

  small {
    color: var(--tracking-muted);
    font-size: 11px;
  }
`;

export const Main = styled.main`
  width: min(1120px, calc(100% - 48px));
  margin: 0 auto;
  padding: 34px 0 64px;

  @media (max-width: 520px) {
    width: calc(100% - 24px);
    padding: 24px 0 36px;
  }
`;

export const HeadingRow = styled.div`
  margin-bottom: 22px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(310px, 0.72fr);
  align-items: end;
  gap: 28px;

  h1 {
    margin: 7px 0 7px;
    font: 800 34px/1.12 'Gabarito', 'Inter', sans-serif;
    letter-spacing: -0.03em;
  }

  p {
    max-width: 560px;
    margin: 0;
    color: var(--tracking-muted);
    font-size: 14px;
    line-height: 1.55;
  }

  @media (max-width: 800px) {
    grid-template-columns: 1fr;
    align-items: stretch;
    gap: 24px;
  }

  @media (max-width: 520px) {
    h1 {
      font-size: 31px;
    }
  }
`;

export const Eyebrow = styled.span`
  color: #ad3e13;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const TrackingBar = styled.div<{ $connected: boolean }>`
  min-height: 64px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border: 1px solid ${(props) => (props.$connected ? '#a8d7ba' : '#e7c970')};
  border-radius: 18px;
  color: ${(props) => (props.$connected ? '#1f6340' : '#805b0f')};
  background: ${(props) => (props.$connected ? '#edf8f1' : '#fff8df')};

  > span {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 12px;
    font-weight: 900;
  }

  i {
    width: 9px;
    height: 9px;
    flex: 0 0 auto;
    border-radius: 50%;
    background: ${(props) => (props.$connected ? '#2f9c5b' : '#d49412')};
    box-shadow: 0 0 0 4px
      ${(props) => (props.$connected ? 'rgba(47, 156, 91, 0.14)' : 'rgba(212, 148, 18, 0.14)')};
  }

  small {
    flex: 0 0 auto;
    color: inherit;
    font-size: 10px;
    opacity: 0.8;
  }

  @media (max-width: 420px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
`;

export const Warning = styled.p`
  margin: 0 0 16px;
  padding: 12px 14px;
  border: 1px solid #efc18f;
  border-radius: 8px;
  color: #8d3b15;
  background: #fff4e8;
  font-size: 12px;
  line-height: 1.5;
`;

export const CompletionNotice = styled.div`
  margin-bottom: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #a8d7ba;
  border-radius: 8px;
  color: #1f6340;
  background: #edf8f1;

  > svg {
    width: 27px;
    height: 27px;
    flex: 0 0 auto;
  }

  span {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  small {
    color: #47715a;
    line-height: 1.45;
  }
`;

export const CancelledNotice = styled(CompletionNotice)`
  border-color: #eab1b1;
  color: #8d2929;
  background: #fff0f0;

  small {
    color: #9b4949;
  }
`;

export const ReceiptConfirmation = styled.section<{ $highlight: boolean }>`
  margin-bottom: 16px;
  padding: 16px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  border: 1px solid ${({ $highlight }) => ($highlight ? '#62b47d' : '#bfd3c5')};
  border-radius: 10px;
  background: ${({ $highlight }) => ($highlight ? '#f0fbf3' : '#f7faf7')};
  box-shadow: ${({ $highlight }) =>
    $highlight ? '0 10px 30px rgba(47, 156, 91, 0.12)' : 'none'};

  .receipt-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #fff;
    background: #2f8a50;
  }

  .receipt-icon svg {
    width: 22px;
    height: 22px;
  }

  > div {
    min-width: 0;
    display: grid;
    gap: 7px;
  }

  small {
    color: #3f7252;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
  }

  strong {
    color: #1d3d2b;
    font-size: 17px;
  }

  p {
    margin: 0;
    color: #4d6656;
    font-size: 12px;
    line-height: 1.5;
  }

  button {
    width: fit-content;
    min-height: 44px;
    margin-top: 2px;
    padding: 0 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 8px;
    color: #fff;
    background: #2f8a50;
    font: inherit;
    font-size: 13px;
    font-weight: 900;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    background: #277544;
  }

  button:disabled {
    cursor: wait;
    opacity: 0.68;
  }

  button:focus-visible {
    outline: 3px solid rgba(47, 138, 80, 0.25);
    outline-offset: 2px;
  }

  button svg {
    width: 17px;
    height: 17px;
  }

  em {
    color: #a2372a;
    font-size: 11px;
    font-style: normal;
    line-height: 1.45;
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;

    .receipt-icon {
      width: 38px;
      height: 38px;
    }

    button {
      width: 100%;
    }
  }
`;

export const ReceiptConfirmed = styled(CompletionNotice)`
  border-color: #b9ddc4;
  color: #285e3b;
  background: #f3fbf5;
`;

export const Workspace = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(340px, 0.85fr);
  align-items: start;
  gap: 18px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

export const RouteNotice = styled.p`
  margin: 0 0 10px;
  padding: 10px 12px;
  border: 1px solid #d8e1dc;
  border-radius: 8px;
  color: #54635c;
  background: #f8faf8;
  font-size: 10px;
  line-height: 1.45;

  small {
    display: block;
    margin-top: 4px;
    color: #728078;
    font-size: 9px;
  }
`;

export const MapArea = styled.section`
  min-width: 0;

  .delivery-map-shell {
    height: min(68vh, 660px);
    min-height: 520px;
    margin-inline: 0;
    border: 1px solid var(--courier-line);
    border-radius: 8px;
  }

  @media (max-width: 560px) {
    .delivery-map-shell {
      width: 100%;
      height: 300px;
      min-height: 300px;
      margin-inline: 0;
      border-right: 1px solid var(--courier-line);
      border-left: 1px solid var(--courier-line);
      border-radius: 16px;
    }
  }
`;

export const DeliveryStatusCard = styled.section`
  margin: 16px 20px 0;
  padding: 16px 0;
  border-top: 1px solid #e7e9e6;
  border-bottom: 1px solid #e7e9e6;
`;

export const DeliveryStatusHeader = styled.header`
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h2 {
    margin: 0;
    font-size: 14px;
  }

  strong {
    padding: 5px 9px;
    border-radius: 999px;
    color: #237b43;
    background: #edf8f0;
    font-size: 10px;
    font-weight: 850;
  }
`;

export const DeliveryStatusList = styled.div`
  display: grid;
  gap: 12px;
`;

export const DeliveryStatusItem = styled.div<{ $active: boolean; $complete: boolean }>`
  display: flex;
  align-items: center;
  gap: 9px;
  color: ${p => p.$active ? '#e8562c' : p.$complete ? '#2f8a50' : '#85817b'};
  font-size: 12px;
  font-weight: ${p => p.$active ? 850 : 650};
  svg { width: 17px; height: 17px; }
`;

export const DetailsPanel = styled.aside`
  min-width: 0;
  overflow: hidden;
  border: 1px solid #efece6;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(31, 30, 26, 0.06);
`;

export const PanelHeader = styled.header`
  padding: 20px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  color: #fff;
  background: #173c42;

  > span {
    min-width: 0;
    display: grid;
    gap: 5px;
  }

  small {
    color: #c9dcda;
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
  }

  strong {
    font:
      800 20px 'Gabarito', 'Inter', sans-serif;
  }
`;

export const StatusPill = styled.span<{ $tone: 'active' | 'success' | 'danger' }>`
  flex: 0 0 auto;
  padding: 6px 8px;
  border-radius: 6px;
  color: ${(props) =>
    props.$tone === 'success' ? '#143d27' : props.$tone === 'danger' ? '#6e2020' : '#27350c'};
  background: ${(props) =>
    props.$tone === 'success' ? '#aee4bf' : props.$tone === 'danger' ? '#f2b8b8' : '#d8f06a'};
  font-size: 9px;
  font-weight: 900;
  text-transform: uppercase;
`;

export const Summary = styled.dl`
  margin: 0;
  padding: 6px 20px;

  > div {
    padding: 16px 0;
    display: grid;
    gap: 6px;
    border-bottom: 1px solid #e7e9e6;
  }

  dt {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--tracking-muted);
    font-size: 11px;
    font-weight: 800;
  }

  dt svg {
    width: 15px;
    height: 15px;
    color: #447369;
  }

  dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
    font-size: 15px;
    font-weight: 800;
  }

  small {
    color: var(--tracking-muted);
    font-size: 10px;
  }
`;

export const Destination = styled.div`
  margin: 16px 20px 0;
  padding: 14px 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border-top: 1px solid #cedad6;
  border-bottom: 1px solid #cedad6;
  color: #20483f;

  > svg {
    width: 19px;
    color: #e45118;
  }

  > span {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  small {
    color: var(--tracking-muted);
    font-size: 10px;
  }

  strong {
    overflow-wrap: anywhere;
    font-size: 12px;
  }

  b {
    font-size: 12px;
    white-space: nowrap;
  }

  @media (max-width: 360px) {
    grid-template-columns: auto minmax(0, 1fr);

    b {
      grid-column: 2;
      justify-self: start;
    }
  }
`;

export const Contact = styled.a`
  min-height: 46px;
  margin: 16px 20px 0;
  padding: 0 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 7px;
  color: #fff;
  background: #28705d;
  text-decoration: none;
  font-size: 13px;
  font-weight: 800;

  svg {
    width: 17px;
  }

  &:hover {
    background: #205d4d;
  }

  &:focus-visible {
    outline: 3px solid rgba(40, 112, 93, 0.25);
    outline-offset: 2px;
  }
`;

export const Privacy = styled.p`
  margin: 17px 20px 20px;
  color: #77827d;
  font-size: 10px;
  line-height: 1.5;
`;

export const State = styled.section`
  min-height: min(68vh, 560px);
  padding: 32px 20px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 12px;
  border: 1px solid #d8dcd7;
  border-radius: 8px;
  color: var(--tracking-muted);
  background: rgba(255, 255, 255, 0.84);
  text-align: center;

  > svg {
    width: 38px;
    height: 38px;
    color: #e45118;
  }

  .spinning {
    animation: tracking-spin 1s linear infinite;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1,
  h2 {
    max-width: 520px;
    color: #273a33;
    font:
      700 24px/1.25 Georgia,
      serif;
  }

  p {
    max-width: 460px;
    font-size: 13px;
    line-height: 1.55;
  }

  @keyframes tracking-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const MapPlaceholder = styled(State)`
  min-height: 520px;

  @media (max-width: 560px) {
    min-height: 430px;
  }
`;

export const RetryButton = styled.button`
  min-height: 44px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 7px;
  color: #fff;
  background: #e45118;
  font: inherit;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;

  svg {
    width: 17px;
    height: 17px;
  }

  &:hover {
    background: #c94210;
  }

  &:focus-visible {
    outline: 3px solid rgba(228, 81, 24, 0.25);
    outline-offset: 2px;
  }
`;