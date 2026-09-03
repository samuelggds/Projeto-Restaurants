import styled from 'styled-components';

export const Page = styled.main`
  --accent: #e45118;
  --ink: #17272c;
  --muted: #617077;
  position: relative;
  isolation: isolate;
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

  @media (max-width: 520px) {
    padding: 16px;
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
  flex: 0 0 auto;
  border-radius: 8px;
  color: #fff;
  background: var(--ink);
  font:
    700 17px Georgia,
    serif;
`;

export const BrandCopy = styled.div`
  display: grid;
  gap: 2px;

  strong {
    font:
      700 17px Georgia,
      serif;
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
  width: min(860px, 100%);
  display: grid;
  grid-template-columns: minmax(180px, 0.7fr) minmax(0, 1.7fr);
  overflow: hidden;
  border: 1px solid #d8d5cf;
  border-radius: 8px;
  background: #fffdfa;
  box-shadow: 0 24px 60px rgba(23, 39, 44, 0.1);

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`;

export const StatusPanel = styled.div`
  min-height: 100%;
  padding: 32px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 42px;
  color: #fff;
  background: #173c42;

  > span {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #d8e7e5;
    font-size: 12px;
    font-weight: 700;
  }

  @media (max-width: 680px) {
    min-height: auto;
    padding: 24px;
    flex-direction: row;
    align-items: center;
    gap: 18px;
  }

  @media (max-width: 380px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const IconWrap = styled.div`
  width: 68px;
  height: 68px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: 8px;
  color: #fff;
  background: var(--accent);
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
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const Title = styled.h1`
  margin: 16px 0 12px;
  max-width: 520px;
  font:
    700 44px/1.08 Georgia,
    serif;
  letter-spacing: 0;

  @media (max-width: 520px) {
    font-size: 34px;
  }
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
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  strong {
    font-size: 13px;
  }

  small {
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;
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
  transition:
    transform 160ms ease,
    background 160ms ease;

  &:hover {
    transform: translateY(-1px);
    background: #c94210;
  }

  &:focus-visible {
    outline: 3px solid rgba(228, 81, 24, 0.25);
    outline-offset: 3px;
  }

  @media (max-width: 380px) {
    width: 100%;
  }
`;

export const Footer = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: var(--muted);
  font-size: 11px;

  @media (max-width: 480px) {
    justify-content: center;
    flex-wrap: wrap;
  }
`;

export const TechnicalLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  color: #526166;
  text-decoration: none;

  &:hover {
    color: var(--ink);
  }

  &:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }
`;
