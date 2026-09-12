import styled from 'styled-components';

export const Card = styled.section`
  min-width: 0;
  color: #292723;
  .section-heading {
    margin-bottom: 22px;
  }
  .eyebrow {
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: #726353;
  }
  h2 {
    margin: 7px 0;
    font-size: clamp(23px, 2.5vw, 30px);
    line-height: 1.2;
    letter-spacing: -0.03em;
  }
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.65;
    color: #706b64;
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    font: inherit;
  }
  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .card-option {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(240px, 1fr);
    gap: 34px;
    padding: clamp(22px, 3vw, 36px);
    border: 1px solid #deded5;
    border-radius: 18px;
    background: #fffefb;
    box-shadow: 0 8px 30px #30281905;
  }
  .card-copy {
    min-width: 0;
  }
  .option-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
    flex-wrap: wrap;
  }
  .option-icon {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #eaf1ec;
    color: #274e3c;
  }
  .recommended {
    border: 1px solid #d8e5d8;
    background: #f2f7ef;
    color: #355d3f;
    font-size: 11px;
    font-weight: 700;
    padding: 5px 10px;
    border-radius: 30px;
  }
  h3 {
    margin: 0 0 10px;
    font-size: clamp(21px, 2.1vw, 27px);
    line-height: 1.2;
    letter-spacing: -0.025em;
  }
  .card-copy > p {
    max-width: 510px;
  }
  .benefits {
    display: grid;
    gap: 8px;
    list-style: none;
    padding: 0;
    margin: 20px 0 24px;
    font-size: 12px;
    color: #526255;
  }
  .benefits li {
    display: flex;
    gap: 9px;
    align-items: center;
  }
  .benefits svg {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
  }
  .primary {
    min-height: 46px;
    padding: 12px 20px;
    border: 1px solid #254333;
    border-radius: 10px;
    background: #254333;
    color: #fff;
    font-size: 13px;
    font-weight: 700;
  }
  .primary:hover:not(:disabled) {
    background: #193325;
  }
  .security {
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #7b7b72;
  }
  .security svg {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }
  .payment-preview {
    min-width: 0;
    align-self: center;
    padding: 24px;
    border-radius: 14px;
    background: #f5f5ef;
  }
  .payment-preview > small {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #7c7c70;
  }
  .preview-card {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 17px 8px;
    padding: 22px;
    margin: 13px 0 16px;
    border-radius: 12px;
    color: #fff;
    background: linear-gradient(130deg, #243f33, #49614d);
    box-shadow: 0 10px 20px #1a312519;
  }
  .preview-card > span {
    text-align: right;
    font-size: 10px;
    align-self: center;
  }
  .preview-card strong {
    grid-column: 1 / -1;
    font-size: 21px;
    letter-spacing: 0.12em;
  }
  .preview-card small {
    grid-column: 1 / -1;
    color: #d6e1d9;
    font-size: 10px;
  }
  .current-method {
    font-size: 12px;
    line-height: 1.5;
  }
  .text-button {
    border: 0;
    padding: 8px 0;
    color: #30543f;
    background: transparent;
    font-size: 12px;
    font-weight: 700;
  }
  .pix-alternative {
    margin-top: 18px;
    border: 1px solid #e5e4dd;
    border-radius: 12px;
    background: #fff;
  }
  .pix-toggle {
    width: 100%;
    justify-content: flex-start;
    text-align: left;
    padding: 17px 20px;
    border: 0;
    border-radius: inherit;
    background: transparent;
    color: #67665e;
    gap: 12px;
  }
  .pix-toggle span {
    flex: 1;
    display: grid;
    gap: 3px;
  }
  .pix-toggle strong {
    font-size: 13px;
    font-weight: 650;
  }
  .pix-toggle small {
    font-size: 11px;
    color: #878178;
  }
  .expanded {
    transform: rotate(180deg);
  }
  .pix-details {
    border-top: 1px solid #eeece7;
    padding: 18px 20px;
    display: grid;
    justify-items: start;
    gap: 14px;
  }
  .pix-details p {
    font-size: 12px;
    max-width: 750px;
  }
  .pix-current {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 12px;
    color: #3f6c4c;
  }
  .secondary,
  .error button {
    min-height: 40px;
    border: 1px solid #dbdcd4;
    padding: 9px 14px;
    color: #4f554b;
    background: #fff;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
  }
  .warning {
    padding: 12px 15px;
    background: #fff8ec;
    border: 1px solid #f0dfbe;
    color: #795d32;
    border-radius: 9px;
    margin-top: 14px;
    font-size: 12px;
  }
  .notice,
  .error,
  .loading {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 16px;
    border-radius: 10px;
    padding: 13px 16px;
    font-size: 13px;
  }
  .notice {
    background: #edf7ef;
    color: #386046;
  }
  .error {
    background: #fff5ee;
    border: 1px solid #ebd8c8;
  }
  .error p {
    flex: 1 1 250px;
    color: #80573a;
    font-size: 12px;
  }
  .loading {
    background: #f2f3ef;
    color: #727569;
  }
  @media (max-width: 760px) {
    .card-option {
      grid-template-columns: 1fr;
      gap: 22px;
    }
    .payment-preview {
      padding: 17px;
    }
    .preview-card {
      max-width: 310px;
    }
  }
  @media (max-width: 480px) {
    .primary {
      width: 100%;
    }
    .card-option {
      padding: 20px;
    }
    .section-heading {
      margin-bottom: 16px;
    }
    .pix-toggle {
      padding: 15px;
    }
  }
`;

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: #14201bd1;
  display: grid;
  place-items: center;
  padding: 18px;
