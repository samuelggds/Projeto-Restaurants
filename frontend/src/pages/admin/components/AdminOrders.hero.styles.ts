import styled from 'styled-components';

export const OrdersHero = styled.section`
  position: relative;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px 20px;
  color: #1d2823;
  background: transparent;
  box-shadow: none;
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(240px, 0.6fr);
  align-items: stretch;
  gap: 28px;
  isolation: isolate;

  &::before,
  &::after {
    content: '';
    position: absolute;
    z-index: -1;
    border: 1px solid #e5e7eb;
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
    border-radius: 8px;
  }

  color: #252a31;
  box-shadow: none;
  &::before, &::after { display: none; }
  button { background: var(--admin-accent, #b94a17); color: #fff; border: 1px solid transparent; min-height: 42px; }
  button:hover { background: #9e3c10; color: #fff; }
`;

export const HeroCopy = styled.div`
  align-self: center;

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #c25130;
    font-size: 12px;
    font-weight: 650;
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
    font-size: clamp(21px, 2vw, 28px);
    line-height: 1.04;
    letter-spacing: 0;
  }

  p {
    max-width: 650px;
    margin: 12px 0 0;
    color: #718079;
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
    border: 1px solid #e5e7eb;
    border-radius: 999px;
    color: #68717d;
    background: #f7f8fa;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
  }

  .hero-pulse svg {
    width: 13px;
    height: 13px;
    color: #b94a17;
  }

  @media (max-width: 480px) {
    h2 {
      font-size: 28px;
    }

    p {
      font-size: 13px;
    }
  }

  color: #252a31;
  box-shadow: none;
  &::before, &::after { display: none; }
  button { background: var(--admin-accent, #b94a17); color: #fff; border: 1px solid transparent; min-height: 42px; }
  button:hover { background: #9e3c10; color: #fff; }
`;

export const PriorityCard = styled.aside`
  min-width: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
  justify-content: center;

  .priority-label {
    color: #b94a17;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    font-weight: 650;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .priority-label svg {
    width: 15px;
    height: 15px;
  }

  > strong {
    margin-top: 12px;
    color: #252a31;
    font-size: 19px;
    line-height: 1.2;
    letter-spacing: 0;
  }

  > p {
    margin: 8px 0 0;
    color: #68717d;
    font-size: 12px;
    line-height: 1.45;
  }

  > button {
    width: 100%;
    min-height: 44px;
    margin-top: 17px;
    padding: 0 14px;
    border: 1px solid var(--a);
    border-radius: 11px;
    color: #252a31;
    background: var(--a);
    box-shadow: 0 2px 8px rgba(25, 35, 45, 0.05);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font-size: 12px;
    font-weight: 650;
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
    color: #68717d;
    font-size: 12px;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 860px) {
    background: #f7f8fa;
  }

  @media (prefers-reduced-motion: reduce) {
    > button {
      transition: none;
    }

    > button:hover {
      transform: none;
    }
  }

  color: #252a31;
  box-shadow: none;
  &::before, &::after { display: none; }
  button { background: var(--admin-accent, #b94a17); color: #fff; border: 1px solid transparent; min-height: 42px; }
  button:hover { background: #9e3c10; color: #fff; }
`;
