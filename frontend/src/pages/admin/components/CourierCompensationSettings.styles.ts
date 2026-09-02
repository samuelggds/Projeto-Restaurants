import styled from 'styled-components';

export const Root = styled.section`
  container: courier-compensation / inline-size;
  --courier-ink: #28231f;
  --courier-muted: #746d66;
  --courier-border: #e3ddd6;
  display: grid;
  gap: 18px;
  min-width: 0;
  width: auto;
  max-width: 1160px;
  margin: 0 auto;
  color: var(--courier-ink);

  button,
  input,
  select,
  textarea {
    font: inherit;
  }

  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 4px 2px 0;
  }

  .eyebrow,
  .section-kicker {
    color: var(--a);
    font-size: 11px;
    font-weight: 850;
    text-transform: uppercase;
  }

  .eyebrow {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 7px;
  }

  .eyebrow svg {
    width: 15px;
    height: 15px;
  }

  .page-title h2 {
    margin: 0;
    font-size: 26px;
    line-height: 1.2;
  }

  .page-title p,
  .panel-header p {
    margin: 5px 0 0;
    color: var(--courier-muted);
    font-size: 13px;
    line-height: 1.5;
  }

  .refresh-button {
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    display: grid;
    place-items: center;
    border: 1px solid var(--courier-border);
    border-radius: 8px;
    color: #5d554f;
    background: #fff;
    cursor: pointer;
  }

  .refresh-button svg {
    width: 17px;
    height: 17px;
  }

  &[aria-busy='true'] .refresh-button svg {
    animation: courier-refresh 850ms linear infinite;
  }

  @keyframes courier-refresh {
    to {
      transform: rotate(360deg);
    }
  }

  .overview-strip {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border: 1px solid var(--courier-border);
    border-radius: 8px;
    background: #fff;
  }

  .overview-strip > div {
    min-width: 0;
    min-height: 68px;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 12px 16px;
  }

  .overview-strip > div + div {
    border-left: 1px solid var(--courier-border);
  }

  .overview-strip > div > span:last-child {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .overview-strip b {
    font-size: 19px;
    line-height: 1;
  }

  .overview-strip small {
    overflow: hidden;
    color: var(--courier-muted);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .metric-icon,
  .panel-icon {
    display: grid;
    place-items: center;
    border-radius: 7px;
  }

  .metric-icon {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
  }

  .metric-icon svg {
    width: 16px;
    height: 16px;
  }

  .metric-icon.couriers {
    color: #2c7767;
    background: #edf8f5;
  }
  .metric-icon.deliveries {
    color: #b35b27;
    background: #fff4ec;
  }
  .metric-icon.settlements {
    color: #826329;
    background: #faf5e8;
  }

  .tabs {
    width: fit-content;
    min-height: 42px;
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 3px;
    border: 1px solid #e5dfd9;
    border-radius: 8px;
    background: #f4f2ef;
  }

  .tabs button {
    min-height: 34px;
    display: flex;
    align-items: center;
    gap: 7px;
    border: 0;
    border-radius: 6px;
    padding: 0 12px;
    color: #6f665f;
    background: transparent;
    cursor: pointer;
    font-size: 12px;
    font-weight: 800;
  }

  .tabs button > svg {
    width: 15px;
    height: 15px;
  }

  .tabs button > b {
    min-width: 19px;
    height: 19px;
    display: grid;
    place-items: center;
    padding: 0 5px;
    border-radius: 10px;
    color: #fff;
    background: var(--a);
    font-size: 9px;
  }

  .tabs button.active {
    color: var(--a);
    background: #fff;
    box-shadow: 0 1px 5px rgba(45, 22, 12, 0.08);
  }

  .panel {
    min-width: 0;
    border: 1px solid var(--courier-border);
    border-radius: 8px;
    padding: 20px;
    background: #fff;
  }

  .rules-layout,
  .settlement-layout {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1.12fr) minmax(310px, 0.88fr);
    align-items: start;
    gap: 16px;
  }

  .panel-header {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: start;
    gap: 11px;
    margin-bottom: 19px;
    padding-bottom: 16px;
    border-bottom: 1px solid #ece6e0;
  }

  .panel-header.compact {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .panel-header h3,
  .settlement-checkout h3,
  .history-header h3 {
    margin: 3px 0 0;
    font-size: 16px;
  }

  .panel-icon {
    width: 36px;
    height: 36px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 8%, #fff);
  }

  .panel-icon svg {
    width: 17px;
    height: 17px;
  }

  .rule-badge {
    padding: 5px 8px;
    border: 1px solid #d8e3df;
    border-radius: 6px;
    color: #347363;
    background: #f2f8f6;
    font-size: 9px;
    font-weight: 850;
    text-transform: uppercase;
  }

  .policy-editor {
    display: grid;
    gap: 17px;
  }

  .model-fieldset {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .model-fieldset legend,
  .field > label,
  .range-heading > span {
    margin-bottom: 7px;
    color: #4a433d;
    font-size: 11px;
    font-weight: 850;
  }

  .model-selector {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 7px;
  }

  .model-selector button {
    position: relative;
    min-width: 0;
    min-height: 72px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
    gap: 7px;
    padding: 10px;
    border: 1px solid #dfd8d1;
    border-radius: 7px;
    color: #574f48;
    background: #fff;
    text-align: left;
    cursor: pointer;
  }

  .model-selector button > svg {
    width: 16px;
    height: 16px;
    margin-top: 1px;
    color: #827870;
  }

  .model-selector button > span {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .model-selector b {
    font-size: 11px;
  }

  .model-selector small {
    color: #827970;
    font-size: 10px;
    line-height: 1.35;
  }

  .model-selector i {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 14px;
    height: 14px;
    color: var(--a);
  }

  .model-selector i svg {
    width: 14px;
    height: 14px;
  }

  .model-selector button.selected {
    border-color: var(--a);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 4%, #fff);
  }

  .model-selector button.selected > svg {
    color: var(--a);
  }

  .field-help {
    margin: 7px 0 0;
    color: #827a72;
    font-size: 10px;
    line-height: 1.45;
  }

  .policy-values {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .field {
    min-width: 0;
    display: grid;
    align-content: start;
  }

  label {
    cursor: inherit;
  }

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid #ddd3ca;
    border-radius: 7px;
    padding: 0 11px;
    color: #302923;
    background: #fff;
    outline: none;
  }

  input,
  select {
    height: 42px;
  }

  input:focus,
  select:focus,
  textarea:focus {
    border-color: #d65b35;
    box-shadow: 0 0 0 3px #d65b3514;
  }

  .money-input,
  .timezone-field > div {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    border: 1px solid #ddd3ca;
    border-radius: 7px;
    background: #fff;
  }

  .money-input:focus-within,
  .timezone-field > div:focus-within {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 8%, transparent);
  }

  .money-input > span,
  .timezone-field svg {
    margin-left: 11px;
    color: #81776f;
    font-size: 10px;
    font-weight: 800;
  }

  .timezone-field {
    margin-bottom: 17px;
  }

  .timezone-field input,
  .money-input input {
    border: 0;
    box-shadow: none;
  }

  .range-editor {
    grid-column: 1 / -1;
    display: grid;
    gap: 8px;
  }

  .range-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .range-heading small {
    color: #857c74;
    font-size: 9px;
  }

  .range {
    display: grid;
    grid-template-columns: auto 1fr 1fr auto;
    gap: 8px;
    align-items: end;
    padding: 9px;
    border: 1px solid #e6dfd8;
    border-radius: 7px;
    background: #faf9f7;
  }

  .range-number {
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    align-self: center;
    border-radius: 6px;
    color: var(--a);
    background: color-mix(in srgb, var(--a) 8%, #fff);
    font-size: 9px;
  }

  .panel-actions {
    min-height: 58px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin: 20px -20px -20px;
    padding: 10px 20px;
    border-top: 1px solid #ece6e0;
    background: #fcfbfa;
  }

  .panel-actions > span {
    margin-right: auto;
    color: #817970;
    font-size: 10px;
  }

  .primary,
  .secondary,
  .danger {
    min-height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border-radius: 7px;
    padding: 0 13px;
    cursor: pointer;
    font-size: 11px;
    font-weight: 800;
  }

  .primary svg,
  .secondary svg,
  .danger svg {
    width: 14px;
    height: 14px;
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

  button:focus-visible,
  .order:has(input:focus-visible) {
    outline: 2px solid var(--a);
    outline-offset: 2px;
  }
  .notice {
    border-radius: 7px;
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

  .courier-selector,
  .settlement-courier {
    margin-bottom: 15px;
  }

  .rule-state {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 16px;
    padding: 10px;
    border: 1px solid #e3ddd6;
    border-radius: 7px;
  }

  .rule-state > svg {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
  }

  .rule-state > span {
    display: grid;
    gap: 2px;
  }

  .rule-state b {
    font-size: 11px;
  }
  .rule-state small {
    color: #7d746c;
    font-size: 10px;
  }
  .rule-state.inherited {
    color: #786125;
    background: #fdf9ee;
    border-color: #e9ddbd;
  }
  .rule-state.custom {
    color: #2f7563;
    background: #f1f8f6;
    border-color: #cfe2dc;
  }

  .settlements-workspace {
    display: grid;
    gap: 16px;
  }

  .orders-toolbar {
    min-height: 34px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
    color: #7e756d;
    font-size: 10px;
  }

  .orders-toolbar button {
    border: 0;
    color: var(--a);
    background: transparent;
    font-size: 10px;
    font-weight: 850;
    cursor: pointer;
  }

  .orders {
    display: grid;
    gap: 7px;
    max-height: 430px;
    overflow: auto;
    overscroll-behavior: contain;
  }
  .order {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    min-height: 72px;
    border: 1px solid #e7e0d9;
    border-radius: 7px;
    padding: 10px;
    background: #fff;
    cursor: pointer;
  }

  .order.selected {
    border-color: var(--a);
    background: color-mix(in srgb, var(--a) 3%, #fff);
  }

  .order > input {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    opacity: 0;
    pointer-events: none;
  }

  .order-check {
    width: 22px;
    height: 22px;
    display: grid;
    place-items: center;
    border: 1px solid #cfc6be;
    border-radius: 6px;
    color: #fff;
    background: #fff;
    font-style: normal;
  }

  .order.selected .order-check {
    border-color: var(--a);
    background: var(--a);
  }

  .order-check svg {
    width: 14px;
    height: 14px;
  }

  .order-copy {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .order-copy b {
    font-size: 12px;
  }
  .order-copy small {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #827970;
    font-size: 10px;
  }
  .order-copy small svg {
    width: 10px;
    height: 10px;
  }

  .order-values {
    display: grid;
    justify-items: end;
    gap: 2px;
  }

  .order-values small {
    color: #827970;
    font-size: 9px;
  }
  .order-values strong {
    font-size: 12px;
  }
  .order-values em {
    color: #a44b3e;
    font-size: 9px;
    font-style: normal;
  }

  .settlement-checkout {
    position: sticky;
    top: 18px;
  }

  .settlement-checkout > header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 15px;
  }

  .settlement-checkout > header > svg {
    width: 22px;
    color: var(--a);
  }

  .financial-summary {
    display: grid;
    border-top: 1px solid #e8e1db;
    border-bottom: 1px solid #e8e1db;
  }

  .financial-summary > div {
    min-height: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    font-size: 11px;
  }

  .financial-summary > div + div {
    border-top: 1px solid #eee9e4;
  }
  .financial-summary span {
    color: #756d65;
  }
  .financial-summary strong {
    font-size: 12px;
  }
  .financial-summary .negative {
    color: #a1483b;
  }
  .financial-summary .balance {
    min-height: 52px;
  }
  .financial-summary .balance strong {
    color: var(--a);
    font-size: 17px;
  }

  .balance-direction {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 12px;
    padding: 9px 10px;
    border-radius: 7px;
  }

  .balance-direction > svg {
    width: 17px;
    height: 17px;
  }
  .balance-direction > span {
    display: grid;
    gap: 2px;
  }
  .balance-direction b {
    font-size: 10px;
  }
  .balance-direction small {
    font-size: 11px;
    font-weight: 850;
  }
  .balance-direction.pay {
    color: #2d725f;
    background: #eff8f5;
  }
  .balance-direction.return {
    color: #9b4539;
    background: #fff3f1;
  }

  .settlement-fields {
    display: grid;
    gap: 12px;
    margin: 16px 0;
  }

  .settlement-checkout > .primary {
    width: 100%;
  }

  .confirmation-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    margin: 8px 0 0;
    color: #81786f;
    font-size: 9px;
  }

  .confirmation-note svg {
    width: 11px;
    height: 11px;
  }

  .empty-state {
    min-height: 150px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 5px;
    color: #7e756d;
    text-align: center;
  }

  .empty-state.compact {
    min-height: 105px;
  }
  .empty-state > svg {
    width: 24px;
    height: 24px;
    color: #4d8b7a;
  }
  .empty-state b {
    color: #49423c;
    font-size: 12px;
  }
  .empty-state span {
    font-size: 10px;
  }

  .history-panel {
    padding: 0;
    overflow: hidden;
  }

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 17px 20px;
    border-bottom: 1px solid #e8e1db;
  }

  .history-header > span {
    color: #81786f;
    font-size: 9px;
  }

  .settlements {
    display: grid;
  }

  .settlement {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto auto;
    gap: 14px;
    align-items: center;
    min-height: 68px;
    padding: 10px 20px;
  }

  .settlement + .settlement {
    border-top: 1px solid #eee8e2;
  }

  .settlement-courier {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .avatar {
    width: 31px;
    height: 31px;
    flex: 0 0 31px;
    display: grid;
    place-items: center;
    border-radius: 7px;
    color: #397666;
    background: #edf7f4;
  }

  .avatar svg {
    width: 15px;
    height: 15px;
  }
  .settlement-courier > span:last-child {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .settlement-courier b {
    overflow: hidden;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .settlement-courier small,
  .settlement-total small {
    color: #81786f;
    font-size: 9px;
  }
  .settlement-total {
    display: grid;
    justify-items: end;
    gap: 2px;
  }
  .settlement-total strong {
    font-size: 12px;
  }

  .status {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    min-height: 24px;
    border-radius: 6px;
    padding: 0 8px;
    font-size: 9px;
    font-weight: 850;
  }

  .status.warning {
    color: #816224;
    background: #faf4e5;
  }
  .status.success {
    color: #2d725f;
    background: #edf8f5;
  }
  .status.danger {
    color: #a44336;
    background: #fff1ef;
  }
  .status.neutral {
    color: #6e6862;
    background: #f1efed;
  }

  @container courier-compensation (max-width: 820px) {
    .rules-layout,
    .settlement-layout {
      grid-template-columns: 1fr;
    }

    .settlement-checkout {
      position: static;
    }
  }

  @container courier-compensation (max-width: 560px) {
    .overview-strip {
      grid-template-columns: 1fr;
    }

    .overview-strip > div + div {
      border-top: 1px solid var(--courier-border);
      border-left: 0;
    }

    .tabs {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .tabs button {
      justify-content: center;
      padding: 0 8px;
    }
    .model-selector,
    .policy-values {
      grid-template-columns: 1fr;
    }

    .range {
      grid-template-columns: auto 1fr;
    }

    .range .field,
    .range button {
      grid-column: 1 / -1;
    }

    .panel-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .panel-actions > span {
      margin-right: 0;
    }
    .panel-actions button {
      width: 100%;
    }

    .settlement {
      grid-template-columns: 1fr;
    }

    .settlement-total {
      justify-items: start;
    }
    .settlement .status {
      justify-self: start;
    }
    .settlement .danger {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &[aria-busy='true'] .refresh-button svg {
      animation: none;
    }
  }
`;
