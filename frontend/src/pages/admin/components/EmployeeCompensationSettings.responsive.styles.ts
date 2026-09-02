import { css } from 'styled-components';

export const employeeCompensationResponsiveStyles = css`
  @container employee-compensation (max-width: 920px) {
    .overview-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .overview-strip > div:nth-child(3) {
      border-left: 0;
    }

    .overview-strip > div:nth-child(n + 3) {
      border-top: 1px solid var(--border);
    }

    .list-head {
      display: none;
    }

    .list-row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 13px;
      padding: 15px 18px;
    }

    .person {
      grid-column: 1 / -1;
      padding-bottom: 10px;
      border-bottom: 1px solid #eee9e4;
    }

    .row-actions {
      grid-column: 1 / -1;
      padding-top: 10px;
      border-top: 1px solid #eee9e4;
    }

    .version-history {
      margin: 0 -18px -15px;
    }

    .ledger-amount {
      justify-items: start;
    }
  }

  @container employee-compensation (max-width: 680px) {
    gap: 14px;

    .page-header,
    .panel-heading,
    .toolbar {
      align-items: stretch;
      flex-direction: column;
    }

    .header-controls,
    .month-control {
      width: 100%;
    }

    .month-control {
      min-width: 0;
      flex: 1;
    }

    .page-title h2 {
      font-size: 23px;
    }

    .overview-strip {
      grid-template-columns: 1fr;
    }

    .overview-strip > div + div,
    .overview-strip > div:nth-child(3) {
      border-left: 0;
      border-top: 1px solid var(--border);
    }

    .tabs {
      width: 100%;
      overflow-x: auto;
    }

    .tabs button {
      min-width: max-content;
      flex: 1;
      justify-content: center;
      padding: 0 10px;
    }

    .panel-heading {
      min-height: 0;
      padding: 16px;
    }

    .panel-heading > button {
      width: 100%;
    }

    .toolbar {
      padding: 11px 16px;
    }

    .toolbar > select {
      width: 100%;
    }

    .data-list {
      max-height: none;
      display: grid;
      gap: 10px;
      padding: 11px;
      background: var(--soft);
    }

    .list-row {
      grid-template-columns: 1fr;
      gap: 12px;
      padding: 14px;
      border: 1px solid var(--border) !important;
      border-radius: 7px;
      background: #fff;
    }

    .person,
    .row-actions {
      grid-column: auto;
    }

    .row-actions {
      justify-content: stretch;
    }

    .row-actions .primary-button {
      flex: 1;
    }

    .version-history {
      grid-column: auto;
      grid-template-columns: 1fr;
      margin: 0 -14px -14px;
    }

    .ledger-summary {
      grid-template-columns: 1fr;
    }

    .ledger-summary > span + span {
      border-left: 0;
      border-top: 1px solid #ece7e2;
    }

    .form-grid.two-columns,
    .model-options.three,
    .model-options.variable,
    .settlement-totals,
    .detail-columns {
      grid-template-columns: 1fr;
    }

    .field.full-width {
      grid-column: auto;
    }

    .detail-columns > section + section {
      margin: 15px 0 0;
      padding: 15px 0 0;
      border-top: 1px solid #ece6e0;
      border-left: 0;
    }

    .payment-balance > span,
    .settlement-totals > span {
      min-height: 58px;
    }

    .settlement-totals > span + span {
      border-top: 1px solid #e5dfd9;
      border-left: 0;
    }
  }

  @media (max-width: 560px) {
    .dialog-backdrop {
      place-items: end center;
      padding: 0;
    }

    .dialog,
    .dialog.wide {
      width: 100%;
      max-height: 94vh;
      border-width: 1px 0 0;
      border-radius: 8px 8px 0 0;
    }

    .dialog-header,
    .dialog-body,
    .dialog-actions {
      padding-left: 16px;
      padding-right: 16px;
    }

    .dialog-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dialog-actions > button:only-child {
      grid-column: 1 / -1;
    }
  }
`;
