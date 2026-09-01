import styled from 'styled-components';

export const Root = styled.section`
  display: grid;
  gap: 16px;
  max-width: 1120px;
  margin: 0 auto;
  color: #29231f;

  button,
  input,
  select,
  textarea {
    font: inherit;
  }
  .hero,
  .card {
    border: 1px solid #e8dfd7;
    border-radius: 18px;
    background: #fff;
  }
  .hero {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    padding: 22px;
    background: linear-gradient(130deg, #fff 0%, #fff8f3 100%);
  }
  .hero h2,
  .card h3 {
    margin: 0 0 6px;
  }
  .hero p,
  .muted {
    margin: 0;
    color: #766d66;
    font-size: 13px;
    line-height: 1.5;
  }
  .hero-icon {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border-radius: 14px;
    color: #d65b35;
    background: #fff0e9;
  }
  .tabs {
    display: flex;
    gap: 8px;
    padding: 4px;
    border-radius: 12px;
    background: #f2efec;
  }
  .tabs button {
    border: 0;
    border-radius: 9px;
    padding: 9px 14px;
    color: #6f665f;
    background: transparent;
    cursor: pointer;
    font-weight: 700;
  }
  .tabs button.active {
    color: #9e3f22;
    background: #fff;
    box-shadow: 0 2px 9px #2d160c12;
  }
  .card {
    padding: 20px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }
  .field {
    display: grid;
    gap: 6px;
  }
  .field.full {
    grid-column: 1 / -1;
  }
  label {
    font-size: 12px;
    font-weight: 750;
  }
  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid #ddd3ca;
    border-radius: 11px;
    padding: 11px 12px;
    color: #302923;
    background: #fff;
    outline: none;
  }
  input:focus,
  select:focus,
  textarea:focus {
    border-color: #d65b35;
    box-shadow: 0 0 0 3px #d65b3514;
  }
  .range {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 8px;
    align-items: end;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 9px;
    margin-top: 16px;
  }
  .primary,
  .secondary,
  .danger {
    min-height: 40px;
    border-radius: 10px;
    padding: 0 15px;
    cursor: pointer;
    font-weight: 750;
  }
  .primary {
    border: 1px solid #c94f2d;
    color: #fff;
    background: #d65b35;
  }
  .secondary {
    border: 1px solid #ddd3ca;
    color: #453d37;
    background: #fff;
  }
  .danger {
    border: 1px solid #efb4a7;
    color: #a5311f;
    background: #fff6f3;
  }
  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  .notice {
    border-radius: 12px;
    padding: 11px 13px;
    font-size: 12px;
  }
  .notice.success {
    color: #17603b;
    background: #effbf5;
    border: 1px solid #bce8d0;
  }
  .notice.error {
    color: #9d2f22;
    background: #fff3f1;
    border: 1px solid #f0c2ba;
  }
  .courier-bar {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    align-items: end;
    margin-bottom: 16px;
  }
  .summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 9px;
    margin: 14px 0;
  }
  .summary div {
    border: 1px solid #ece4de;
    border-radius: 12px;
    padding: 12px;
  }
  .summary span {
    display: block;
    color: #81776f;
    font-size: 11px;
  }
  .summary strong {
    display: block;
    margin-top: 4px;
    font-size: 17px;
  }
  .orders {
    display: grid;
    gap: 7px;
    max-height: 330px;
    overflow: auto;
    overscroll-behavior: contain;
  }
  .order {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 10px;
    align-items: center;
    border: 1px solid #eee6df;
    border-radius: 11px;
    padding: 11px;
  }
  .order small {
    display: block;
    color: #81776f;
  }
  .settlements {
    display: grid;
    gap: 9px;
  }
  .settlement {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 14px;
    align-items: center;
    border: 1px solid #eee5de;
    border-radius: 13px;
    padding: 13px;
  }
  .status {
    display: inline-flex;
    width: fit-content;
    margin-top: 5px;
    border-radius: 99px;
    padding: 4px 8px;
    color: #78533f;
    background: #fff2e9;
    font-size: 10px;
    font-weight: 800;
  }

  @media (max-width: 760px) {
    .hero {
      align-items: flex-start;
    }
    .grid,
    .summary {
      grid-template-columns: 1fr;
    }
    .range {
      grid-template-columns: 1fr 1fr;
    }
    .range button {
      grid-column: 1 / -1;
    }
    .courier-bar,
    .settlement {
      grid-template-columns: 1fr;
    }
    .settlement .actions {
      justify-content: flex-start;
      margin: 0;
    }
  }
`;
