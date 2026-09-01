import styled from 'styled-components';
import type { OrderStatus } from './types';
import { kitchenItemConfigurationStyles } from './KitchenItemConfiguration.styles';
export const Root = styled.div<{ $primary: string; $sidebarOpen?: boolean }>`
  --brand: ${(p) => p.$primary};
  --ink: #17191b;
  --muted: #687079;
  --border: #e5e1dc;
  --surface: #fff;
  min-height: 100vh;
  min-height: 100dvh;
  background: #fbfaf8;
  color: var(--ink);
  display: grid;
  grid-template-columns: ${(p) => (p.$sidebarOpen === false ? '0px' : '244px')} minmax(0, 1fr);
  transition: grid-template-columns 0.25s ease;
  button {
    cursor: pointer;
  }
  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  summary:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--brand) 28%, transparent);
    outline-offset: 2px;
  }
  a {
    cursor: pointer;
  }
  @media (max-width: 820px) {
    display: block;
  }
`;
export const Sidebar = styled.aside<{ $open: boolean }>`
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100dvh;
  background: linear-gradient(175deg, #1a2530 0%, #0e1820 100%);
  color: #fff;
  padding: 22px 14px 22px;
  display: flex;
  flex-direction: column;
  z-index: 80;
  overflow: hidden;
  min-width: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  @media (max-width: 820px) {
    position: fixed;
    inset: 0 auto 0 0;
    width: min(86vw, 310px);
    transform: translateX(${(p) => (p.$open ? '0' : '-105%')});
    transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 24px 0 60px #0009;
  }
`;
export const Brand = styled.div`
  padding: 2px 12px 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  span {
    display: block;
    color: #ff6b1a;
    font:
      52px Georgia,
      serif;
    letter-spacing: -0.1em;
    text-shadow: 0 0 24px rgba(255, 107, 26, 0.4);
  }
  b {
    display: block;
    font-size: 17px;
    font-weight: 700;
    margin-top: 2px;
    color: #f0f2f4;
  }
  small {
    display: block;
    color: #607077;
    font-size: 9px;
    letter-spacing: 0.18em;
    margin-top: 10px;
    text-transform: uppercase;
  }
`;
export const CloseMenu = styled.button`
  display: none;
  position: absolute;
  right: 14px;
  top: 14px;
  border: 0;
  background: #ffffff12;
  color: #fff;
  border-radius: 9px;
  width: 38px;
  height: 38px;
  place-items: center;
  @media (max-width: 820px) {
    display: grid;
  }
`;
export const Nav = styled.nav`
  display: grid;
  gap: 4px;
  margin-top: 18px;
  a,
  button {
    height: 52px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    gap: 13px;
    color: rgba(212, 218, 222, 0.75);
    text-decoration: none;
    border-radius: 10px;
    border: 0;
    border-left: 2px solid transparent;
    font-family: inherit;
    font-size: 13.5px;
    font-weight: 500;
    cursor: pointer;
    width: 100%;
    background: transparent;
    text-align: left;
    transition:
      background 0.18s ease,
      color 0.18s ease,
      border-color 0.18s ease;
  }
  a:hover,
  button:hover {
    color: #e8eaec;
    background: rgba(255, 255, 255, 0.06);
  }
  a.active,
  button.active {
    color: #ff8040;
    background: rgba(255, 107, 20, 0.14);
    border-left-color: #ff6b14;
    font-weight: 650;
  }
  svg {
    width: 20px;
    flex-shrink: 0;
    opacity: 0.85;
  }
  a.active svg,
  button.active svg {
    opacity: 1;
  }
`;
export const BottomNav = styled(Nav)`
  margin-top: auto;
  margin-bottom: 10px;
`;
export const User = styled.div`
  margin-top: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 18px 8px 0;
  display: grid;
  grid-template-columns: 42px 1fr 30px;
  align-items: center;
  gap: 10px;
  .avatar {
    width: 42px;
    height: 42px;
    background: rgba(255, 107, 26, 0.18);
    border: 1.5px solid rgba(255, 107, 26, 0.5);
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #ff8040;
    font-weight: 800;
    font-size: 14px;
  }
  span:not(.avatar) {
    display: grid;
    gap: 3px;
    min-width: 0;
  }
  b {
    font-size: 13px;
    color: #e8eaec;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  small {
    color: #607077;
    font-size: 11px;
  }
  button {
    border: 0;
    background: rgba(255, 255, 255, 0.06);
    color: #8fa0aa;
    padding: 0;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    transition:
      background 0.15s,
      color 0.15s;
    &:hover {
      background: rgba(220, 60, 60, 0.18);
      color: #f87171;
    }
  }
  svg {
    width: 17px;
  }
`;
export const CollapseBtn = styled.button`
  align-self: flex-end;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 12px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
  &:hover {
    background: rgba(255, 255, 255, 0.13);
    color: #fff;
  }
  svg {
    width: 18px;
  }
  @media (max-width: 820px) {
    display: none;
  }
`;
export const SidebarOpenTab = styled.button`
  position: fixed;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 81;
  width: 22px;
  height: 60px;
  border: none;
  border-radius: 0 10px 10px 0;
  background: linear-gradient(175deg, #1a2530, #0e1820);
  color: rgba(255, 255, 255, 0.65);
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 3px 0 16px rgba(0, 0, 0, 0.35);
  transition:
    color 0.15s,
    background 0.15s;
  &:hover {
    background: linear-gradient(175deg, #243040, #142030);
    color: #fff;
  }
  svg {
    width: 14px;
  }
  @media (max-width: 820px) {
    display: none;
  }
`;
export const Overlay = styled.div`
  display: block;
  position: fixed;
  inset: 0;
  background: #0006;
  z-index: 70;
  @media (min-width: 821px) {
    display: none;
  }
`;
export const Main = styled.main`
  min-width: 0;
`;
export const Top = styled.header`
  min-height: 126px;
  background: #fffdfb;
  border-bottom: 1px solid var(--border);
  padding: 24px 32px;
  display: flex;
  align-items: center;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 30;
  h1 {
    margin: 0 0 5px;
    font-size: 31px;
    line-height: 1.15;
  }
  p {
    margin: 0;
    color: var(--muted);
    font-size: 14px;
  }
  @media (max-width: 650px) {
    min-height: 92px;
    padding: 14px 12px;
    h1 {
      font-size: 21px;
    }
    p {
      font-size: 11px;
    }
  }
`;
export const MobileMenu = styled.button`
  display: none;
  flex: 0 0 42px;
  width: 42px;
  height: 42px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  place-items: center;
  flex-shrink: 0;
  @media (max-width: 820px) {
    display: grid;
  }
`;
export const Live = styled.button`
  margin-left: auto;
  white-space: nowrap;
  border: 1px solid #f0d7ca;
  background: #fff8f4;
  border-radius: 10px;
  padding: 12px 15px;
  color: #e74c0b;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  &:disabled {
    cursor: wait;
    opacity: 0.75;
  }
  .spinning {
    animation: kitchen-spin 0.8s linear infinite;
  }
  @keyframes kitchen-spin {
    to {
      transform: rotate(360deg);
    }
  }
  svg {
    width: 19px;
  }
  i {
    width: 4px;
    height: 4px;
    background: currentColor;
    border-radius: 50%;
  }
  @media (max-width: 560px) {
    font-size: 0;
    padding: 10px;
    svg {
      width: 21px;
    }
    i {
      display: none;
    }
  }
`;
export const Content = styled.div`
  width: 100%;
  max-width: 1390px;
  margin: 0 auto;
  padding: 24px 28px 70px;
  @media (max-width: 650px) {
    padding: 14px 10px 60px;
  }
`;
export const WorkspaceNotice = styled.div`
  margin-bottom: 16px;
  border: 1px solid #efc5ad;
  border-radius: 12px;
  padding: 12px 14px;
  color: #803d20;
  background: #fff7f1;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  > svg {
    width: 20px;
  }
  span {
    display: grid;
    gap: 2px;
  }
  small {
    color: #855f4d;
    line-height: 1.4;
  }
  button {
    min-height: 36px;
    border: 1px solid #e6b99f;
    border-radius: 8px;
    padding: 0 12px;
    color: inherit;
    background: #fff;
    font-weight: 700;
  }
  @media (max-width: 560px) {
    grid-template-columns: 20px 1fr;
    button {
      grid-column: 1/-1;
    }
  }
`;
export const WorkspaceLoading = styled.div`
  min-height: 360px;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 9px;
  color: var(--muted);
  text-align: center;
  > svg {
    width: 32px;
    color: var(--brand);
    animation: kitchen-loading-spin 0.8s linear infinite;
  }
  b {
    color: var(--ink);
    font-size: 17px;
  }
  span {
    font-size: 12px;
  }
  @keyframes kitchen-loading-spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  input,
  select,
  button,
  .live {
    height: 46px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: #fff;
    padding: 0 14px;
    color: var(--ink);
  }
  input {
    flex: 1;
    min-width: 160px;
  }
  select {
    min-width: 170px;
  }
  .live {
    margin-left: auto;
    color: #26813a;
    background: #f3faf4;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
  }
  .live.connecting {
    color: #8a6418;
    background: #fff9e8;
  }
  .live.disconnected {
    color: #687079;
    background: #f5f6f7;
  }
  .live::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    margin-right: 8px;
    border-radius: 50%;
    background: #1f9c3b;
  }
  .live.connecting::before {
    background: #d69a22;
  }
  .live.disconnected::before {
    background: #8a9299;
  }
  @media (max-width: 760px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    input {
      grid-column: 1/-1;
    }
    .live {
      margin: 0;
    }
  }
  @media (max-width: 440px) {
    grid-template-columns: 1fr;
    input,
    .live {
      grid-column: auto;
    }
    select,
    button,
    .live {
      width: 100%;
    }
  }
`;
export const Metrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
  @media (max-width: 1000px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 480px) {
    display: flex;
    overflow: auto;
    scroll-snap-type: x mandatory;
    margin-inline: -10px;
    padding-inline: 10px;
    scrollbar-width: none;
  }
