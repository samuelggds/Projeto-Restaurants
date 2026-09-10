import styled from 'styled-components';

export const CreateBackdrop = styled.div`
  --brand: #233f32;
  --ink: #1c3028;
  --muted: #647568;
  --border: #dfe5dd;
  --surface: #fffefb;
  --focus: #658568;
  position: fixed;
  inset: 0;
  z-index: 120;
  background: #102a1d85;
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 18px;
  font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
  color: var(--ink);
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  button,
  input,
  select {
    font: inherit;
  }
  button:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 3px;
  }
  @media (max-width: 480px) {
    padding: 10px;
  }
`;

export const CreateDialog = styled.form`
  width: min(740px, 100%);
  max-height: calc(100dvh - 36px);
  overflow: auto;
  border: 1px solid #e1e9dd;
  border-radius: 24px;
  background: var(--surface);
  box-shadow: 0 28px 100px #122d1d38;
  padding: 30px;
  display: grid;
  gap: 22px;
  header {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }
  header > div {
    min-width: 0;
  }
  h2 {
    margin: 0 0 7px;
    font-family: inherit;
    font-size: 25px;
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -0.045em;
  }
  p {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.65;
  }
  .close {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: #fff;
    color: var(--ink);
    cursor: pointer;
  }
  .fields {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 17px;
  }
  label {
    display: grid;
    min-width: 0;
    gap: 8px;
    color: var(--ink);
    font-size: 12px;
    font-weight: 650;
    line-height: 1.5;
  }
  label.wide {
    grid-column: 1 / -1;
  }
  input,
  select {
    width: 100%;
    min-width: 0;
    height: 46px;
    border: 1px solid var(--border);
    border-radius: 11px;
    background: #fff;
    color: var(--ink);
    padding: 0 13px;
    outline: none;
    font-size: 13px;
  }
  input:focus,
  select:focus {
    border-color: #658568;
    box-shadow: 0 0 0 3px #65856824;
  }
  .plan-help {
    grid-column: 1 / -1;
    border: 1px solid #dce6d3;
    background: #f0f5e8;
    color: #52654a;
    border-radius: 12px;
    padding: 14px 16px;
    font-size: 12px;
    line-height: 1.65;
  }
  .form-error {
    grid-column: 1 / -1;
    border: 1px solid #f0d1c9;
    border-radius: 11px;
    padding: 12px 14px;
    background: #fff2ed;
    color: #a64131;
    font-size: 12px;
    line-height: 1.55;
    font-weight: 650;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    border-top: 1px solid var(--border);
    padding-top: 20px;
  }
  footer button {
    min-height: 44px;
    border-radius: 11px;
    padding: 0 18px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 700;
  }
  .cancel {
    border: 1px solid var(--border);
    background: #fff;
    color: var(--ink);
  }
  .submit {
    border: 1px solid transparent;
    background: var(--brand);
    color: #fff;
  }
  .submit:disabled {
    opacity: 0.55;
    cursor: wait;
  }
  @media (max-width: 600px) {
    padding: 24px 20px;
    .fields {
      grid-template-columns: minmax(0, 1fr);
    }
    label.wide,
    .plan-help,
    .form-error {
      grid-column: auto;
    }
    footer {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
  }
  @media (max-width: 480px) {
    max-height: calc(100dvh - 20px);
    padding: 22px 17px;
    border-radius: 20px;
    h2 {
      font-size: 23px;
    }
    footer {
      grid-template-columns: minmax(0, 1fr);
    }
  }
`;
