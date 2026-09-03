import styled from 'styled-components';

export const OrdersHero = styled.section`
  position: relative;
  min-height: 226px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 30px;
  color: #fff;
  background:
    radial-gradient(
      circle at 91% 12%,
      color-mix(in srgb, var(--a) 42%, transparent),
      transparent 31%
    ),
    linear-gradient(118deg, #142722 0%, #17342c 52%, #54362b 100%);
  box-shadow: 0 24px 58px rgba(27, 38, 33, 0.16);
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.6fr);
  align-items: stretch;
  gap: 28px;
  isolation: isolate;

  &::before,
  &::after {
    content: '';
    position: absolute;
    z-index: -1;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 50%;
  }

  &::before {
    width: 280px;
    height: 280px;
    right: -92px;
    bottom: -188px;
  }

  &::after {
    width: 186px;
    height: 186px;
    right: -36px;
    bottom: -141px;
  }

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 560px) {
    min-height: 0;
    padding: 23px 20px;
    border-radius: 20px;
  }
`;

export const HeroCopy = styled.div`
  align-self: center;

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #ff9a68;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0.13em;
    text-transform: uppercase;
  }

  .eyebrow svg {
    width: 15px;
    height: 15px;
  }

  h2 {
    max-width: 680px;
    margin: 12px 0 0;
    font-size: clamp(28px, 3vw, 40px);
    line-height: 1.04;
    letter-spacing: -0.04em;
  }

  p {
    max-width: 650px;
    margin: 12px 0 0;
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    line-height: 1.55;
  }

  .hero-pulse {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 23px;
  }

  .hero-pulse span {
    min-height: 31px;
    padding: 0 11px;
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 999px;
    color: rgba(255, 255, 255, 0.84);
    background: rgba(255, 255, 255, 0.06);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 700;
  }

  .hero-pulse svg {
    width: 13px;
    height: 13px;
    color: #ff9664;
  }

  @media (max-width: 480px) {
    h2 {
      font-size: 28px;
    }

    p {
      font-size: 13px;
    }
  }
`;

export const PriorityCard = styled.aside`
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.07);
  display: flex;
  flex-direction: column;
  justify-content: center;

  .priority-label {
    color: #ffad84;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 9px;
    font-weight: 850;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .priority-label svg {
    width: 15px;
    height: 15px;
  }

  > strong {
    margin-top: 12px;
    color: #fff;
    font-size: 19px;
    line-height: 1.2;
    letter-spacing: -0.025em;
  }

  > p {
    margin: 8px 0 0;
    color: rgba(255, 255, 255, 0.65);
    font-size: 11px;
    line-height: 1.45;
  }

  > button {
    width: 100%;
    min-height: 44px;
    margin-top: 17px;
    padding: 0 14px;
    border: 1px solid var(--a);
    border-radius: 11px;
    color: #fff;
    background: var(--a);
    box-shadow: 0 10px 24px color-mix(in srgb, var(--a) 28%, transparent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 11px;
    font-weight: 800;
    transition:
      background 160ms ease,
      border-color 160ms ease,
      transform 160ms ease;
  }

  > button:hover {
    border-color: color-mix(in srgb, var(--a) 82%, #fff);
    background: color-mix(in srgb, var(--a) 88%, #251812);
    transform: translateY(-1px);
  }

  > button svg {
    width: 15px;
    height: 15px;
  }

  > small {
    margin-top: 12px;
    overflow: hidden;
    color: rgba(255, 255, 255, 0.45);
    font-size: 9px;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 860px) {
    background: rgba(255, 255, 255, 0.055);
  }

  @media (prefers-reduced-motion: reduce) {
    > button {
      transition: none;
    }

    > button:hover {
      transform: none;
    }
  }
`;
