import styled, { keyframes } from 'styled-components';

const offerReveal = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const Section = styled.section`
  position: relative;
  isolation: isolate;
  width: min(1240px, 100%);
  margin: 34px auto 0;
  padding: clamp(20px, 3vw, 30px);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--home-primary) 22%, #eadfd3);
  border-radius: 26px;
  background:
    radial-gradient(
      circle at 92% 8%,
      color-mix(in srgb, var(--home-primary) 15%, transparent) 0,
      transparent 31%
    ),
    linear-gradient(145deg, #fff 0%, color-mix(in srgb, var(--home-primary) 5%, #fffaf5) 100%);
  box-shadow: 0 20px 54px rgba(70, 45, 20, 0.09);
  animation: ${offerReveal} 320ms ease both;

  &::after {
    content: '';
    position: absolute;
    z-index: -1;
    top: -74px;
    right: -58px;
    width: 190px;
    height: 190px;
    border: 32px solid color-mix(in srgb, var(--home-primary) 8%, transparent);
    border-radius: 50%;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 760px) {
    margin-top: 24px;
    padding: 18px 12px 14px;
    border-radius: 20px;
  }
`;

export const Header = styled.header`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;

  h2 {
    margin: 7px 0 5px;
    color: var(--home-text);
    font-size: clamp(24px, 3vw, 32px);
    line-height: 1.05;
    letter-spacing: -0.035em;
  }

  p {
    max-width: 650px;
    margin: 0;
    color: var(--home-muted);
    font-size: 14px;
    line-height: 1.5;
  }

  @media (max-width: 620px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 13px;
    margin: 0 5px 17px;

    h2 {
      font-size: 25px;
    }

    p {
      font-size: 13px;
    }
  }
`;

export const Eyebrow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--home-primary);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

export const Count = styled.span`
  min-height: 40px;
  padding: 9px 13px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--home-primary) 22%, #eadfd3);
  border-radius: 999px;
  color: var(--home-primary);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 8px 20px rgba(70, 45, 20, 0.07);
  font-size: 12px;
  font-weight: 800;

  @media (max-width: 620px) {
    min-height: 34px;
    padding: 7px 11px;
  }
`;

export const Grid = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  > article:only-child {
    grid-column: 1 / -1;
    width: min(980px, 100%);
    margin-inline: auto;
  }

  @media (max-width: 1080px) {
    grid-template-columns: minmax(0, 1fr);
  }

  @media (max-width: 760px) {
    gap: 13px;
  }
`;
