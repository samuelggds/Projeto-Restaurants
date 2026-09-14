import styled from 'styled-components';

export const PrepaymentLayout = styled.div`
  display: grid;
  gap: 18px;
  color: #302c28;
  .rule-summary {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    padding: 16px;
    border-radius: 13px;
    border: 1px solid #dce8e0;
    background: #f4f9f5;
    color: #244c38;
  }
  .rule-summary svg {
    flex-shrink: 0;
  }
  .rule-summary b,
  .configuration-note b {
    font-size: 13px;
  }
  .rule-summary p,
  .configuration-note p {
    margin-top: 5px;
    font-size: 12px;
    line-height: 1.65;
  }
  .rule-columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
    align-items: start;
  }
  .rule-panel {
    min-width: 0;
    display: grid;
    gap: 16px;
    padding: 20px;
    border: 1px solid #ebe4dd;
    border-radius: 15px;
    background: #fffdfb;
  }
  .rule-heading {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .rule-icon {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 12px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 7%, white);
  }
  h4 {
    margin: 0;
    font-size: 15px;
  }
  .rule-heading p {
    margin-top: 3px;
    font-size: 11px;
    color: #756d65;
  }
  .limit-field {
    grid-template-columns: 1fr;
  }
  .limit-field label {
    font-size: 12px;
  }
  .limit-field input {
    font-size: 16px;
  }
  .rule-note,
  .timezone-note {
    color: #746b63;
    font-size: 12px;
    line-height: 1.65;
  }
  .timezone-note {
    padding: 10px 12px;
    border-radius: 9px;
    background: #f3efe9;
  }
  .example {
    display: grid;
    gap: 12px;
    padding: 16px;
    border: 1px solid #e6ded3;
    border-radius: 12px;
    background: #faf6ef;
    font-size: 12px;
    line-height: 1.6;
  }
  .example > b {
    font-size: 12px;
  }
  .example dl {
    display: grid;
    gap: 8px;
    margin: 0;
  }
  .example dl > div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
  }
  .example dd {
    margin: 0;
    font-weight: 800;
    white-space: nowrap;
  }
  .example-total {
    padding-top: 9px;
    border-top: 1px solid #e2d7c6;
  }
  .example small {
    color: #776950;
    font-size: 11px;
  }
  .empty-periods {
    display: grid;
    justify-items: center;
    gap: 8px;
    padding: 24px 16px;
    border: 1px dashed #ded5cb;
    border-radius: 12px;
    text-align: center;
    color: #776d62;
    font-size: 12px;
    line-height: 1.6;
  }
  .empty-periods svg {
    color: #998775;
  }
  .add-period {
    min-height: 44px;
  }
  .days button {
    min-height: 44px;
    min-width: 38px;
  }
  .times label {
    display: grid;
    gap: 7px;
    min-width: 0;
    font-size: 11px;
    font-weight: 700;
  }
  .times input {
    min-width: 0;
    min-height: 44px;
    font-size: 16px;
  }
  .overnight-note {
    margin-top: 10px;
    font-size: 11px;
    line-height: 1.6;
    color: #746b63;
  }
  .configuration-note {
    padding: 14px 16px;
    border-radius: 12px;
    background: #f6f3ef;
    font-size: 12px;
    line-height: 1.6;
  }
  .configuration-note.warning {
    color: #875217;
    border: 1px solid #efdab8;
    background: #fff9ed;
  }
  .configuration-note button {
    margin-top: 10px;
    min-height: 44px;
  }
  button:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a) 35%, white);
    outline-offset: 3px;
  }
  @media (max-width: 900px) {
    .rule-columns {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 520px) {
    .rule-panel {
      padding: 14px;
    }
    .example dl > div {
      flex-wrap: wrap;
    }
    .rule-summary {
      padding: 13px;
    }
  }
`;
