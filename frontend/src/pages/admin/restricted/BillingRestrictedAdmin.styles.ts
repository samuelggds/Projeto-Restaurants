import styled, { keyframes } from 'styled-components';

const rotate = keyframes`to { transform: rotate(360deg); }`;

export const Root = styled.div`
  --accent: #ed5a16;
  --border: #e8dfd6;
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 252px minmax(0, 1fr);
  color: #1d1b19;
  background: #f8f6f2;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  @media (max-width: 820px) {
    display: block;
  }
`;

export const Sidebar = styled.aside`
  min-height: 100dvh;
  position: sticky;
  top: 0;
  align-self: start;
  display: flex;
  flex-direction: column;
  padding: 26px 14px 18px;
  color: #c9cdce;
  background: #131b1e;
  @media (max-width: 820px) {
    min-height: 0;
    position: static;
    padding: 15px 16px;
  }
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px 22px;
  border-bottom: 1px solid #2c3538;
  > span {
    width: 47px;
    height: 47px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    color: #fff;
    background: var(--accent);
    font:
      700 17px Georgia,
      serif;
  }
  div {
    display: grid;
    gap: 3px;
  }
  strong {
    color: #fff;
    font:
      700 18px Georgia,
      serif;
  }
  small {
    color: #7e898c;
    font-size: 8px;
    letter-spacing: 0.12em;
  }
`;

export const RestrictionLabel = styled.div`
  margin: 19px 10px 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ff9b69;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  @media (max-width: 820px) {
    display: none;
  }
`;

export const Navigation = styled.nav`
  display: grid;
  gap: 5px;
  button {
    min-height: 49px;
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 0 14px;
    border: 0;
    border-left: 2px solid transparent;
    border-radius: 10px;
    color: #777f81;
    background: transparent;
    font: inherit;
    font-size: 12px;
    text-align: left;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.64;
  }
  .lock {
    margin-left: auto;
    opacity: 0.7;
  }
  button.active {
    border-left-color: var(--accent);
    color: #ff7b3d;
    background: #2e241f;
    font-weight: 750;
  }
  @media (max-width: 820px) {
    margin-top: 12px;
    display: flex;
    overflow-x: auto;
    button:not(.active) {
      display: none;
    }
    button.active {
      width: 100%;
      justify-content: center;
    }
  }
`;

export const SidebarFooter = styled.div`
  margin-top: auto;
  padding: 16px 9px 0;
  border-top: 1px solid #2c3538;
  display: grid;
  gap: 10px;
  .identity {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .identity > b {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 1px solid #5a6466;
    border-radius: 50%;
    color: #fff;
    font-size: 11px;
  }
  .identity span {
    display: grid;
    min-width: 0;
  }
  .identity strong {
    overflow: hidden;
    color: #f3f4f4;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .identity small {
    color: #ed895b;
    font-size: 9px;
  }
  > button {
    min-height: 40px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 0;
    border-radius: 9px;
    color: #aeb5b6;
    background: transparent;
    cursor: pointer;
  }
  > button:hover {
    color: #fff;
    background: #202a2d;
  }
  @media (max-width: 820px) {
    display: none;
  }
`;

export const Main = styled.main`
  min-width: 0;
`;

export const Topbar = styled.header`
  min-height: 146px;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 26px clamp(18px, 4vw, 48px);
  border-bottom: 1px solid var(--border);
  background: rgba(255, 253, 250, 0.94);
  small {
    color: var(--accent);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.09em;
  }
  h1 {
    margin: 12px 0 6px;
    font-size: clamp(25px, 3vw, 32px);
  }
  p {
    margin: 0;
    color: #77716b;
    font-size: 12px;
  }
  @media (max-width: 620px) {
    min-height: 0;
    align-items: flex-start;
    flex-direction: column;
    padding: 20px 15px;
  }
`;

export const VerifyButton = styled.button`
  min-height: 47px;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 16px;
  border: 1px solid #e1d6cc;
  border-radius: 10px;
  color: #4f4944;
  background: #fff;
  font: inherit;
  font-size: 11px;
  font-weight: 750;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(48, 35, 25, 0.05);
  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
  .spin {
    animation: ${rotate} 0.9s linear infinite;
  }
  @media (max-width: 620px) {
    width: 100%;
    margin-left: 0;
  }
`;

export const Content = styled.div`
  width: min(1180px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 22px;
  padding: 28px clamp(12px, 3.5vw, 42px) 70px;
`;

export const Alert = styled.section`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 22px;
  border: 1px solid #f0c4ae;
  border-radius: 17px;
  background: linear-gradient(105deg, #fff7f1, #fffdfb);
  box-shadow: 0 8px 26px rgba(109, 58, 31, 0.055);
  span {
    color: #c94d15;
    font-size: 9px;
    font-weight: 850;
    letter-spacing: 0.1em;
  }
  h2 {
    margin: 7px 0 5px;
    font-size: 17px;
  }
  p {
    max-width: 720px;
    margin: 0;
    color: #74675f;
    font-size: 12px;
    line-height: 1.55;
  }
  small {
    display: block;
    margin-top: 8px;
    color: #9a552f;
    font-weight: 700;
  }
  @media (max-width: 880px) {
    grid-template-columns: auto 1fr;
  }
`;

export const AlertIcon = styled.div`
  width: 50px;
  height: 50px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #d84f12;
  background: #ffe2d3;
`;

export const SupportHint = styled.div`
  max-width: 190px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 12px;
  border-radius: 11px;
  color: #78685f;
  background: #fff;
  font-size: 10px;
  line-height: 1.4;
  @media (max-width: 880px) {
    grid-column: 2;
    max-width: none;
  }
`;
