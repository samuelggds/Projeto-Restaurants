import styled from 'styled-components';

type CapacityTone = 'normal' | 'high' | 'critical';

const toneBorder = (tone: CapacityTone) =>
  tone === 'critical' ? '#e8b7b0' : tone === 'high' ? '#ead19a' : '#cfe1d5';

const toneBackground = (tone: CapacityTone) =>
  tone === 'critical' ? '#fff6f4' : tone === 'high' ? '#fff9e8' : '#f3faf5';

const toneInk = (tone: CapacityTone) =>
  tone === 'critical' ? '#a9352c' : tone === 'high' ? '#8a5b12' : '#276e3c';

const toneProgress = (tone: CapacityTone) =>
  tone === 'critical' ? '#c84e3f' : tone === 'high' ? '#c98b28' : '#329154';

export const CapacityCard = styled.section<{ $tone: CapacityTone }>`
  margin-bottom: 14px;
  padding: 16px;
  border: 1px solid ${(p) => toneBorder(p.$tone)};
  border-radius: 9px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: center;
  gap: 13px;
  background: ${(p) => toneBackground(p.$tone)};
  box-shadow: 0 5px 16px rgba(23, 37, 34, 0.035);

  .capacity-icon {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    color: ${(p) => toneInk(p.$tone)};
    background: rgba(255, 255, 255, 0.82);
  }

  .capacity-icon svg {
    width: 23px;
  }

  .capacity-content {
    min-width: 0;
    display: grid;
    gap: 8px;
  }

  .capacity-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .capacity-heading > span:first-child {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .capacity-heading small {
    color: #62706a;
    font-size: 10px;
  }

  .capacity-heading b {
    color: ${(p) => toneInk(p.$tone)};
    font-family: 'Sora', sans-serif;
    font-size: 15px;
    line-height: 1.25;
  }

  .capacity-percent {
    flex: 0 0 auto;
    min-width: 48px;
    padding: 5px 8px;
    border: 1px solid ${(p) => toneBorder(p.$tone)};
    border-radius: 999px;
    color: ${(p) => toneInk(p.$tone)};
    background: rgba(255, 255, 255, 0.74);
    font-size: 11px;
    font-weight: 850;
    text-align: center;
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
    background: ${(p) => toneProgress(p.$tone)};
    transition: width 220ms ease;
  }

  .capacity-detail {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 5px 8px;
    color: #62706a;
    font-size: 10px;
    line-height: 1.45;
  }

  .capacity-detail strong {
    color: #3d4944;
    font-weight: 750;
  }

  .capacity-detail em {
    color: ${(p) => toneInk(p.$tone)};
    font-style: normal;
    font-weight: 750;
  }

  @media (max-width: 560px) {
    grid-template-columns: 38px minmax(0, 1fr);
    padding: 12px;

    .capacity-icon {
      width: 38px;
      height: 38px;
    }

    .capacity-heading b {
      font-size: 13px;
    }
  }
`;

export const QueueSection = styled.section`
  margin-top: 2px;
  padding: 18px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 5px 16px rgba(23, 37, 34, 0.035);

  .overview-order {
    grid-template-columns: minmax(140px, 0.75fr) minmax(200px, 1.35fr) auto;
  }

  @media (max-width: 680px) {
    padding: 14px;

    .overview-order {
      grid-template-columns: 1fr auto;
    }

    .overview-order .items {
      grid-column: 1 / -1;
    }
  }
`;

export const QueueHeader = styled.header`
  margin-bottom: 14px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;

  > div {
    min-width: 0;
  }

  h2 {
    margin: 0;
    color: var(--ink);
    font-family: 'Sora', sans-serif;
    font-size: 17px;
  }

  p {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.45;
  }

  .ready-count {
    flex: 0 0 auto;
    min-height: 30px;
    padding: 0 9px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #1f7837;
    background: #edf8ef;
    font-size: 10px;
    font-weight: 800;
  }

  .ready-count svg {
    width: 14px;
  }

  @media (max-width: 520px) {
    align-items: stretch;
    flex-direction: column;

    .ready-count {
      width: fit-content;
    }
  }
`;

export const QueueHint = styled.p`
  margin: 12px 0 0;
  padding-top: 12px;
  border-top: 1px solid #edf0ee;
  color: #6a746f;
  font-size: 10px;
  line-height: 1.45;
`;