`;
export const Metric = styled.article<{ $tone?: 'green' }>`
  min-height: 112px;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: #fff;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 15px #3d261208;
  i {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: ${(p) => (p.$tone ? '#e9f6ea' : '#fff0e8')};
    color: ${(p) => (p.$tone ? '#208139' : 'var(--brand)')};
  }
  i svg {
    width: 27px;
  }
  span {
    display: grid;
    gap: 4px;
  }
  small {
    font-size: 13px;
    color: #4f555b;
  }
  b {
    font-size: 30px;
    color: ${(p) => (p.$tone ? '#168132' : 'var(--brand)')};
  }
  @media (max-width: 480px) {
    flex: 0 0 210px;
    scroll-snap-align: start;
  }
`;
export const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.9fr);
  gap: 18px;
  @media (max-width: 1020px) {
    grid-template-columns: 1fr;
  }
`;
export const Card = styled.section`
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
  padding: 20px;
  min-width: 0;
  box-shadow: 0 4px 18px #3d261207;
  > header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }
  h2 {
    font-size: 20px;
    margin: 0;
  }
  header p {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 12px;
  }
  @media (max-width: 560px) {
    padding: 14px 10px;
  }
`;
export const Stack = styled.div`
  display: grid;
  gap: 11px;
`;
export const PriorityOrder = styled.article`
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 11px;
  padding: 14px;
  background: #fff;
  color: inherit;
  font: inherit;
  text-align: left;
  display: grid;
  grid-template-columns: minmax(130px, 0.8fr) minmax(180px, 1.2fr) auto;
  align-items: center;
  gap: 15px;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease,
    background 180ms ease;
  &:hover {
    border-color: color-mix(in srgb, var(--brand) 45%, var(--border));
    background: color-mix(in srgb, var(--brand) 3%, #fff);
    box-shadow: 0 9px 22px rgba(41, 25, 11, 0.1);
    transform: translateY(-2px);
  }
  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--brand) 22%, transparent);
    outline-offset: 3px;
  }
  .identity {
    display: grid;
    gap: 5px;
  }
  .identity b {
    font-size: 16px;
  }
  .identity span {
    font-size: 11px;
    color: #66707b;
  }
  .right {
    display: grid;
    justify-items: end;
    gap: 9px;
  }
  button {
    height: 36px;
    border: 1px solid var(--border);
    background: #fff;
    border-radius: 8px;
    padding: 0 12px;
    font-weight: 650;
  }
  @media (max-width: 580px) {
    grid-template-columns: 1fr auto;
    .items {
      grid-column: 1/-1;
    }
    .right {
      grid-column: 2;
      grid-row: 1;
    }
  }
`;
export const ItemList = styled.div`
  ${kitchenItemConfigurationStyles}
  display: grid;
  min-width: 0;
  gap: 8px;
  font-size: 12px;
  color: #333c44;
  > span {
    display: block;
  }
  .missing-items {
    padding: 8px;
    border: 1px solid #efb6b6;
    border-radius: 7px;
    color: #8b2525;
    background: #fff3f3;
    font-weight: 700;
  }
  .order-item {
    min-width: 0;
    display: grid;
    gap: 6px;
    padding: 9px;
    border: 1px solid #ece5df;
    border-radius: 9px;
    background: #fcfbfa;
  }
  .item-name {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  .item-name > span {
    flex: 0 0 auto;
    display: inline-grid;
    min-width: 27px;
    height: 24px;
    place-items: center;
    padding-inline: 5px;
    border-radius: 6px;
    color: var(--brand);
    background: color-mix(in srgb, var(--brand) 10%, #fff);
    font-size: 10px;
    font-weight: 850;
  }
  .choice-group {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(72px, 0.45fr) minmax(0, 1fr);
    align-items: start;
    gap: 4px 8px;
    padding-left: 34px;
    line-height: 1.4;
  }
  .choice-group b {
    color: #65707a;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.035em;
  }
  .choice-group span {
    min-width: 0;
    color: #27313a;
    font-size: 11px;
    font-weight: 650;
    overflow-wrap: anywhere;
  }
  .item-observation,
  .order-observation {
    min-width: 0;
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 7px 9px;
    border-radius: 7px;
    overflow-wrap: anywhere;
  }
  .item-observation {
    margin-left: 34px;
    color: #7c4b00;
    background: #fff3dc;
  }
  .order-observation {
    color: #7c3b00;
    border: 1px solid #ffd8ae;
    background: #fff7ed;
  }
  .item-observation b,
  .order-observation b {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.035em;
  }
  .item-observation span,
  .order-observation span {
    font-size: 10px;
    line-height: 1.45;
  }
  @media (max-width: 430px) {
    .choice-group {
      grid-template-columns: 1fr;
    }
    .item-observation {
      margin-left: 0;
    }
  }
`;
export const Status = styled.span<{ $status: OrderStatus }>`
  display: inline-flex;
  padding: 6px 9px;
  border-radius: 7px;
  font-size: 10px !important;
  font-weight: 800;
  text-transform: uppercase;
  color: ${(p) =>
    p.$status === 'PENDENTE'
      ? '#174fc4'
      : p.$status === 'PREPARANDO'
        ? '#e74a0b'
        : p.$status === 'PRONTO'
          ? '#187a31'
          : p.$status === 'CANCELADO'
            ? '#a51f1f'
            : '#5f4a94'};
  background: ${(p) =>
    p.$status === 'PENDENTE'
      ? '#eaf1ff'
      : p.$status === 'PREPARANDO'
        ? '#fff0e6'
        : p.$status === 'PRONTO'
          ? '#e7f5e9'
          : p.$status === 'CANCELADO'
            ? '#fde9e9'
            : '#f0ebff'};
`;
export const LinkButton = styled.button`
  height: 38px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  padding: 0 13px;
  color: #23272b;
  font-weight: 650;
`;
export const PrimaryButton = styled.button`
  height: 40px;
  border: 0;
  border-radius: 8px;
  background: var(--brand);
  color: #fff;
  padding: 0 15px;
  font-weight: 750;
`;
export const GreenButton = styled.button`
  height: 38px;
  border: 1px solid #2c963f;
  border-radius: 8px;
  background: #fff;
  color: #18752d;
  padding: 0 13px;
  font-weight: 750;
`;
export const CallCard = styled.article`
  border-bottom: 1px solid var(--border);
  padding: 15px 4px;
  display: grid;
  grid-template-columns: 48px 1fr auto;
  align-items: center;
  gap: 12px;
  &:last-child {
    border-bottom: 0;
  }
  .icon {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #fff0e8;
    color: var(--brand);
  }
  .info {
    display: grid;
    gap: 4px;
  }
  .info b {
    font-size: 15px;
  }
  .info span {
    font-size: 12px;
    color: var(--muted);
  }
  .time {
    font-size: 12px;
    color: var(--brand);
    font-weight: 800;
  }
  @media (max-width: 450px) {
    grid-template-columns: 44px 1fr;
  }
  .action {
    grid-column: 1/-1;
    width: 100%;
  }
`;
export const CodeBox = styled.div`
  border: 1px solid var(--border);
  border-radius: 11px;
  padding: 15px;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  background: #fff;
  .code {
    font-size: 31px;
    font-weight: 850;
    letter-spacing: 0.1em;
  }
  .label {
    display: grid;
    gap: 3px;
  }
  .label small {
    color: var(--muted);
  }
  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
  .code {
    font-size: 27px;
  }
`;
export const ChannelButtons = styled.div`
  display: flex;
  border: 1px solid var(--border);
  border-radius: 9px;
  overflow: hidden;
  background: #fff;
  button {
    height: 46px;
    border: 0;
    border-right: 1px solid var(--border);
    background: #fff;
    color: #202529;
    padding: 0 18px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
  }
  button:last-child {
    border-right: 0;
  }
  button.active {
    color: var(--brand);
    background: #fff3eb;
    box-shadow: inset 0 0 0 1px var(--brand);
  }
  svg {
    width: 18px;
  }
  @media (max-width: 650px) {
    grid-column: 1/-1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    button {
      justify-content: center;
      padding: 0 7px;
      font-size: 11px;
    }
  }
`;
export const StatusColumns = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  @media (max-width: 1000px) {
    display: flex;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    margin-inline: -10px;
    padding-inline: 10px;
    scrollbar-width: none;
  }
