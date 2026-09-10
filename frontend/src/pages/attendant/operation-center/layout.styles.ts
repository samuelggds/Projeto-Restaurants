import styled from 'styled-components';

export const Shell = styled.div`
  --brand: #e16a3d;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  background: #f5f7f8;
  color: #18231d;
  font-family: Inter, system-ui, sans-serif;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    padding-bottom: calc(84px + env(safe-area-inset-bottom));
  }
`;

export const Sidebar = styled.aside`
  position: sticky;
  top: 0;
  height: 100dvh;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 28px 20px;
  display: flex;
  flex-direction: column;
  background: #153729;
  color: #fff;
  z-index: 20;
  @media (max-width: 900px) {
    display: none;
  }
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 2px 6px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  > span {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    background: var(--brand);
    font-size: 16px;
    font-weight: 900;
  }
  strong,
  small {
    display: block;
  }
  strong {
    font-size: 15px;
  }
  small {
    margin-top: 3px;
    font-size: 11px;
    opacity: 0.68;
  }
  @media (max-width: 900px) {
    display: none;
  }
`;

export const Nav = styled.nav`
  display: grid;
  gap: 8px;
  margin-top: 24px;
  button {
    min-height: 52px;
    padding: 0 15px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 0;
    border-radius: 13px;
    background: transparent;
    color: rgba(255, 255, 255, 0.72);
    font-size: 13.5px;
    font-weight: 800;
    cursor: pointer;
    text-align: left;
  }
  button svg {
    width: 20px;
  }
  button:hover,
  button.active {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  button.active {
    box-shadow: inset 3px 0 var(--brand);
  }
  @media (max-width: 900px) {
    display: flex;
    gap: 4px;
    height: 62px;
    margin: 0;
    overflow-x: auto;
    button {
      min-width: 82px;
      min-height: 60px;
      padding: 4px 7px;
      flex: 1;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      font-size: 10px;
    }
    button.active {
      box-shadow: inset 0 3px var(--brand);
    }
  }
`;

export const Profile = styled.div`
  margin-top: auto;
  padding: 18px 6px 0;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 36px;
  gap: 10px;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  > span {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    font-size: 12px;
    font-weight: 900;
  }
  b,
  small {
    display: block;
  }
  b {
    overflow: hidden;
    font-size: 12px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  small {
    font-size: 10px;
    opacity: 0.6;
  }
  button {
    border: 0;
    background: transparent;
    color: #fff;
    cursor: pointer;
  }
  @media (max-width: 900px) {
    display: none;
  }
`;

export const Main = styled.main`
  min-width: 0;
`;

export const Topbar = styled.header`
  .sync-copy {
    display: grid;
    gap: 4px;
    font-size: 12px;
    font-weight: 800;
  }
  .sync-copy small {
    color: #637369;
    font-weight: 500;
    font-size: 11px;
  }
  .syncing {
    color: #637369;
  }
  .sync button:disabled {
    opacity: 0.65;
    cursor: wait;
  }
  padding: 32px clamp(24px, 3vw, 56px) 24px;
  display: flex;
  justify-content: space-between;
  gap: 28px;
  align-items: flex-end;
  background: #fff;
  border-bottom: 1px solid #e8ece9;
  .eyebrow {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #6f7e75;
    font-weight: 900;
  }
  h1 {
    margin: 6px 0;
    font-size: clamp(32px, 2.5vw, 42px);
    letter-spacing: -0.04em;
  }
  p {
    margin: 0;
    color: #69776f;
    font-size: 14px;
  }
  .sync {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .sync > span {
    font-size: 12px;
    font-weight: 800;
  }
  .online {
    color: #2f7a4c;
  }
  .offline {
    color: #ad6b17;
  }
  .sync button {
    min-height: 46px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    gap: 7px;
    border: 1px solid #dce4df;
    border-radius: 12px;
    background: #fff;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }
  @media (max-width: 700px) {
    padding: 22px 18px 18px;
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
    h1 {
      font-size: 30px;
    }
    .sync {
      width: 100%;
      justify-content: space-between;
    }
  }
`;

export const Content = styled.div`
  width: 100%;
  max-width: none;
  padding: 28px clamp(20px, 3vw, 56px) 64px;
  @media (max-width: 700px) {
    padding: 20px 16px 42px;
  }
`;

export const ErrorBanner = styled.div`
  margin: 18px clamp(20px, 3vw, 56px) 0;
  padding: 14px 16px;
  display: flex;
  gap: 11px;
  border: 1px solid #f1d9ad;
  border-radius: 14px;
  background: #fff7e8;
  color: #79501d;
  b,
  span {
    display: block;
  }
  b {
    font-size: 14px;
  }
  span {
    margin-top: 3px;
    font-size: 12px;
  }
`;
