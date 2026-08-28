import styled, { keyframes } from 'styled-components';

const float = keyframes`
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-10px) rotate(4deg); }
`;

const progress = keyframes`
  0% { transform: translateX(-80%); }
  100% { transform: translateX(260%); }
`;

export const Page = styled.main`
  --orange: #f45a13;
  --ink: #121719;
  min-height: 100vh;
  min-height: 100dvh;
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: clamp(20px, 3vw, 42px) clamp(20px, 5vw, 76px);
  color: #f9f7f2;
  background:
    radial-gradient(circle at 78% 26%, rgba(244, 90, 19, 0.16), transparent 28rem),
    linear-gradient(145deg, #101719 0%, #172124 52%, #0c1113 100%);
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

export const Ambient = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.55;
  span {
    position: absolute;
    border: 1px solid rgba(255, 255, 255, 0.055);
    border-radius: 50%;
  }
  span:first-child {
    width: 34rem;
    height: 34rem;
    right: -13rem;
    top: -12rem;
  }
  span:last-child {
    width: 22rem;
    height: 22rem;
    left: -9rem;
    bottom: -12rem;
  }
`;

export const Header = styled.header`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 13px;
`;

export const BrandMark = styled.span`
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  color: #fff;
  background: var(--orange);
  font:
    700 19px Georgia,
    serif;
  box-shadow: 0 10px 30px rgba(244, 90, 19, 0.28);
`;

export const BrandCopy = styled.div`
  display: grid;
  gap: 2px;
  strong {
    font:
      700 20px Georgia,
      serif;
  }
  span {
    color: #9ca8aa;
    font-size: 11px;
  }
`;

export const StatusPill = styled.div`
  margin-left: auto;
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  color: #c9d0d1;
  background: rgba(255, 255, 255, 0.045);
  font-size: 11px;
  font-weight: 700;
  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ffac75;
    box-shadow: 0 0 0 5px rgba(244, 90, 19, 0.12);
  }
  @media (max-width: 620px) {
    display: none;
  }
`;

export const Main = styled.section`
  position: relative;
  z-index: 1;
  width: min(1160px, 100%);
  margin: auto;
  display: grid;
  grid-template-columns: minmax(0, 1.12fr) minmax(300px, 0.88fr);
  gap: clamp(34px, 7vw, 92px);
  align-items: center;
  padding: 60px 0;
  @media (max-width: 840px) {
    grid-template-columns: 1fr;
    padding: 54px 0 36px;
  }
`;

export const MessagePanel = styled.section`
  max-width: 670px;
`;

export const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: #ff9b66;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const Title = styled.h1`
  margin: 22px 0 18px;
  max-width: 660px;
  font-size: clamp(38px, 5.2vw, 68px);
  line-height: 0.99;
  letter-spacing: -0.045em;
`;

export const Description = styled.p`
  max-width: 620px;
  margin: 0;
  color: #bac3c4;
  font-size: clamp(16px, 2vw, 19px);
  line-height: 1.65;
`;

export const Reassurance = styled.div`
  max-width: 620px;
  margin-top: 28px;
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 17px 18px;
  border: 1px solid rgba(133, 205, 167, 0.17);
  border-radius: 15px;
  color: #95d5b1;
  background: rgba(71, 144, 102, 0.08);
  svg {
    flex: 0 0 auto;
  }
  div {
    display: grid;
    gap: 4px;
  }
  strong {
    color: #d9eee2;
    font-size: 13px;
  }
  span {
    color: #9eb1a5;
    font-size: 12px;
    line-height: 1.5;
  }
`;

export const Actions = styled.div`
  margin-top: 28px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
`;

export const RetryButton = styled.button`
  min-height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 19px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  background: var(--orange);
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 12px 28px rgba(244, 90, 19, 0.25);
  transition:
    transform 160ms ease,
    filter 160ms ease;
  &:hover {
    transform: translateY(-2px);
    filter: brightness(1.05);
  }
  &:focus-visible {
    outline: 3px solid rgba(255, 155, 102, 0.45);
    outline-offset: 3px;
  }
`;

export const TimeHint = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #8d999b;
  font-size: 11px;
`;

export const VisualPanel = styled.aside`
  min-height: 430px;
  position: relative;
  display: grid;
  place-items: center;
  @media (max-width: 840px) {
    min-height: 300px;
  }
`;

export const VisualOrb = styled.div`
  width: min(350px, 72vw);
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(244, 90, 19, 0.18) 0 27%, transparent 28%),
    repeating-radial-gradient(circle, transparent 0 42px, rgba(255, 255, 255, 0.045) 43px 44px);
`;

export const ToolRing = styled.div`
  width: 112px;
  height: 112px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 32px;
  color: #fff;
  background: linear-gradient(145deg, #f66b29, #cb3f05);
  box-shadow: 0 24px 55px rgba(244, 90, 19, 0.3);
  animation: ${float} 4s ease-in-out infinite;
`;

export const ProgressCard = styled.div`
  position: absolute;
  left: 4%;
  right: 4%;
  bottom: 7%;
  padding: 17px 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: rgba(16, 23, 25, 0.82);
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(12px);
  div:first-child {
    display: grid;
    gap: 4px;
  }
  span {
    color: #ff8c52;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.1em;
  }
  strong {
    font-size: 13px;
  }
  small {
    display: block;
    margin-top: 9px;
    color: #7f8b8e;
    font-size: 10px;
  }
`;

export const ProgressTrack = styled.div`
  height: 4px;
  margin-top: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  i {
    display: block;
    width: 38%;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, transparent, #f66b29, transparent);
    animation: ${progress} 2.2s ease-in-out infinite;
  }
`;

export const Footer = styled.footer`
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  color: #707d80;
  font-size: 10px;
`;

export const TechnicalLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #778386;
  text-decoration: none;
  &:hover {
    color: #c3cbcc;
  }
`;
