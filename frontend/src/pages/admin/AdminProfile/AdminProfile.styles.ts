import styled from 'styled-components';

export const Page = styled.main`
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(255, 120, 32, 0.12), transparent 28rem),
    #f6f7f9;
  color: #17181a;
`;

export const Topbar = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  min-height: 70px;
  padding: 0 32px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  border-bottom: 1px solid #e8e9ec;
  background: rgba(255,255,255,.94);
  backdrop-filter: blur(14px);

  button { border: 0; background: transparent; cursor: pointer; color: #50545b; font: inherit; }
  .back, .logout { display: inline-flex; align-items: center; gap: 8px; width: fit-content; padding: 9px 10px; border-radius: 10px; font-weight: 700; }
  .back:hover, .logout:hover { background: #f2f3f5; color: #17181a; }
  .back svg, .logout svg { width: 18px; height: 18px; }
  .logout { justify-self: end; }
  .brand { display: inline-flex; align-items: center; gap: 9px; font-weight: 900; letter-spacing: -0.04em; font-size: 20px; }
  .brand img { width: 34px; height: 30px; object-fit: contain; }
  .brand > span { display: inline-flex; align-items: baseline; }
  .brand strong { color: #ef6d18; font: inherit; }

  @media (max-width: 680px) {
    padding: 0 16px;
    min-height: 62px;
    grid-template-columns: 1fr auto;
    .brand { display: none; }
    .back, .logout { font-size: 13px; }
  }
`;

export const Shell = styled.div`
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 36px 0 56px;

  @media (max-width: 680px) {
    width: min(100% - 24px, 1180px);
    padding-top: 20px;
  }
`;

export const ProfileHero = styled.section`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 24px;
  align-items: center;
  padding: 28px;
  background: linear-gradient(135deg, #17181a, #292b30);
  color: white;
  border-radius: 24px;
  box-shadow: 0 18px 50px rgba(17, 20, 24, .12);

  .avatar-wrap { position: relative; }
  .avatar { width: 92px; height: 92px; border-radius: 24px; overflow: hidden; display: grid; place-items: center; background: #fff; color: #17181a; font-size: 30px; font-weight: 900; border: 3px solid rgba(255,255,255,.2); }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .camera { position: absolute; right: -7px; bottom: -7px; width: 34px; height: 34px; display: grid; place-items: center; border: 0; border-radius: 50%; background: #ff741f; color: white; box-shadow: 0 4px 12px rgba(0,0,0,.25); cursor: pointer; }
  .camera svg { width: 16px; }
  .eyebrow { color: #ffab73; font-size: 11px; letter-spacing: .14em; font-weight: 900; }
  h1 { margin: 5px 0 3px; font-size: clamp(26px, 4vw, 38px); line-height: 1; letter-spacing: -.04em; }
  p { margin: 0; color: #c7cbd1; }
  .badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
  .badges span { display: inline-flex; align-items: center; gap: 6px; padding: 7px 10px; border-radius: 999px; background: rgba(255,255,255,.08); color: #edf0f4; font-size: 12px; }
  .badges svg { width: 14px; height: 14px; }
  .security-score { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 16px; background: rgba(255,255,255,.08); }
  .security-score > svg { color: #77dfa3; }
  .security-score span { display: grid; }
  .security-score small { color: #aeb4bd; }

  @media (max-width: 760px) {
    grid-template-columns: auto 1fr;
    align-items: start;
    padding: 20px;
    .security-score { grid-column: 1 / -1; }
  }
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
    .avatar { width: 76px; height: 76px; border-radius: 20px; }
  }
`;

export const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  gap: 22px;
  margin-top: 22px;

  @media (max-width: 820px) { grid-template-columns: 1fr; }
`;

export const SideNav = styled.nav`
  align-self: start;
  display: grid;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e7e8eb;
  background: white;
  border-radius: 18px;

  button { width: 100%; border: 0; background: transparent; display: grid; grid-template-columns: 36px 1fr; gap: 10px; align-items: center; text-align: left; padding: 12px; border-radius: 13px; cursor: pointer; color: #555a62; }
  button:hover { background: #f7f7f8; }
  button.active { background: #fff1e7; color: #9b4309; }
  button > svg { width: 19px; height: 19px; margin-left: 7px; }
  button span { display: grid; gap: 2px; }
  button b { font-size: 14px; color: inherit; }
  button small { color: #8b9098; font-size: 11px; }

  @media (max-width: 820px) {
    display: flex; overflow-x: auto; padding: 6px; position: sticky; top: 70px; z-index: 10;
    button { min-width: 190px; }
  }
`;

export const Panel = styled.section`
  min-width: 0;
  padding: 28px;
  background: white;
  border: 1px solid #e7e8eb;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(25, 28, 33, .04);

  @media (max-width: 580px) { padding: 20px 16px; }
`;

export const PanelHeader = styled.header`
  display: flex; justify-content: space-between; gap: 20px; margin-bottom: 26px;
  .eyebrow { font-size: 11px; color: #ef6d18; font-weight: 900; letter-spacing: .12em; }
  h2 { margin: 5px 0 6px; font-size: 24px; letter-spacing: -.03em; }
  p { margin: 0; color: #737981; line-height: 1.5; }
`;

export const FormGrid = styled.div`
  display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 18px;
  label { display: grid; gap: 8px; }
  label.full { grid-column: 1 / -1; }
  label > span { font-size: 13px; font-weight: 800; color: #30343a; }
  label > small { color: #8d9299; font-size: 11px; line-height: 1.45; }
  .input-wrap { display: grid; grid-template-columns: 38px 1fr; align-items: center; border: 1px solid #dfe2e6; border-radius: 12px; background: #fbfbfc; overflow: hidden; }
  .input-wrap:focus-within { border-color: #ff8a3d; box-shadow: 0 0 0 3px rgba(255,116,31,.1); background: white; }
  .input-wrap svg { width: 17px; margin-left: 13px; color: #8b9098; }
  input { width: 100%; border: 0; outline: 0; background: transparent; padding: 13px 14px 13px 6px; font: inherit; color: #17181a; }
  @media (max-width: 620px) { grid-template-columns: 1fr; label.full { grid-column: auto; } }
`;

export const RelatedCard = styled.div`
  display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: center; margin-top: 24px; padding: 17px; border-radius: 15px; background: #f8f9fa; border: 1px solid #eceef0;
  .icon { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 12px; background: white; color: #ef6d18; }
  .icon svg { width: 20px; }
  div:nth-child(2) { display: grid; gap: 2px; }
  small { font-size: 10px; color: #969ba3; font-weight: 900; letter-spacing: .08em; }
  b { font-size: 14px; }
  span { color: #7c828b; font-size: 12px; }
  .readonly { justify-self: end; padding: 6px 9px; border-radius: 999px; background: #eceef1; color: #676d75; font-weight: 700; }
  @media (max-width: 560px) { grid-template-columns: auto 1fr; .readonly { grid-column: 2; justify-self: start; } }
`;

export const Actions = styled.div`
  display: flex; justify-content: flex-end; margin-top: 26px;
  button { border: 0; border-radius: 12px; padding: 12px 16px; display: inline-flex; gap: 8px; align-items: center; font: inherit; font-weight: 800; cursor: pointer; }
  button.primary { background: #17181a; color: white; }
  button.primary:hover { background: #2c2e32; }
  button:disabled { opacity: .6; cursor: wait; }
  svg { width: 17px; }
`;

export const SecurityList = styled.div`display: grid; gap: 12px;`;

export const SecurityItem = styled.div`
  display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: center; padding: 17px 0; border-bottom: 1px solid #eceef0;
  &:last-child { border-bottom: 0; }
  .icon { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 12px; background: #fff3ea; color: #ef6d18; }
  .icon svg { width: 19px; }
  div:nth-child(2) { display: grid; gap: 4px; }
  b { font-size: 14px; }
  span { color: #777d85; font-size: 12px; line-height: 1.5; }
  button { border: 1px solid #dddfe3; background: white; border-radius: 10px; padding: 9px 12px; font-weight: 800; cursor: pointer; }
  button:hover { border-color: #f2a06b; background: #fff8f3; }
  button:disabled { opacity: .55; cursor: wait; }
  .status { padding: 6px 9px; border-radius: 999px; background: #eff1f3; color: #666c74; font-weight: 800; white-space: nowrap; }
  .status.on { background: #e9f9ef; color: #267647; }
  .mfa-control { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
  @media (max-width: 620px) {
    grid-template-columns: auto 1fr;
    button, .status, .mfa-control { grid-column: 2; justify-self: start; }
    .mfa-control { flex-wrap: wrap; justify-content: flex-start; }
  }
`;

export const NotificationList = styled.div`
  display: grid;
  label { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: center; padding: 18px 0; border-bottom: 1px solid #eceef0; cursor: pointer; }
  label > span { display: grid; gap: 4px; }
  b { font-size: 14px; }
  small { color: #7e848c; line-height: 1.5; }
  input { appearance: none; width: 44px; height: 24px; border-radius: 999px; background: #d7dbe0; position: relative; transition: .2s ease; cursor: pointer; }
  input::after { content: ''; position: absolute; width: 18px; height: 18px; top: 3px; left: 3px; border-radius: 50%; background: white; transition: .2s ease; box-shadow: 0 1px 4px rgba(0,0,0,.2); }
  input:checked { background: #ff741f; }
  input:checked::after { transform: translateX(20px); }
`;

export const DeviceNotice = styled.p`
  margin: 18px 0 0; padding: 12px 14px; border-radius: 12px; background: #fff8f2; color: #8a501f; font-size: 12px; line-height: 1.5;
`;
