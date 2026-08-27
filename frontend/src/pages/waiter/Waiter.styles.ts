import styled from 'styled-components';
import type { OrderStatus } from './types';

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
  > button {
    width: 100%;
    min-width: 0;
    height: 52px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 13px;
    color: rgba(212, 218, 222, 0.75);
    background: transparent;
    border: 0;
    border-radius: 10px;
    border-left: 2px solid transparent;
    font-size: 13.5px;
    font-weight: 500;
    font-family: inherit;
    text-align: left;
    appearance: none;
    cursor: pointer;
    transition:
      background 0.18s ease,
      color 0.18s ease,
      border-color 0.18s ease;
  }
  > button:hover {
    color: #e8eaec;
    background: rgba(255, 255, 255, 0.06);
  }
  > button.active {
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
  > button.active svg {
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
  svg {
    width: 19px;
  }
  i {
    width: 4px;
    height: 4px;
    background: currentColor;
    border-radius: 50%;
  }
  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
  .spinning {
    animation: waiter-spin 0.8s linear infinite;
  }
  @keyframes waiter-spin {
    to {
      transform: rotate(360deg);
    }
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
    animation: waiter-loading-spin 0.8s linear infinite;
  }
  b {
    color: var(--ink);
    font-size: 17px;
  }
  span {
    font-size: 12px;
  }
  @keyframes waiter-loading-spin {
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
  button {
    height: 46px;
    border: 1px solid var(--border);
    border-radius: 9px;
    background: #fff;
    padding: 0 14px;
    color: var(--ink);
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-weight: 700;
  }
  input {
    flex: 1;
    min-width: 160px;
  }
  select {
    min-width: 170px;
  }
  @media (max-width: 760px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    input {
      grid-column: 1/-1;
    }
  }
  @media (max-width: 440px) {
    grid-template-columns: 1fr;
    input {
      grid-column: auto;
    }
    select,
    button {
      width: 100%;
    }
  }
`;
export const LiveStatus = styled.span`
  margin-left: auto;
  min-height: 46px;
  border: 1px solid #cfe7d4;
  border-radius: 9px;
  padding: 0 14px;
  color: #217237;
  background: #f2faf4;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    margin-right: 8px;
    border-radius: 50%;
    background: #1f9c3b;
    box-shadow: 0 0 0 4px #dff2e3;
  }
  @media (max-width: 760px) {
    margin-left: 0;
  }
  @media (max-width: 440px) {
    width: 100%;
    justify-content: center;
  }
`;
export const PageIntro = styled.section`
  margin-bottom: 18px;
  border: 1px solid #e9d9cf;
  border-radius: 16px;
  padding: 22px 24px;
  color: #fff;
  background:
    radial-gradient(
      circle at 90% 20%,
      color-mix(in srgb, var(--brand) 60%, transparent),
      transparent 32%
    ),
    linear-gradient(130deg, #172631, #263845 65%, #4b3028);
  box-shadow: 0 14px 30px #2b1c1212;
  span {
    color: #ff9360;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.14em;
  }
  h2 {
    margin: 7px 0 5px;
    font-size: clamp(21px, 3vw, 28px);
  }
  p {
    margin: 0;
    color: #d5dde2;
    font-size: 13px;
  }
  @media (max-width: 560px) {
    padding: 18px;
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
  border: 1px solid var(--border);
  border-radius: 11px;
  padding: 14px;
  display: grid;
  grid-template-columns: minmax(130px, 0.8fr) minmax(180px, 1.2fr) auto;
  align-items: center;
  gap: 15px;
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
  .right button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
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
export const OrderDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
  span {
    display: grid;
    gap: 2px;
    border-left: 2px solid #eeddd3;
    padding-left: 8px;
  }
  small {
    color: var(--muted);
    font-size: 9px;
    text-transform: uppercase;
  }
  b {
    font-size: 11px;
  }
  @media (max-width: 460px) {
    grid-template-columns: 1fr 1fr;
  }
`;
export const ItemList = styled.div`
  display: grid;
  gap: 5px;
  font-size: 12px;
  color: #333c44;
  span {
    display: block;
  }
  em {
    display: inline-block;
    width: max-content;
    max-width: 100%;
    font-style: normal;
    color: #8a5300;
    background: #fff2d8;
    padding: 5px 7px;
    border-radius: 6px;
    font-size: 10px;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;
export const PrimaryButton = styled.button`
  height: 40px;
  border: 0;
  border-radius: 8px;
  background: var(--brand);
  color: #fff;
  padding: 0 15px;
  font-weight: 750;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }
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
  grid-template-columns: 48px minmax(120px, 1fr) auto auto;
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
  .info small {
    font-size: 10px;
    color: #7b8288;
  }
  .time {
    font-size: 12px;
    color: var(--brand);
    font-weight: 800;
  }
  .action.delete {
    border: 1px solid #f0c8c0;
    background: #fff7f5;
    color: #b64a3a;
  }
  .action.delete:hover:not(:disabled) {
    background: #ffefeb;
  }
  @media (max-width: 450px) {
    grid-template-columns: 44px 1fr;
    .time {
      grid-column: 2;
    }
    .action {
      grid-column: 1/-1;
      width: 100%;
    }
  }
  > [role='alert'] {
    grid-column: 1/-1;
  }
`;
export const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 4px;
  color: var(--muted);
  font-size: 12px;

  > div {
    display: flex;
    gap: 8px;
  }

  @media (max-width: 560px) {
    align-items: stretch;
    flex-direction: column;

    > div {
      width: 100%;

      button {
        flex: 1;
      }
    }
  }
`;
export const PaginationButton = styled.button`
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  color: var(--ink);
  font: inherit;
  font-size: 12px;
  font-weight: 700;

  &:hover:not(:disabled) {
    border-color: var(--brand);
    color: var(--brand);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`;
export const DangerButton = styled.button`
  min-height: 38px;
  padding: 0 15px;
  border: 0;
  border-radius: 8px;
  background: #c94f3c;
  color: #fff;
  font: inherit;
  font-weight: 750;
  cursor: pointer;

  &:hover {
    background: #ad3f30;
  }
`;
export const ConfirmBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(18, 24, 29, 0.48);
  backdrop-filter: blur(3px);
`;
export const ConfirmDialog = styled.section`
  width: min(390px, 100%);
  padding: 26px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(22, 28, 33, 0.24);
  text-align: center;

  > .icon {
    display: grid;
    width: 46px;
    height: 46px;
    margin: 0 auto 14px;
    place-items: center;
    border-radius: 14px;
    background: #fff0ed;
    color: #c94f3c;
  }

  h2 {
    margin: 0;
    font-size: 20px;
  }

  p {
    margin: 9px 0 22px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }

  .actions {
    display: flex;
    justify-content: center;
    gap: 9px;
  }

  @media (max-width: 420px) {
    padding: 22px 17px;

    .actions {
      flex-direction: column-reverse;

      button {
        width: 100%;
      }
    }
  }
`;
export const ActionError = styled.p`
  margin: 5px 0 0;
  border-radius: 8px;
  padding: 8px 10px;
  color: #a12b21;
  background: #fff0ee;
  font-size: 11px;
  line-height: 1.4;
`;
export const InlineNotice = styled.div<{ $tone?: 'error' | 'warning' }>`
  margin-bottom: 16px;
  border: 1px solid ${(p) => (p.$tone === 'error' ? '#efc0bb' : '#eed9aa')};
  border-radius: 11px;
  padding: 11px 12px;
  color: ${(p) => (p.$tone === 'error' ? '#9c2f26' : '#775716')};
  background: ${(p) => (p.$tone === 'error' ? '#fff3f1' : '#fff9e9')};
  display: grid;
  grid-template-columns: 20px 1fr auto;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  svg {
    width: 18px;
  }
  button {
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 7px;
    color: inherit;
    background: transparent;
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
    grid-template-columns: repeat(3, 1fr);
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
    flex-wrap: wrap;
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .actions button:disabled {
    cursor: wait;
    opacity: 0.6;
  }
  .actions > [role='alert'] {
    flex: 0 0 100%;
  }
  .actions .open-table {
    color: #176f31;
    border-color: #aad8b4;
    background: #f2faf4;
  }
  .actions .close-table {
    color: #a63f14;
    border-color: #efc2aa;
    background: #fff6f0;
  }
  .actions .view-account {
    flex-basis: 100%;
    min-height: 39px;
    color: #243f4c;
    border-color: #b9ccd5;
    background: #f4f8fa;
  }
`;
export const TableState = styled.span<{
  $state: 'FREE' | 'OCCUPIED';
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
  .row:last-child {
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
export const OpenTableRow = styled.article`
  border: 1px solid var(--border);
  border-radius: 11px;
  padding: 12px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  > span {
    display: grid;
    gap: 3px;
  }
  small {
    color: var(--muted);
    font-size: 10px;
  }
  strong {
    font-size: 12px;
  }
  button {
    min-height: 34px;
    border: 1px solid #dfad91;
    border-radius: 8px;
    padding: 0 10px;
    color: #a63f14;
    background: #fff7f2;
    font-size: 10px;
    font-weight: 800;
  }
  > [role='alert'] {
    grid-column: 1/-1;
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr auto;
    button {
      grid-column: 1/-1;
    }
  }
`;
export const CallsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 18px;
  > section:last-child:nth-child(odd) {
    grid-column: 1/-1;
  }
  @media (max-width: 920px) {
    grid-template-columns: 1fr;
    > section:last-child:nth-child(odd) {
      grid-column: auto;
    }
  }
`;
