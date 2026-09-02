import { css } from 'styled-components';

export const employeeCompensationBaseStyles = css`
  container: employee-compensation / inline-size;
  --ink: #282522;
  --muted: #746e68;
  --border: #e2ddd7;
  --surface: #ffffff;
  --soft: #f7f5f2;
  --accent: #b74d31;
  display: grid;
  gap: 18px;
  width: auto;
  max-width: 1180px;
  min-width: 0;
  margin: 0 auto;
  color: var(--ink);

  button,
  input,
  select,
  textarea {
    font: inherit;
  }

  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 3px solid #b74d3126;
    outline-offset: 1px;
  }

  .page-header,
  .header-controls,
  .panel-heading,
  .toolbar,
  .row-actions,
  .dialog-actions,
  .notice {
    display: flex;
    align-items: center;
  }

  .page-header {
    justify-content: space-between;
    gap: 24px;
    padding: 4px 2px 0;
  }

  .page-title {
    min-width: 0;
  }

  .eyebrow,
  .section-kicker {
    color: var(--accent);
    font-size: 11px;
    font-weight: 850;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .eyebrow {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 7px;
  }

  .eyebrow svg {
    width: 16px;
    height: 16px;
  }

  .page-title h2 {
    margin: 0;
    font-size: 27px;
    line-height: 1.18;
    letter-spacing: 0;
  }

  .page-title p,
  .panel-heading p {
    margin: 6px 0 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.45;
  }

  .header-controls {
    flex: 0 0 auto;
    gap: 8px;
  }

  .month-control {
    min-width: 202px;
    min-height: 52px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
  }

  .month-control > svg {
    width: 18px;
    height: 18px;
    color: var(--accent);
  }

  .month-control > span {
    min-width: 0;
    display: grid;
  }

  .month-control small {
    color: var(--muted);
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .month-control input {
    min-width: 0;
    border: 0;
    padding: 0;
    color: var(--ink);
    background: transparent;
    outline: 0;
    font-size: 13px;
    font-weight: 800;
  }

  .icon-button,
  .primary-button,
  .secondary-button,
  .danger-button,
  .empty-state button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border-radius: 7px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 850;
  }

  .icon-button {
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    border: 1px solid var(--border);
    color: #625b55;
    background: #fff;
  }

  .header-controls > .icon-button {
    width: 52px;
    height: 52px;
    flex-basis: 52px;
  }

  .icon-button svg,
  .primary-button svg,
  .secondary-button svg,
  .danger-button svg {
    width: 16px;
    height: 16px;
  }

  .icon-button:hover:not(:disabled),
  .secondary-button:hover:not(:disabled) {
    border-color: #cabfb5;
    color: var(--accent);
    background: #fdf9f7;
  }

  .icon-button.danger,
  .danger-button {
    color: #a53e34;
  }

  .icon-button.success {
    color: #247048;
  }

  .primary-button,
  .secondary-button,
  .danger-button,
  .empty-state button {
    min-height: 40px;
    padding: 0 13px;
  }

  .primary-button {
    border: 1px solid var(--accent);
    color: #fff;
    background: var(--accent);
  }

  .primary-button:hover:not(:disabled) {
    border-color: #9e3f28;
    background: #9e3f28;
  }

  .secondary-button,
  .empty-state button {
    border: 1px solid var(--border);
    color: #554f49;
    background: #fff;
  }

  .danger-button {
    border: 1px solid #d9aaa4;
    background: #fff4f2;
  }

  .danger-button.subtle {
    margin-right: auto;
    border-color: transparent;
    background: transparent;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  &[aria-busy='true'] .refresh-button svg,
  .spin {
    animation: compensation-spin 850ms linear infinite;
  }

  @keyframes compensation-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .overview-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
  }

  .overview-strip > div {
    min-width: 0;
    min-height: 76px;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 13px 15px;
  }
`;
