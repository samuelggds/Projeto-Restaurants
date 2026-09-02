import styled from 'styled-components';

export const Root = styled.div<{ $primary: string }>`
  --brand: ${(props) => props.$primary};
  --ink: #1b2421;
  --muted: #66716d;
  --line: #dfe5e1;
  --paper: #ffffff;
  --canvas: #f4f7f4;
  --teal: #14786f;
  --amber: #a15c08;
  --red: #b83d3d;
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  color: var(--ink);
  background-color: var(--canvas);
  background-image:
    linear-gradient(rgba(27, 36, 33, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(27, 36, 33, 0.025) 1px, transparent 1px);
  background-size: 32px 32px;
  font-family: Sora, 'Segoe UI', sans-serif;
  letter-spacing: 0;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  button,
  input,
  select {
    font: inherit;
    letter-spacing: 0;
  }

  button,
  select {
    cursor: pointer;
  }

  @media (max-width: 840px) {
    height: 100vh;
    height: 100dvh;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) 72px;
    overflow: hidden;
  }
`;

export const Sidebar = styled.aside`
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100dvh;
  padding: 24px 14px 18px;
  display: flex;
  flex-direction: column;
  color: #f4f8f5;
  background: #17211e;
  border-right: 1px solid #26322e;
  z-index: 50;

  @media (max-width: 840px) {
    display: none;
  }
`;

export const Brand = styled.div`
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 11px;
  padding: 0 8px 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  .mark {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border: 1px solid var(--brand);
    border-radius: 8px;
    color: var(--brand);
    background: rgba(255, 255, 255, 0.04);
    font-family: Syne, sans-serif;
    font-size: 17px;
    font-weight: 800;
  }

  span:last-child {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  strong {
    overflow: hidden;
    color: #f6f8f7;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: #8fa19a;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
  }
`;

export const Navigation = styled.nav`
  display: grid;
  gap: 5px;
  margin-top: 22px;

  button {
    min-width: 0;
    height: 48px;
    padding: 0 13px;
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr) auto;
    align-items: center;
    gap: 11px;
    border: 0;
    border-left: 2px solid transparent;
    border-radius: 6px;
    color: #aebbb6;
    background: transparent;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
  }

  button:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.06);
  }

  button.active {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.09);
    border-left-color: var(--brand);
  }

  svg {
    width: 18px;
    height: 18px;
  }

  i {
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: #17211e;
    background: #f2c96d;
    font-size: 9px;
    font-style: normal;
    font-weight: 800;
  }
`;

export const SidebarFooter = styled.div`
  margin-top: auto;
  padding: 16px 6px 0;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 9px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  .avatar {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border: 1px solid #496059;
    border-radius: 50%;
    color: #dce7e2;
    background: #263630;
    font-size: 11px;
    font-weight: 800;
  }

  span:nth-child(2) {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  strong,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: #edf2ef;
    font-size: 11px;
  }

  small {
    color: #81928c;
    font-size: 9px;
  }
`;

export const IconButton = styled.button`
  width: 38px;
  height: 38px;
  padding: 0;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 7px;
  color: #44514c;
  background: #ffffff;

  &:hover:not(:disabled) {
    color: var(--teal);
    border-color: #9dc6bf;
    background: #f1f8f6;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }

  svg {
    width: 18px;
    height: 18px;
  }

  svg.spinning {
    animation: attendant-spin 0.8s linear infinite;
  }

  @keyframes attendant-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const SidebarLogout = styled(IconButton)`
  width: 34px;
  height: 34px;
  border-color: rgba(255, 255, 255, 0.09);
  color: #93a49e;
  background: rgba(255, 255, 255, 0.04);

  &:hover:not(:disabled) {
    color: #ffb4b4;
    border-color: rgba(255, 125, 125, 0.32);
    background: rgba(184, 61, 61, 0.12);
  }