`;
export const StatusColumn = styled.section`
  border: 1px solid var(--border);
  border-radius: 13px;
  background: #fff;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 11px;
  min-width: 0;
  > header {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 5px 3px 9px;
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--brand);
  }
  header b {
    font-size: 13px;
  }
  header span:last-child {
    margin-left: auto;
    font-size: 12px;
  }
  @media (max-width: 1000px) {
    flex: 0 0 min(390px, 88vw);
    scroll-snap-align: start;
  }
`;
export const KitchenOrder = styled.article`
  border: 1px solid var(--border);
  border-radius: 11px;
  padding: 14px;
  display: grid;
  gap: 11px;
  box-shadow: 0 3px 12px #29190b08;
  scroll-margin: 120px;
  transition:
    border-color 220ms ease,
    box-shadow 220ms ease,
    transform 220ms ease,
    background 220ms ease;
  &.highlighted {
    border-color: var(--brand);
    background: color-mix(in srgb, var(--brand) 7%, #fff);
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--brand) 16%, transparent),
      0 14px 30px color-mix(in srgb, var(--brand) 18%, transparent);
    animation: kitchen-order-focus 720ms ease both;
  }
  @keyframes kitchen-order-focus {
    0% {
      transform: scale(0.98);
    }
    55% {
      transform: scale(1.018);
    }
    100% {
      transform: scale(1);
    }
  }
  .head {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 8px;
  }
  .identity {
    display: grid;
    gap: 3px;
  }
  .identity b {
    font-size: 15px;
  }
  .identity small {
    color: #46525d;
    font-size: 10px;
  }
  .elapsed {
    font-size: 21px;
    color: var(--brand);
    font-weight: 800;
  }
  .waiting {
    color: #55705c;
    font-size: 11px;
  }
  .action {
    height: 38px;
    border-radius: 8px;
    background: #fff;
    font-weight: 750;
  }
  .action.pending {
    color: #225cc8;
    border: 1px solid #3973df;
  }
  .action.preparing {
    color: #e24b10;
    border: 1px solid #ed5a21;
  }
  .action:disabled {
    cursor: wait;
    opacity: 0.62;
  }
  .action-error {
    display: grid;
    gap: 8px;
    padding: 9px;
    border: 1px solid #efb6b6;
    border-radius: 8px;
    color: #8b2525;
    background: #fff3f3;
    font-size: 11px;
    line-height: 1.4;
  }
  .action-error button {
    width: fit-content;
    min-height: 32px;
    border: 1px solid #d99595;
    border-radius: 7px;
    padding: 0 10px;
    color: inherit;
    background: #fff;
    font-weight: 700;
  }
