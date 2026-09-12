import styled from 'styled-components';

export const TenantPage = styled.main`
  --accent: #e95409;
  --ink: #151515;
  --muted: #6f6a65;
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  color: var(--ink);
  background:
    radial-gradient(circle at 100% 100%, rgba(233, 84, 9, 0.09), transparent 28%),
    linear-gradient(rgba(216, 204, 195, 0.17) 1px, transparent 1px),
    linear-gradient(90deg, rgba(216, 204, 195, 0.17) 1px, transparent 1px),
    #fbfaf8;
  background-size: auto, 34px 34px, 34px 34px, auto;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
`;

export const TenantHeader = styled.header`
  min-height: 76px;
  display: flex;
  align-items: center;
  padding: 12px clamp(20px, 6vw, 88px);
  border-bottom: 1px solid #eadfd6;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(10px);
`;

export const TenantBrand = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  img {
    object-fit: contain;
  }

  > span {
    display: grid;
    gap: 1px;
  }

  strong {
    font-size: 18px;
    font-weight: 850;
  }

  strong em {
    color: var(--accent);
    font-style: normal;
  }

  small {
    color: #8b847f;
    font-size: 9px;
  }
`;

export const TenantMain = styled.section`
  width: min(1120px, calc(100% - 32px));
  margin: auto;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(340px, 0.75fr);
  gap: clamp(34px, 6vw, 78px);
  align-items: center;
  padding: clamp(46px, 8vh, 92px) 0;

  @media (max-width: 880px) {
    grid-template-columns: 1fr;
  }
`;

export const TenantCopy = styled.section`
  max-width: 650px;

  .eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 8px 13px;
    border: 1px solid #efc0aa;
    border-radius: 999px;
    color: #c94d15;
    background: #fff7f2;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  h1 {
    margin: 18px 0 14px;
    font-size: clamp(44px, 6vw, 72px);
    line-height: 0.98;
    letter-spacing: -0.055em;
  }

  h1 em {
    color: var(--accent);
    font-style: normal;
  }

  > p {
    max-width: 620px;
    margin: 0;
    color: var(--muted);
    font-size: clamp(15px, 1.8vw, 18px);
    line-height: 1.6;
  }

  @media (max-width: 880px) {
    max-width: none;
  }
`;

export const TenantActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 28px;
`;

export const PrimaryButton = styled.button`
  min-height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 22px;
  border: 0;
  border-radius: 9px;
  color: #fff;
  background: var(--accent);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(233, 84, 9, 0.18);

  &:hover {
    background: #d94d06;
  }

  &:focus-visible {
    outline: 3px solid rgba(233, 84, 9, 0.24);
    outline-offset: 3px;
  }
`;

export const TenantAssurances = styled.div`
  margin-top: 34px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;

  > span {
    min-width: 0;
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    grid-template-rows: auto auto;
    column-gap: 10px;
    row-gap: 2px;
    align-items: center;
    padding: 15px 16px;
    border: 1px solid #eadfd6;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.9);
  }

  svg {
    grid-row: 1 / 3;
    width: 21px;
    height: 21px;
    color: var(--accent);
  }

  b {
    font-size: 11px;
  }

  small {
    color: var(--muted);
    font-size: 9px;
    line-height: 1.45;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const BrandPanel = styled.aside`
  min-height: 430px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 34px;
  border: 1px solid #eadfd6;
  border-radius: 24px;
  color: #fff;
  background:
    radial-gradient(circle at 78% 14%, rgba(255, 122, 54, 0.22), transparent 28%),
    linear-gradient(145deg, #171a1c, #27201c 68%, #4a2615);
  box-shadow: 0 22px 54px rgba(39, 29, 23, 0.12);
  text-align: center;

  .mark {
    width: 150px;
    height: 128px;
    display: grid;
    place-items: center;
  }

  .mark img {
    width: 142px;
    height: 124px;
    object-fit: contain;
    filter: brightness(0) invert(1);
  }

  > strong {
    margin-top: 10px;
    font-size: 32px;
    font-weight: 850;
  }

  > strong em {
    color: #ff6a1a;
    font-style: normal;
  }

  > small {
    margin-top: 2px;
    color: #bfc2c3;
    font-size: 11px;
  }

  > span {
    max-width: 260px;
    margin-top: 34px;
    padding-top: 18px;
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    color: #d7d3d0;
    font-size: 12px;
    line-height: 1.5;
  }

  @media (max-width: 880px) {
    min-height: 300px;
  }

  @media (max-width: 520px) {
    min-height: 250px;
  }
`;

export const TenantFooter = styled.footer`
  padding: 16px clamp(20px, 6vw, 88px) 22px;
  color: #9b948e;
  font-size: 10px;
`;

export const Page = styled.main`
  --accent: #233f32;
  --ink: #233f32;
  --muted: #617077;
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: clamp(20px, 3vw, 34px) clamp(20px, 5vw, 64px);
  color: var(--ink);
  background-color: #f4f1eb;
  background-image:
    linear-gradient(rgba(23, 39, 44, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(23, 39, 44, 0.035) 1px, transparent 1px);
  background-size: 32px 32px;
  font-family: Aptos, 'Segoe UI Variable', 'Segoe UI', sans-serif;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
`;

export const Header = styled.header`
  display: flex;
  align-items: center;
  gap: 11px;
`;

export const BrandMark = styled.span`
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;

  img {
    object-fit: contain;
    mix-blend-mode: multiply;
  }
`;

export const BrandCopy = styled.div`
  display: grid;
  gap: 2px;

  strong {
    font: 700 17px Georgia, serif;
  }

  small {
    color: var(--muted);
    font-size: 11px;
  }
`;

export const Main = styled.section`
  display: grid;
  place-items: center;
  padding: clamp(34px, 8vh, 88px) 0;
`;

export const NoticeCard = styled.section`
  width: min(720px, 100%);
  overflow: hidden;
  border: 1px solid #d8d5cf;
  border-radius: 12px;
  background: #fffdfa;
  box-shadow: 0 24px 60px rgba(23, 39, 44, 0.1);
`;

export const NoticeContent = styled.div`
  min-width: 0;
  padding: clamp(32px, 6vw, 58px);
`;

export const Eyebrow = styled.span`
  display: inline-flex;
  color: #a83a10;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
`;

export const Title = styled.h1`
  margin: 16px 0 12px;
  max-width: 520px;
  font: 700 44px/1.08 Georgia, serif;
`;

export const Description = styled.p`
  max-width: 510px;
  margin: 0;
  color: var(--muted);
  font-size: 16px;
  line-height: 1.6;
`;

export const Assurance = styled.div`
  max-width: 510px;
  margin-top: 26px;
  padding: 14px 0;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 12px;
  border-top: 1px solid #e5e2dc;
  border-bottom: 1px solid #e5e2dc;

  > svg {
    color: #28705d;
  }

  span {
    display: grid;
    gap: 3px;
  }

  strong {
    font-size: 13px;
  }

  small {
    color: var(--muted);
    font-size: 12px;
  }
`;

export const RetryButton = styled.button`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 26px;
  padding: 0 20px;
  border: 0;
  border-radius: 8px;
  color: #fff;
  background: var(--accent);
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
`;

export const Footer = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: var(--muted);
  font-size: 11px;
`;

export const TechnicalLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  color: #526166;
  text-decoration: none;
`;