`;

export const Main = styled.main`
  min-width: 0;

  @media (max-width: 840px) {
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
`;

export const Topbar = styled.header`
  min-height: 92px;
  padding: 18px 30px;
  display: flex;
  align-items: center;
  gap: 18px;
  position: sticky;
  top: 0;
  z-index: 30;
  border-bottom: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(12px);

  @media (max-width: 840px) {
    min-height: 76px;
    padding: 12px 14px;
  }
`;

export const MobileIdentity = styled.div`
  display: none;
  flex: 0 0 38px;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid var(--brand);
  border-radius: 7px;
  color: var(--brand);
  background: #fff;
  font-family: Syne, sans-serif;
  font-size: 14px;
  font-weight: 800;

  @media (max-width: 840px) {
    display: grid;
  }
`;

export const PageTitle = styled.div`
  min-width: 0;

  h1 {
    margin: 0;
    color: #17211e;
    font-family: 'Space Grotesk', Sora, sans-serif;
    font-size: 24px;
    line-height: 1.15;
    font-weight: 700;
  }

  p {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 11px;
  }

  @media (max-width: 560px) {
    h1 {
      font-size: 18px;
    }

    p {
      display: none;
    }
  }
`;

export const TopActions = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const SyncStatus = styled.div`
  min-width: 140px;
  display: grid;
  justify-items: end;
  gap: 3px;
  color: #48544f;
  font-size: 10px;

  span {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--teal);
    font-weight: 700;
  }

  i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #34a77f;
    box-shadow: 0 0 0 3px rgba(52, 167, 127, 0.14);
  }

  small {
    color: #84908b;
    font-size: 9px;
  }

  @media (max-width: 560px) {
    display: none;
  }
`;

export const MobileLogout = styled(IconButton)`
  display: none;

  @media (max-width: 840px) {
    display: grid;
  }
`;

export const Content = styled.div`
  width: min(100%, 1480px);
  margin: 0 auto;
  padding: 24px 30px 42px;

  > * {
    animation: attendant-enter 0.24s ease both;
  }

  @keyframes attendant-enter {
    from {
      transform: translateY(5px);
    }
    to {
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    > * {
      animation: none;
    }
  }

  @media (max-width: 840px) {
    padding: 18px 14px 24px;
  }
`;

export const Notice = styled.div`
  margin-bottom: 18px;
  padding: 13px 14px;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  border: 1px solid #e7bc7c;
  border-radius: 7px;
  color: #71460d;
  background: #fff8e9;

  svg {
    width: 19px;
  }

  span {
    display: grid;
    gap: 2px;
  }

  strong {
    font-size: 11px;
  }

  small {
    font-size: 10px;
  }

  button {
    border: 0;
    color: #71460d;
    background: transparent;
    font-size: 10px;
    font-weight: 800;
    text-decoration: underline;
  }

  @media (max-width: 560px) {
    grid-template-columns: 18px minmax(0, 1fr);

    button {
      grid-column: 2;
      justify-self: start;
      padding: 0;
    }
  }
`;

export const Loading = styled.div`
  min-height: 52vh;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 10px;
  color: var(--muted);
  text-align: center;

  .loader {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border: 1px solid #b9cec7;
    border-radius: 50%;
    color: var(--teal);
    background: #fff;
  }

  svg {
    width: 20px;
    animation: attendant-spin 0.8s linear infinite;
  }

  strong {
    color: var(--ink);
    font-size: 13px;
  }

  span {
    max-width: 320px;
    font-size: 10px;
  }
`;

export const MetricGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 20px;

  @media (max-width: 1120px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const Metric = styled.article<{ $tone: 'neutral' | 'teal' | 'amber' | 'red' }>`
  min-height: 106px;
  padding: 16px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 13px;
  border: 1px solid var(--line);
  border-top: 3px solid
    ${(props) =>
      props.$tone === 'red'
        ? '#cc5555'
        : props.$tone === 'amber'
          ? '#d29432'
          : props.$tone === 'teal'
            ? '#258b7e'
            : '#7a8781'};
  border-radius: 7px;
  background: var(--paper);

  .metric-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 7px;
    color: ${(props) =>
      props.$tone === 'red'
        ? '#a52e2e'
        : props.$tone === 'amber'
          ? '#946016'
          : props.$tone === 'teal'
            ? '#14786f'
            : '#58655f'};
    background: ${(props) =>
      props.$tone === 'red'
        ? '#fff0f0'
        : props.$tone === 'amber'
          ? '#fff6e6'
          : props.$tone === 'teal'
            ? '#edf8f5'
            : '#f2f4f3'};
  }

  svg {
    width: 20px;
  }

  span:last-child {
    min-width: 0;
    display: grid;
  }

  strong {
    color: #17211e;
    font-family: 'Space Grotesk', Sora, sans-serif;
    font-size: 26px;
    line-height: 1;
  }

  small {
    margin-top: 7px;
    color: var(--muted);
    font-size: 10px;
    font-weight: 600;
  }

  @media (max-width: 560px) {
    min-height: 92px;
    padding: 12px;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 9px;

    .metric-icon {
      width: 34px;
      height: 34px;
    }

    strong {
      font-size: 22px;
    }
  }
