import styled from 'styled-components';

export const ShiftBanner = styled.section`
  min-height: 180px;
  margin-bottom: 18px;
  padding: 24px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  overflow: hidden;
  border-radius: 8px;
  color: #f7fbf9;
  background-color: #223235;
  background-image:
    linear-gradient(112deg, transparent 52%, color-mix(in srgb, var(--brand) 42%, transparent)),
    repeating-linear-gradient(90deg, transparent 0 52px, rgba(255, 255, 255, 0.025) 52px 53px);
  box-shadow: 0 13px 28px rgba(24, 39, 41, 0.14);

  .copy {
    min-width: 0;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #b9ddd3;
    font-size: 9px;
    font-weight: 850;
    text-transform: uppercase;
  }

  .eyebrow svg {
    width: 15px;
  }

  h2 {
    max-width: 640px;
    margin: 8px 0 6px;
    font-family: 'Sora', sans-serif;
    font-size: 25px;
    line-height: 1.2;
    letter-spacing: 0;
  }

  p {
    max-width: 620px;
    margin: 0;
    color: #c4cfcb;
    font-size: 12px;
    line-height: 1.55;
  }

  .signal {
    min-width: 260px;
    padding-left: 24px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    border-left: 1px solid rgba(255, 255, 255, 0.13);
  }

  .signal span {
    display: grid;
    gap: 3px;
  }

  .signal small {
    color: #aab9b5;
    font-size: 9px;
    text-transform: uppercase;
  }

  .signal b {
    font-size: 22px;
  }

  .signal button {
    grid-column: 1 / -1;
    min-height: 42px;
    padding: 0 14px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 7px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: #fff;
    background: var(--brand);
    font: inherit;
    font-size: 11px;
    font-weight: 800;
  }

  .signal button svg {
    width: 16px;
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    padding: 20px;

    .signal {
      min-width: 0;
      padding: 15px 0 0;
      border-top: 1px solid rgba(255, 255, 255, 0.13);
      border-left: 0;
    }
  }

  @media (max-width: 480px) {
    min-height: 0;
    padding: 18px;

    h2 {
      font-size: 20px;
    }
  }
`;

export const CapacityCard = styled.section<{ $tone: 'normal' | 'high' | 'critical' }>`
  margin: -2px 0 18px;
  padding: 15px 16px;
  border: 1px solid
    ${(p) =>
      p.$tone === 'critical' ? '#efb1a8' : p.$tone === 'high' ? '#ead19a' : '#cfe1d5'};
  border-radius: 9px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: center;
  gap: 13px;
  background: ${(p) =>
    p.$tone === 'critical' ? '#fff3f1' : p.$tone === 'high' ? '#fff9e8' : '#f3faf5'};
  box-shadow: 0 5px 16px rgba(23, 37, 34, 0.035);

  .capacity-icon {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    color: ${(p) =>
      p.$tone === 'critical' ? '#b53f33' : p.$tone === 'high' ? '#9a6817' : '#287b43'};
    background: rgba(255, 255, 255, 0.76);
  }

  .capacity-icon svg {
    width: 23px;
  }

  .capacity-copy {
    min-width: 0;
    display: grid;
    gap: 7px;
  }

  .capacity-copy > span {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  .capacity-copy small {
    color: #62706a;
    font-size: 10px;
  }

  .capacity-copy b {
    color: ${(p) =>
      p.$tone === 'critical' ? '#a9352c' : p.$tone === 'high' ? '#8a5b12' : '#276e3c'};
    font-size: 12px;
  }

  .capacity-track {
    height: 8px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(50, 70, 62, 0.11);
  }

  .capacity-track i {
    display: block;
    height: 100%;
    max-width: 100%;
    border-radius: inherit;
    background: ${(p) =>
      p.$tone === 'critical' ? '#c84e3f' : p.$tone === 'high' ? '#c98b28' : '#329154'};
    transition: width 220ms ease;
  }

  @media (max-width: 560px) {
    grid-template-columns: 38px minmax(0, 1fr);
    padding: 12px;

    .capacity-icon {
      width: 38px;
      height: 38px;
    }

    .capacity-copy > span {
      align-items: flex-start;
      flex-direction: column;
      gap: 2px;
    }
  }
`;
