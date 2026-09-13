import styled from 'styled-components';

export const Page = styled.div`
  --forest: #233f32;
  --ink: #233b30;
  --muted: #68716a;
  --accent: #c75318;
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  color: var(--ink);
  background:
    radial-gradient(ellipse at 90% 90%, #eae9dc 0, transparent 42%),
    radial-gradient(ellipse at 8% 20%, #fffdf7 0, transparent 46%), #f6f5ef;
  font-family:
    'Manrope',
    Inter,
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
`;

export const Header = styled.header`
  width: min(1160px, calc(100% - 64px));
  min-height: 104px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  @media (max-width: 640px) {
    width: calc(100% - 40px);
    min-height: 80px;
  }
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  > svg {
    width: 43px;
    height: 36px;
    flex: none;
  }
  > span {
    display: grid;
    gap: 2px;
  }
  strong {
    font-size: 21px;
    line-height: 1.1;
    letter-spacing: -0.8px;
    font-weight: 850;
  }
  em {
    color: var(--accent);
    font-style: normal;
  }
  small {
    color: var(--muted);
    font-size: 10px;
  }

  @media (max-width: 640px) {
    gap: 8px;
    > svg {
      width: 34px;
      height: 30px;
    }
    strong {
      font-size: 19px;
    }
    small {
      font-size: 9px;
    }
  }
`;

export const HeaderLabel = styled.span`
  color: #788177;
  font-size: 12px;
  @media (max-width: 640px) {
    display: none;
  }
`;

export const Main = styled.main`
  display: grid;
  align-items: center;
  width: min(1100px, calc(100% - 64px));
  margin: 0 auto;
  padding: 24px 0 40px;
  @media (max-width: 640px) {
    width: calc(100% - 28px);
    padding: 4px 0 22px;
  }
`;

export const NoticeCard = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  overflow: hidden;
  border: 1px solid #e2e5da;
  border-radius: 28px;
  background: #fffefa;
  box-shadow:
    0 24px 70px -35px #233f3240,
    0 3px 14px #233f3205;

  @media (max-width: 760px) {
    grid-template-columns: minmax(0, 1fr);
    border-radius: 22px;
  }