`;

export const OverviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 24px;

  @media (max-width: 1050px) {
    grid-template-columns: 1fr;
  }
`;

export const Panel = styled.section`
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--paper);
  overflow: hidden;
`;

export const PanelHeader = styled.header`
  min-height: 58px;
  padding: 12px 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--line);

  .heading-icon {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 7px;
    color: var(--teal);
    background: #edf7f4;
  }

  svg {
    width: 17px;
  }

  span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  h2 {
    margin: 0;
    color: #1a2420;
    font-size: 12px;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 9px;
  }
`;

export const TextButton = styled.button`
  margin-left: auto;
  padding: 7px 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  border: 0;
  border-radius: 5px;
  color: var(--teal);
  background: transparent;
  font-size: 9px;
  font-weight: 800;

  &:hover {
    background: #edf7f4;
  }

  svg {
    width: 14px;
  }
`;

export const Queue = styled.div`
  display: grid;
`;

export const QueueRow = styled.article`
  min-height: 78px;
  padding: 13px 15px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  border-bottom: 1px solid #edf0ee;

  &:last-child {
    border-bottom: 0;
  }

  .row-icon {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 1px solid #d5dfdb;
    border-radius: 7px;
    color: #56655f;
    background: #f8faf9;
  }

  .row-icon.urgent {
    color: var(--red);
    border-color: #efc2c2;
    background: #fff1f1;
  }

  .row-icon.ready {
    color: var(--teal);
    border-color: #b9d8d2;
    background: #edf8f5;
  }

  .row-icon svg {
    width: 18px;
  }

  .row-body {
    min-width: 0;
    display: grid;
    gap: 5px;
  }

  .row-top {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .row-top strong {
    overflow: hidden;
    color: #1b2521;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-body small {
    overflow: hidden;
    color: var(--muted);
    font-size: 9px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  time {
    color: #7a8580;
    font-size: 9px;
    font-weight: 700;
    white-space: nowrap;
  }

  @media (max-width: 560px) {
    padding: 11px 12px;
    grid-template-columns: 34px minmax(0, 1fr);

    .row-icon {
      width: 34px;
      height: 34px;
    }

    time {
      grid-column: 2;
      justify-self: start;
    }
  }
`;

export const StatusPill = styled.span<{ $tone: 'neutral' | 'teal' | 'amber' | 'red' }>`
  flex: 0 0 auto;
  padding: 4px 7px;
  border-radius: 10px;
  color: ${(props) =>
    props.$tone === 'red'
      ? '#9f2f2f'
      : props.$tone === 'amber'
        ? '#85530d'
        : props.$tone === 'teal'
          ? '#0f685f'
          : '#53605b'};
  background: ${(props) =>
    props.$tone === 'red'
      ? '#ffeded'
      : props.$tone === 'amber'
        ? '#fff3db'
        : props.$tone === 'teal'
          ? '#e8f7f3'
          : '#eef1ef'};
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  white-space: nowrap;
`;

export const Empty = styled.div`
  min-height: 180px;
  padding: 28px 16px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  color: var(--muted);
  text-align: center;

  .empty-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border: 1px solid #d8e0dc;
    border-radius: 50%;
    color: #78867f;
    background: #f7f9f8;
  }

  svg {
    width: 19px;
  }

  strong {
    color: #33413b;
    font-size: 11px;
  }

  span {
    max-width: 330px;
    font-size: 9px;
    line-height: 1.6;
  }
`;

export const SectionHeader = styled.header`
  margin: 0 0 12px;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;

  h2 {
    margin: 0;
    color: #1b2521;
    font-size: 14px;
  }

  p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 9px;
  }

  > span {
    color: #7a8680;
    font-size: 9px;
    white-space: nowrap;
  }
`;

export const TableGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 1180px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 650px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const TableCard = styled.article<{ $attention: boolean }>`
  min-height: 138px;
  padding: 14px;
  display: grid;
  align-content: space-between;
  gap: 14px;
  border: 1px solid ${(props) => (props.$attention ? '#e6bb73' : 'var(--line)')};
  border-left: 4px solid ${(props) => (props.$attention ? '#d2912e' : '#369486')};
  border-radius: 7px;
  background: ${(props) => (props.$attention ? '#fffbf2' : 'var(--paper)')};

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  .table-number {
    display: grid;
    gap: 3px;
  }

  .table-number small {
    color: var(--muted);
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .table-number strong {
    font-family: 'Space Grotesk', Sora, sans-serif;
    font-size: 25px;
    line-height: 1;
  }

  time {
    color: #7d8883;
    font-size: 8px;
  }

  @media (max-width: 430px) {
    padding: 12px 10px;
  }
`;

