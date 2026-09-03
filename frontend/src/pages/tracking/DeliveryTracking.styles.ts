import styled from 'styled-components';

export const Page = styled.div`
  --courier-line: #d7dcd7;
  --courier-primary: #e45118;
  --tracking-ink: #182722;
  --tracking-muted: #63706a;
  min-height: 100vh;
  min-height: 100dvh;
  color: var(--tracking-ink);
  background-color: #f4f2ed;
  background-image: linear-gradient(180deg, #e9efea 0, #f4f2ed 300px);
  font-family: Aptos, 'Segoe UI Variable', 'Segoe UI', sans-serif;

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
  border-bottom: 1px solid rgba(24, 39, 34, 0.12);
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(12px);
`;

export const HeaderInner = styled.div`
  width: min(1180px, calc(100% - 40px));
  min-height: 72px;
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
  min-height: 42px;
  padding: 0 10px 0 6px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 7px;
  color: #34443d;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;

  svg {
    width: 18px;
  }

  &:hover {
    background: #f0f2ef;
  }

  &:focus-visible {
    outline: 3px solid rgba(228, 81, 24, 0.24);
    outline-offset: 2px;
  }

  @media (max-width: 380px) {
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
    border-radius: 8px;
    color: #fff;
    background: #173c42;
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
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 38px 0 56px;

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
    font:
      700 38px/1.12 Georgia,
      serif;
    letter-spacing: 0;
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
    gap: 18px;
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
  border-radius: 8px;
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

export const Workspace = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(280px, 0.75fr);
  align-items: start;
  gap: 18px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
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
      height: min(64vh, 560px);
      min-height: 430px;
      margin-inline: 0;
      border-right: 1px solid var(--courier-line);
      border-left: 1px solid var(--courier-line);
      border-radius: 8px;
    }
  }
`;

export const DetailsPanel = styled.aside`
  min-width: 0;
  overflow: hidden;
  border: 1px solid #d8dcd7;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 14px 34px rgba(24, 39, 34, 0.07);
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
      700 20px Georgia,
      serif;
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