`;
export const Empty = styled.div`
  min-height: 120px;
  border: 1px dashed var(--border);
  border-radius: 11px;
  color: #7c8389;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  text-align: center;
  padding: 20px;
  svg {
    color: #70a878;
  }
`;
export const TableGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 13px;
  @media (max-width: 1150px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 760px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 450px) {
    grid-template-columns: 1fr;
  }
`;
export const TableCard = styled.article`
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  padding: 15px;
  display: grid;
  gap: 12px;
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  header b {
    font-size: 15px;
  }
  .meta {
    display: grid;
    gap: 6px;
    font-size: 11px;
    color: #56606a;
  }
  .actions {
    display: flex;
    gap: 7px;
  }
  .actions button {
    flex: 1;
    height: 36px;
    border-radius: 7px;
    border: 1px solid var(--border);
    background: #fff;
    font-size: 10px;
    font-weight: 700;
  }
  .access {
    background: #fff2e8;
    border: 1px solid #f3d2bd;
    border-radius: 8px;
    padding: 10px;
    text-align: center;
  }
  .access b {
    display: block;
    font-size: 25px;
    letter-spacing: 0.12em;
    color: var(--brand);
  }
  .access small {
    font-size: 9px;
    color: #6c7379;
  }
`;
export const TableState = styled.span<{
  $state: 'FREE' | 'OCCUPIED' | 'AWAITING_CODE';
}>`
  font-size: 9px;
  font-weight: 800;
  padding: 5px 7px;
  border-radius: 6px;
  color: ${(p) => (p.$state === 'FREE' ? '#18742e' : '#df4d12')};
  background: ${(p) => (p.$state === 'FREE' ? '#e8f5e9' : '#fff0e7')};
`;
export const FilterTabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  button {
    height: 40px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fff;
    padding: 0 13px;
    font-weight: 700;
  }
  button.active {
    color: #fff;
    background: var(--brand);
    border-color: var(--brand);
  }
  @media (max-width: 500px) {
    overflow-x: auto;
    button {
      white-space: nowrap;
    }
  }
