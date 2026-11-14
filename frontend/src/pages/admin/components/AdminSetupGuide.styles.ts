import styled from 'styled-components';

export const GuideRoot = styled.section`
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  color: #20252b;

  button {
    font: inherit;
    cursor: pointer;
  }

  button:focus-visible {
    outline: 3px solid #c2410c;
    outline-offset: 3px;
  }

  .guide-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 24px 24px 20px;
  }
  .guide-header > div {
    flex: 1;
    min-width: 0;
  }
  .guide-toggle {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #68717d;
    padding: 7px 0;
    font-size: 12px;
  }
  .guide-toggle:hover {
    color: #a34214;
  }
  .guide-toggle svg {
    width: 15px;
    height: 15px;
  }

  .guide-icon {
    display: grid;
    flex: 0 0 auto;
    width: 40px;
    height: 40px;
    place-items: center;
    border: 1px solid #f2e5db;
    border-radius: 11px;
    background: #fff8f2;
    color: #a94616;
  }

  .guide-header h2 {
    margin: 0 0 5px;
    font-size: 18px;
    font-weight: 750;
    line-height: 1.4;
    letter-spacing: -0.25px;
  }

  .guide-header p,
  .guide-description p {
    margin: 0;
    color: #68717d;
    font-size: 13px;
    line-height: 1.65;
  }

  .guide-steps {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 8px;
    padding: 0 24px 22px;
  }

  .guide-step {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
    padding: 10px;
    border: 1px solid #e5e7eb;
    border-radius: 9px;
    background: #fff;
    color: #616a76;
    font-size: 12px;
    font-weight: 650;
    line-height: 1.4;
    text-align: left;
    overflow-wrap: anywhere;
  }

  .guide-step-number {
    display: grid;
    flex: 0 0 auto;
    width: 26px;
    height: 26px;
    place-items: center;
    border-radius: 7px;
    background: #f2f4f6;
    color: #616a76;
    font-size: 12px;
  }

  .guide-step:hover {
    border-color: #d1d5db;
    background: #fafbfc;
  }

  .guide-step[aria-pressed='true'] {
    border-color: #edc4aa;
    background: #fff8f2;
    color: #a34214;
  }

  .guide-step[aria-pressed='true'] .guide-step-number {
    background: #b94a17;
    color: #fff;
  }

  .guide-content {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.5fr);
    align-items: start;
    gap: 18px 32px;
    padding: 24px;
    border-top: 1px solid #edf0f2;
  }

  .guide-description,
  .guide-actions {
    min-width: 0;
  }

  .guide-step-caption {
    display: block;
    margin-bottom: 9px;
    color: #a34214;
    font-size: 11px;
    font-weight: 750;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .guide-description h3 {
    margin: 0 0 10px;
    font-size: 17px;
    font-weight: 700;
    line-height: 1.4;
    letter-spacing: -0.2px;
  }

  .guide-actions {
    display: grid;
    gap: 8px;
  }

  .guide-action {
    display: flex;
    width: 100%;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px 14px;
    border: 1px solid #e9ecef;
    border-radius: 9px;
    background: #fff;
    color: #363f49;
    text-align: left;
  }

  .guide-action > span {
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .guide-action strong {
    display: block;
    margin-bottom: 3px;
    font-size: 13px;
    font-weight: 650;
    line-height: 1.4;
  }

  .guide-action-description {
    display: block;
    color: #68717d;
    font-size: 12px;
    line-height: 1.5;
  }

  .guide-action > svg {
    flex: 0 0 auto;
    color: #7c8590;
  }

  .guide-action:hover {
    border-color: #edc4aa;
    background: #fffcf9;
  }

  .guide-action:hover > svg {
    color: #a34214;
  }

  .guide-tip {
    grid-column: 1 / -1;
    margin: 0;
    padding-top: 16px;
    border-top: 1px solid #edf0f2;
    color: #68717d;
    font-size: 12px;
    line-height: 1.6;
  }

  @media (max-width: 1200px) {
    .guide-steps {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .guide-content {
      grid-template-columns: minmax(0, 1fr);
      gap: 20px;
    }
  }

  @media (max-width: 520px) {
    .guide-header {
      padding: 18px 16px;
      flex-wrap: wrap;
    }
    .guide-toggle {
      padding: 6px;
      margin-left: 0;
      width: 28px;
      height: 32px;
    }
    .guide-toggle span {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .guide-header h2 {
      font-size: 16px;
    }

    .guide-steps {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      padding: 0 16px 18px;
    }

    .guide-content {
      padding: 20px 16px;
    }
  }
`;