export const TableStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;

  span {
    min-width: 0;
    display: grid;
    justify-items: center;
    gap: 3px;
    color: #69766f;
    font-size: 7px;
    text-align: center;
  }

  b {
    color: #28352f;
    font-size: 11px;
  }

  svg {
    width: 14px;
  }
`;

export const Toolbar = styled.div`
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;

  @media (max-width: 620px) {
    align-items: stretch;
  }
`;

export const SearchBox = styled.label`
  min-width: 220px;
  height: 42px;
  padding: 0 12px;
  flex: 1 1 280px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 7px;
  color: #7a8680;
  background: #fff;

  &:focus-within {
    border-color: #80b5ac;
    box-shadow: 0 0 0 3px rgba(20, 120, 111, 0.08);
  }

  svg {
    width: 17px;
    flex: 0 0 auto;
  }

  input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    color: var(--ink);
    background: transparent;
    font-size: 10px;
  }
`;

export const Segmented = styled.div`
  min-height: 42px;
  padding: 3px;
  display: flex;
  align-items: center;
  gap: 2px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: #fff;

  button {
    min-height: 34px;
    padding: 0 10px;
    border: 0;
    border-radius: 5px;
    color: #69756f;
    background: transparent;
    font-size: 9px;
    font-weight: 700;
    white-space: nowrap;
  }

  button.active {
    color: #ffffff;
    background: #27352f;
  }

  @media (max-width: 620px) {
    width: 100%;
    overflow-x: auto;

    button {
      flex: 1 0 auto;
    }
  }
`;

export const Select = styled.select`
  height: 42px;
  min-width: 142px;
  padding: 0 32px 0 11px;
  border: 1px solid var(--line);
  border-radius: 7px;
  outline: 0;
  color: #44514c;
  background: #fff;
  font-size: 9px;
  font-weight: 700;

  &:focus {
    border-color: #80b5ac;
  }

  @media (max-width: 620px) {
    width: 100%;
  }
`;

export { OrderList, OrderRow } from './AttendantOrder.styles';

export const CallList = styled.section`
  display: grid;
  gap: 8px;
`;

export const CallRow = styled.article<{ $urgent: boolean; $resolved: boolean }>`
  min-height: 92px;
  padding: 14px 16px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  border: 1px solid
    ${(props) => (props.$urgent ? '#e8b8b8' : props.$resolved ? '#dfe5e1' : '#d8e1dd')};
  border-left: 4px solid
    ${(props) => (props.$urgent ? '#ca5151' : props.$resolved ? '#91a098' : '#d49633')};
  border-radius: 7px;
  background: ${(props) => (props.$urgent ? '#fffafa' : '#fff')};

  .call-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 7px;
    color: ${(props) => (props.$urgent ? '#aa3535' : '#805214')};
    background: ${(props) => (props.$urgent ? '#ffeded' : '#fff4df')};
  }

  .call-icon svg {
    width: 19px;
  }

  .call-body {
    min-width: 0;
    display: grid;
    gap: 6px;
  }

  .call-body div {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px;
  }

  .call-body strong {
    color: #1b2521;
    font-size: 12px;
  }

  .call-body p {
    margin: 0;
    color: var(--muted);
    font-size: 9px;
  }

  .call-time {
    display: grid;
    justify-items: end;
    gap: 4px;
    color: #5e6b65;
  }

  .call-time strong {
    font-size: 10px;
  }

  .call-time small {
    color: #87928d;
    font-size: 8px;
  }

  @media (max-width: 560px) {
    grid-template-columns: 36px minmax(0, 1fr);
    padding: 12px;

    .call-icon {
      width: 36px;
      height: 36px;
    }

    .call-time {
      grid-column: 2;
      justify-items: start;
    }
  }
`;

export const BottomNav = styled.nav`
  display: none;

  @media (max-width: 840px) {
    height: 72px;
    padding: 7px 8px max(7px, env(safe-area-inset-bottom));
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    position: static;
    z-index: 60;
    border-top: 1px solid #dce3df;
    background: rgba(255, 255, 255, 0.97);
    backdrop-filter: blur(12px);

    button {
      min-width: 0;
      display: grid;
      place-items: center;
      align-content: center;
      gap: 4px;
      border: 0;
      border-radius: 6px;
      color: #75817c;
      background: transparent;
      font-size: 8px;
      font-weight: 700;
    }

    button.active {
      color: #0e6f66;
      background: #edf7f4;
    }

    svg {
      width: 19px;
    }
  }
`;
