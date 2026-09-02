import styled from 'styled-components';

export const Root = styled.section`
  grid-column: 1 / -1;
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(300px, 0.72fr) minmax(0, 1.28fr);
  overflow: hidden;
  border: 1px solid #e5ded7;
  border-radius: 8px;
  background: #fff;

  .eyebrow {
    display: block;
    margin-bottom: 5px;
    color: var(--a);
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .preview-controls {
    min-width: 0;
    display: grid;
    align-content: start;
    gap: 20px;
    padding: 24px;
  }

  .preview-heading {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 12px;
  }

  .preview-heading-icon {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 7px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 8%, #fff);
  }

  .preview-heading-icon svg {
    width: 19px;
    height: 19px;
  }

  .preview-heading h3 {
    margin: 2px 0 5px;
    color: #2f2a26;
    font-size: 19px;
    line-height: 1.25;
  }

  .preview-heading p {
    margin: 0;
    color: #716a64;
    font-size: 13px;
    line-height: 1.5;
  }

  .preview-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 3px;
    padding: 3px;
    border: 1px solid #e4ded8;
    border-radius: 8px;
    background: #f4f2ef;
  }

  .preview-tabs button {
    min-width: 0;
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 0;
    border-radius: 6px;
    padding: 0 8px;
    color: #655e58;
    background: transparent;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .preview-tabs button svg {
    width: 16px;
    height: 16px;
  }

  .preview-tabs button.active {
    color: var(--a);
    background: #fff;
    box-shadow: 0 1px 5px rgba(48, 35, 24, 0.08);
  }

  .preview-tabs button:focus-visible {
    outline: 2px solid var(--a);
    outline-offset: 2px;
  }

  .preview-settings {
    display: grid;
    gap: 10px;
  }

  .preview-settings span {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #5e5751;
    font-size: 12px;
    font-weight: 700;
  }

  .preview-settings svg {
    width: 15px;
    height: 15px;
    color: #837a72;
  }

  .receipt-stage {
    min-width: 0;
    min-height: 540px;
    display: grid;
    place-items: center;
    padding: 30px;
    border-left: 1px solid #e4ded8;
    background-color: #f1efec;
    background-image: radial-gradient(#d7d1cb 0.7px, transparent 0.7px);
    background-size: 13px 13px;
  }

  .receipt-paper {
    position: relative;
    width: min(100%, 360px);
    display: grid;
    color: #201e1c;
    background: #fff;
    box-shadow: 0 16px 36px rgba(49, 39, 31, 0.15);
    font-family: 'Courier New', Courier, monospace;
    transition: width 180ms ease;
  }

  .receipt-paper.paper-58 {
    width: min(100%, 280px);
  }

  .receipt-sample {
    position: absolute;
    top: 11px;
    right: 11px;
    border: 1px solid #bbb5af;
    padding: 2px 4px;
    color: #68625c;
    font-size: 9px;
    font-weight: 800;
  }

  .receipt-brand {
    display: grid;
    justify-items: center;
    gap: 3px;
    padding: 25px 18px 16px;
    border-bottom: 1px dashed #8f8983;
  }

  .receipt-brand strong {
    font-size: 17px;
  }

  .receipt-brand span,
  .receipt-order > small {
    font-size: 10px;
  }

  .receipt-order,
  .receipt-customer,
  .receipt-items,
  .receipt-note,
  .receipt-footer {
    margin: 0 17px;
    padding: 14px 0;
    border-bottom: 1px dashed #aaa49e;
  }

  .receipt-order {
    display: grid;
    gap: 5px;
  }

  .receipt-service {
    width: fit-content;
    padding: 3px 5px;
    color: #fff;
    background: #377766;
    font-size: 10px;
    font-weight: 900;
  }

  .receipt-service.table {
    background: #826329;
  }

  .receipt-service.pickup {
    background: #ba552f;
  }

  .receipt-order > strong {
    font-size: 17px;
  }

  .receipt-customer {
    display: grid;
    gap: 6px;
  }

  .receipt-customer p {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    margin: 0;
    font-size: 11px;
    line-height: 1.4;
  }

  .receipt-customer svg {
    width: 12px;
    height: 12px;
    flex: 0 0 12px;
  }

  .receipt-items {
    display: grid;
    gap: 13px;
  }

  .receipt-item {
    display: grid;
    grid-template-columns: 29px minmax(0, 1fr);
    gap: 6px;
  }

  .receipt-item > b,
  .receipt-item strong {
    font-size: 13px;
  }

  .receipt-item > span {
    display: grid;
    gap: 3px;
  }

  .receipt-item small {
    font-size: 11px;
  }

  .receipt-note {
    display: grid;
    gap: 5px;
    padding-right: 9px;
    padding-left: 9px;
    background: #f5f3f0;
  }

  .receipt-note b {
    font-size: 10px;
  }

  .receipt-note span {
    font-size: 12px;
    font-weight: 700;
    line-height: 1.4;
  }

  .receipt-footer {
    display: grid;
    justify-items: center;
    gap: 4px;
    border-bottom: 0;
    font-size: 10px;
    text-align: center;
  }

  @container kitchen-printing (max-width: 820px) {
    grid-template-columns: 1fr;

    .receipt-stage {
      border-top: 1px solid #e4ded8;
      border-left: 0;
    }
  }

  @container kitchen-printing (max-width: 560px) {
    .preview-controls {
      padding: 18px;
    }

    .receipt-stage {
      min-height: 500px;
      padding: 22px 16px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .receipt-paper {
      transition-duration: 0.01ms;
    }
  }
`;