`;

export const BrandPanel = styled.div`
  position: relative;
  isolation: isolate;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  overflow: hidden;
  padding: 36px 26px;
  color: #fffcf0;
  background:
    radial-gradient(ellipse at 110% 110%, #be793338, transparent 60%),
    linear-gradient(155deg, #294b3b, #1c352b);

  .panel-eyebrow {
    font-size: 9px;
    letter-spacing: 2.2px;
    font-weight: 700;
    color: #c5cebd;
  }
  .panel-brand {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .panel-brand > svg {
    width: min(100%, 232px);
    height: 184px;
    margin-bottom: 14px;
  }
  .panel-wordmark {
    font-size: clamp(28px, 3vw, 38px);
    font-weight: 850;
    letter-spacing: -1.8px;
  }
  .panel-wordmark em {
    color: #f5a369;
    font-style: normal;
  }
  .panel-tagline {
    margin-top: 3px;
    color: #c5cebd;
    font-size: 11px;
  }
  > p {
    margin: 0;
    text-align: center;
    color: #e6ebdf;
    font-size: 16px;
    line-height: 1.6;
  }
  > p em {
    color: #f5a369;
    font:
      italic 21px Georgia,
      serif;
  }
  .panel-arc {
    position: absolute;
    z-index: -1;
    top: -70px;
    right: -92px;
    width: 340px;
    stroke: #f5a369;
    stroke-width: 0.8;
    opacity: 0.25;
    pointer-events: none;
  }

  @media (max-width: 760px) {
    min-height: 126px;
    padding: 22px;
    justify-content: center;
    gap: 0;
    .panel-eyebrow,
    > p {
      display: none;
    }
    .panel-brand {
      display: grid;
      grid-template-columns: 88px auto;
      column-gap: 19px;
    }
    .panel-brand > svg {
      grid-row: 1 / 3;
      width: 88px;
      height: 76px;
      margin: 0;
    }
    .panel-wordmark {
      align-self: end;
      font-size: 28px;
      letter-spacing: -1.2px;
    }
    .panel-tagline {
      align-self: start;
      margin-top: 4px;
      font-size: 10px;
    }
    .panel-arc {
      top: -124px;
      right: -25px;
      width: 290px;
    }
  }
  @media (max-width: 360px) {
    min-height: 110px;
    padding: 18px;
    .panel-brand {
      grid-template-columns: 70px auto;
      column-gap: 13px;
    }
    .panel-brand > svg {
      width: 70px;
      height: 60px;
    }
    .panel-wordmark {
      font-size: 25px;
    }
    .panel-tagline {
      font-size: 9px;
    }
  }
`;

export const NoticeContent = styled.div`
  min-width: 0;
  padding: clamp(32px, 4.4vw, 62px);
  align-self: center;
  @media (max-width: 760px) {
    padding: 30px;
  }
  @media (max-width: 480px) {
    padding: 25px 22px;
  }
  @media (max-width: 360px) {
    padding: 23px 18px;
  }
`;

export const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #936028;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.35px;
  line-height: 1.5;
  > span {
    width: 6px;
    height: 6px;
    flex: none;
    border-radius: 50%;
    background: #c8843a;
  }
`;

export const Title = styled.h1`
  margin: 17px 0 16px;
  font-size: clamp(32px, 3.2vw, 43px);
  font-weight: 750;
  line-height: 1.12;
  letter-spacing: -1.8px;
  text-wrap: balance;
  @media (max-width: 480px) {
    margin: 14px 0 12px;
    font-size: 30px;
    letter-spacing: -1.2px;
  }
  @media (max-width: 360px) {
    font-size: 28px;
  }
`;

export const Description = styled.p`
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.75;
  @media (max-width: 480px) {
    font-size: 13px;
    line-height: 1.65;
  }
`;

export const Guidance = styled.div`
  display: grid;
  grid-template-columns: 19px minmax(0, 1fr);
  align-items: start;
  gap: 11px;
  margin-top: 26px;
  padding: 16px;
  border: 1px solid #e6e9df;
  border-radius: 12px;
  background: #f5f7f0;
  > svg {
    margin-top: 1px;
    color: #6b835f;
  }
  strong {
    display: block;
    font-size: 12px;
    font-weight: 750;
  }
  p {
    margin: 5px 0 0;
    color: #687362;
    font-size: 12px;
    line-height: 1.65;
  }
  @media (max-width: 480px) {
    margin-top: 21px;
    padding: 13px;
    gap: 9px;
  }
`;

export const Actions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  margin-top: 26px;
  > small {
    color: #757c72;
    font-size: 10px;
    line-height: 1.5;
  }
  @media (max-width: 480px) {
    margin-top: 22px;
    align-items: stretch;
    > small {
      text-align: center;
    }
  }
`;

export const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 48px;
  padding: 0 19px;
  border: 1px solid var(--forest);
  border-radius: 10px;
  background: var(--forest);
  color: #fffdf5;
  font: inherit;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    box-shadow 160ms ease;
  .action-arrow {
    margin-left: 14px;
    color: #d5dfce;
  }
  &:hover {
    background: #315641;
    box-shadow: 0 5px 16px #233f3224;
  }
  &:focus-visible {
    outline: 3px solid #c75318;
    outline-offset: 4px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const Footer = styled.footer`
  width: min(1160px, calc(100% - 64px));
  margin: 0 auto;
  padding: 4px 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  color: #7b8277;
  font-size: 10px;
  @media (max-width: 640px) {
    width: calc(100% - 40px);
    padding-bottom: calc(18px + env(safe-area-inset-bottom, 0px));
    .footer-note {
      display: none;
    }
  }
`;

export const TechnicalLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 44px;
  color: #667260;
  font-size: 11px;
  text-decoration: none;
  &:hover {
    color: var(--forest);
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 3px solid #c75318;
    outline-offset: 4px;
    border-radius: 4px;
  }
`;
