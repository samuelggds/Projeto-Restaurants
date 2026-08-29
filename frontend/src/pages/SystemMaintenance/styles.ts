import styled from 'styled-components';

export const Page = styled.main`
  --orange: #f35a18;
  --ink: #1a1d1f;
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
  padding: clamp(20px, 3vw, 34px) clamp(20px, 5vw, 64px);
  color: var(--ink);
  background: #f7f4ef;
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
`;

export const Background = styled.div`
  position: absolute;
  z-index: -1;
  inset: 0;
  overflow: hidden;
  pointer-events: none;

  span {
    position: absolute;
    width: min(42rem, 80vw);
    aspect-ratio: 1;
    border-radius: 50%;
    filter: blur(2px);
  }

  span:first-child {
    top: -27rem;
    right: -15rem;
    background: radial-gradient(circle, rgba(243, 90, 24, 0.14), transparent 68%);
  }

  span:last-child {
    bottom: -31rem;
    left: -18rem;
    border: 1px solid rgba(93, 69, 53, 0.08);
    background: rgba(255, 255, 255, 0.28);
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
  border-radius: 12px;
  color: #fff;
  background: var(--orange);
  font:
    700 17px Georgia,
    serif;
  box-shadow: 0 10px 24px rgba(243, 90, 24, 0.2);
`;

export const BrandCopy = styled.div`
  strong {
    font:
      700 19px Georgia,
      serif;
  }
`;

export const Main = styled.section`
  display: grid;
  place-items: center;
  padding: 38px 0;
`;

export const NoticeCard = styled.section`
  position: relative;
  width: min(500px, 100%);
  overflow: hidden;
  padding: clamp(34px, 7vw, 54px) clamp(24px, 6vw, 52px);
  border: 1px solid #e9dfd6;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.9);
  text-align: center;
  box-shadow: 0 24px 70px rgba(70, 48, 33, 0.1);
  backdrop-filter: blur(12px);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 20%;
    width: 60%;
    height: 3px;
    border-radius: 0 0 999px 999px;
    background: var(--orange);
  }
`;

export const IconWrap = styled.div`
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
  margin: 0 auto 22px;
  border-radius: 22px;
  color: #fff;
  background: var(--orange);
  box-shadow: 0 14px 30px rgba(243, 90, 24, 0.22);
`;

export const Eyebrow = styled.span`
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  color: #b7400d;
  background: #fff0e8;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const Title = styled.h1`
  margin: 16px 0 12px;
  font-size: clamp(32px, 6vw, 44px);
  line-height: 1.05;
  letter-spacing: -0.035em;
`;

export const Description = styled.p`
  max-width: 350px;
  margin: 0 auto;
  color: #6e6964;
  font-size: 15px;
  line-height: 1.65;
`;

export const RetryButton = styled.button`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  margin-top: 27px;
  padding: 0 19px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  background: var(--orange);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 11px 24px rgba(243, 90, 24, 0.2);
  transition:
    transform 160ms ease,
    filter 160ms ease;

  &:hover {
    transform: translateY(-2px);
    filter: brightness(1.04);
  }

  &:focus-visible {
    outline: 3px solid rgba(243, 90, 24, 0.25);
    outline-offset: 3px;
  }
`;

export const Footer = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #8d8781;
  font-size: 10px;

  @media (max-width: 480px) {
    justify-content: center;
    flex-wrap: wrap;
  }
`;

export const TechnicalLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #817a74;
  text-decoration: none;

  &:hover {
    color: #3d3936;
  }
`;
