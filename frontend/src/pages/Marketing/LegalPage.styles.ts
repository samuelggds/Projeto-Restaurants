import styled from 'styled-components';

export const Page = styled.div`
  --ink: #233c30;
  --muted: #6b7468;
  --line: #dfe5d9;
  --forest: #21392d;
  --forest-strong: #172b21;
  --lime: #e1ecb5;
  --canvas: #faf9f5;
  min-height: 100vh;
  background:
    radial-gradient(circle at 88% 5%, rgba(225, 236, 181, 0.52), transparent 30rem),
    var(--canvas);
  color: var(--ink);
  font-family: 'DM Sans', sans-serif;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  a {
    color: inherit;
  }

  a:focus-visible {
    outline: 3px solid #75964e;
    outline-offset: 4px;
  }
`;

export const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid rgba(35, 60, 48, 0.1);
  background: rgba(250, 249, 245, 0.92);
  backdrop-filter: blur(16px);
`;

export const HeaderInner = styled.div`
  width: min(1120px, calc(100% - 64px));
  min-height: 78px;
  margin-inline: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;

  @media (max-width: 640px) {
    width: calc(100% - 36px);
    min-height: 70px;
  }
`;

export const Brand = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: var(--forest);
  font-size: 20px;
  font-weight: 850;
  letter-spacing: -0.04em;

  img {
    width: 38px;
    height: 34px;
  }

  span span {
    color: #8aa251;
  }
`;

export const BackLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #536457;
  font-size: 12px;
  font-weight: 750;
  text-decoration: none;

  &:hover {
    color: var(--forest);
    text-decoration: underline;
    text-underline-offset: 4px;
  }
`;

export const Main = styled.main`
  width: min(920px, calc(100% - 64px));
  margin: 0 auto;
  padding: clamp(58px, 8vw, 96px) 0 80px;

  @media (max-width: 640px) {
    width: calc(100% - 36px);
    padding-top: 42px;
  }
`;

export const Hero = styled.header`
  max-width: 760px;
  margin-bottom: 36px;

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 18px;
    color: #687c55;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.16em;
  }

  .eyebrow::before {
    content: '';
    width: 24px;
    height: 1px;
    background: #8da261;
  }

  h1 {
    margin: 0;
    color: var(--forest-strong);
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(42px, 7vw, 70px);
    font-weight: 500;
    letter-spacing: -0.045em;
    line-height: 0.98;
  }

  .lead {
    max-width: 700px;
    margin: 24px 0 0;
    color: #607064;
    font-size: clamp(15px, 2vw, 18px);
    line-height: 1.75;
  }

  .updated {
    display: block;
    margin-top: 18px;
    color: #839084;
    font-size: 11px;
  }
`;

export const Document = styled.article`
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 22px 60px rgba(29, 53, 40, 0.07);
`;

export const Intro = styled.div`
  padding: 28px clamp(22px, 5vw, 46px);
  border-bottom: 1px solid var(--line);
  background: #f2f6e9;
  color: #526354;
  font-size: 13px;
  line-height: 1.8;

  strong {
    color: var(--forest);
  }
`;

export const Section = styled.section`
  padding: 32px clamp(22px, 5vw, 46px);

  & + & {
    border-top: 1px solid #edf0e8;
  }

  h2 {
    margin: 0 0 14px;
    color: var(--forest-strong);
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(24px, 4vw, 31px);
    font-weight: 500;
    letter-spacing: -0.025em;
  }

  h3 {
    margin: 25px 0 8px;
    color: var(--forest);
    font-size: 14px;
    font-weight: 850;
  }

  p,
  li {
    color: #59665d;
    font-size: 13px;
    line-height: 1.9;
  }

  p {
    margin: 0;
  }

  p + p {
    margin-top: 14px;
  }

  ul,
  ol {
    margin: 14px 0 0;
    padding-left: 20px;
  }

  li + li {
    margin-top: 7px;
  }

  a {
    color: #2f6547;
    font-weight: 750;
    text-underline-offset: 3px;
  }
`;

export const Callout = styled.div`
  margin-top: 20px;
  padding: 18px 20px;
  border: 1px solid #dce6c9;
  border-radius: 15px;
  background: #f6f9ef;
  color: #526252;
  font-size: 12px;
  line-height: 1.8;

  strong {
    color: var(--forest);
  }
`;

export const Footer = styled.footer`
  margin-top: 42px;
  border-top: 1px solid var(--line);
  padding-top: 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  color: #79857b;
  font-size: 11px;

  div {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
  }

  a {
    color: #4c6152;
    font-weight: 750;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  @media (max-width: 640px) {
    flex-direction: column;
  }
`;