`;
export const Modal = styled.form`
  box-sizing: border-box;
  width: min(510px, 100%);
  max-height: calc(100dvh - 36px);
  overflow-y: auto;
  padding: 28px;
  border-radius: 18px;
  background: #fffefa;
  color: #272d25;
  box-shadow: 0 24px 90px #0005;
  header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .dialog-icon {
    padding: 10px;
    background: #eaf1e9;
    color: #31563e;
    border-radius: 12px;
    display: flex;
  }
  .close {
    width: 40px;
    padding: 0;
    background: transparent;
  }
  h2 {
    font-size: 22px;
    line-height: 1.25;
    margin: 0 0 9px;
  }
  p {
    font-size: 12px;
    color: #756f66;
    line-height: 1.6;
  }
  fieldset {
    margin: 18px 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }
  fieldset:disabled {
    opacity: 0.5;
  }
  label,
  .field-label {
    display: block;
    margin: 13px 0;
    font-size: 12px;
    font-weight: 650;
  }
  input:not([type='checkbox']),
  .mp-field {
    width: 100%;
    box-sizing: border-box;
    margin-top: 7px;
    min-height: 46px;
    border: 1px solid #d8d9cf;
    border-radius: 9px;
    padding: 11px 12px;
    background: #fff;
    font: inherit;
    font-size: 16px;
  }
  .mp-field iframe {
    max-width: 100%;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .row .field-label {
    margin: 0;
  }
  .consent {
    display: flex;
    gap: 10px;
    font-weight: 400;
    line-height: 1.6;
    margin-top: 22px;
  }
  .consent input {
    width: 17px;
    height: 17px;
    flex-shrink: 0;
    margin: 2px 0 0;
    accent-color: #254333;
  }
  .security {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
  }
  .security svg {
    flex-shrink: 0;
  }
  .demo-card {
    background: #f0f5ee;
    border: 1px solid #dce6d6;
    border-radius: 10px;
    padding: 18px;
    margin-top: 20px;
  }
  .error {
    margin: 12px 0;
    padding: 13px;
    background: #fff2ec;
    border: 1px solid #edcebd;
    border-radius: 9px;
    color: #80523c;
  }
  .error p {
    color: inherit;
    margin: 0 0 10px;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 18px;
    margin-top: 20px;
    border-top: 1px solid #e9e5db;
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 44px;
    border: 1px solid #d7dacf;
    border-radius: 9px;
    padding: 10px 14px;
    background: #fff;
    color: #51564b;
    cursor: pointer;
    font: inherit;
    font-size: 12px;
    font-weight: 650;
  }
  button.primary {
    background: #254333;
    color: #fff;
    border-color: #254333;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  @media (max-width: 540px) {
    padding: 21px;
    footer {
      flex-direction: column-reverse;
    }
    footer button {
      width: 100%;
    }
  }
`;