`;
export const HistoryTable = styled.div`
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
  .row {
    display: grid;
    grid-template-columns: 130px 1fr 130px 130px 110px;
    align-items: center;
    gap: 12px;
    padding: 15px;
    border-bottom: 1px solid var(--border);
  }
  .history-order {
    border-bottom: 1px solid var(--border);
  }
  .history-order:last-child {
    border-bottom: 0;
  }
  .history-order .row {
    border-bottom: 0;
  }
  .row.head {
    background: #faf8f5;
    color: #697077;
    font-size: 11px;
    font-weight: 800;
  }
  .row b {
    font-size: 13px;
  }
  .row span {
    font-size: 12px;
  }
  .history-details {
    margin: -4px 15px 15px;
    padding-top: 10px;
    border-top: 1px dashed var(--border);
  }
  .history-details summary {
    width: fit-content;
    cursor: pointer;
    color: var(--brand);
    font-size: 11px;
    font-weight: 750;
  }
  .history-details[open] summary {
    margin-bottom: 10px;
  }
  @media (max-width: 760px) {
    .row {
      grid-template-columns: 1fr auto;
    }
    .row.head {
      display: none;
    }
    .row span:nth-child(2),
    .row span:nth-child(4) {
      grid-column: 1;
    }
    .row span:nth-child(3),
    .row span:nth-child(5) {
      grid-column: 2;
    }
    .history-details {
      margin-inline: 12px;
    }
  }
`;
export const HistoryPagination = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  color: var(--muted);
  font-size: 12px;
  > div {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  button {
    min-height: 38px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: #fff;
    padding: 0 12px;
    color: var(--brand);
    font-weight: 750;
    cursor: pointer;
  }

  button:hover:not(:disabled) {
    border-color: var(--brand);
    background: #fff7f2;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  strong {
    min-width: 46px;
    color: var(--text);
    font-size: 11px;
    text-align: center;
  }

  @media (max-width: 560px) {
    align-items: flex-start;
    flex-direction: column;
    > div {
      width: 100%;
    }
    button {
      flex: 1;
      padding-inline: 8px;
    }
  }
`;
export const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 4px 0 14px;
  h2 {
    margin: 0;
    font-size: 20px;
  }
  p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 12px;
  }
`;
