import styled from 'styled-components';

import { employeeCompensationBaseStyles } from './EmployeeCompensationSettings.base.styles';
import { employeeCompensationResponsiveStyles } from './EmployeeCompensationSettings.responsive.styles';

export const Root = styled.section`
  ${employeeCompensationBaseStyles}

  .overview-strip > div + div {
    border-left: 1px solid var(--border);
  }

  .overview-strip > div > span:last-child {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .overview-strip b {
    overflow: hidden;
    font-size: 18px;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .overview-strip small {
    overflow: hidden;
    color: var(--muted);
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .metric-icon,
  .dialog-icon {
    display: grid;
    place-items: center;
    border-radius: 7px;
  }

  .metric-icon {
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
  }

  .metric-icon svg {
    width: 17px;
    height: 17px;
  }

  .metric-icon.people {
    color: #2c7564;
    background: #edf7f4;
  }

  .metric-icon.policies {
    color: #745f28;
    background: #faf5e8;
  }

  .metric-icon.ledger {
    color: #376b83;
    background: #edf5f8;
  }

  .metric-icon.settlements {
    color: #a14632;
    background: #fff0ec;
  }

  .tabs {
    width: fit-content;
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 3px;
    border: 1px solid #e5dfd9;
    border-radius: 8px;
    background: #f3f1ee;
  }

  .tabs button {
    min-height: 36px;
    display: flex;
    align-items: center;
    gap: 7px;
    border: 0;
    border-radius: 6px;
    padding: 0 13px;
    color: #6d655f;
    background: transparent;
    cursor: pointer;
    font-size: 12px;
    font-weight: 800;
  }

  .tabs button svg {
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
    background: var(--accent);
    font-size: 9px;
  }

  .tabs button.active {
    color: var(--accent);
    background: #fff;
    box-shadow: 0 1px 5px #2d160c14;
  }

  .notice {
    justify-content: space-between;
    gap: 14px;
    border: 1px solid;
    border-radius: 8px;
    padding: 10px 13px;
    font-size: 12px;
    font-weight: 700;
  }

  .notice.success {
    border-color: #bcd9c7;
    color: #286c43;
    background: #f1faf4;
  }

  .notice.error {
    border-color: #e5bdb7;
    color: #963c32;
    background: #fff3f1;
  }

  .notice button {
    width: 26px;
    height: 26px;
    display: grid;
    place-items: center;
    flex: 0 0 26px;
    border: 0;
    color: inherit;
    background: transparent;
    cursor: pointer;
  }

  .notice button svg {
    width: 14px;
  }

  .panel {
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
  }

  .panel-heading {
    justify-content: space-between;
    gap: 20px;
    min-height: 82px;
    padding: 17px 21px;
    border-bottom: 1px solid #ece7e2;
  }

  .panel-heading h3 {
    margin: 3px 0 0;
    font-size: 17px;
    letter-spacing: 0;
  }

  .toolbar {
    gap: 10px;
    padding: 12px 21px;
    border-bottom: 1px solid #ece7e2;
    background: #fcfbfa;
  }

  .search-field {
    min-width: 0;
    min-height: 42px;
    display: flex;
    align-items: center;
    flex: 1 1 340px;
    gap: 9px;
    border: 1px solid #ddd7d1;
    border-radius: 7px;
    padding: 0 11px;
    background: #fff;
  }

  .search-field svg {
    width: 16px;
    flex: 0 0 16px;
    color: #89817a;
  }

  .search-field input {
    min-width: 0;
    width: 100%;
    border: 0;
    padding: 0;
    color: var(--ink);
    background: transparent;
    outline: 0;
    font-size: 12px;
  }

  .toolbar > select {
    min-width: 175px;
    height: 42px;
    border: 1px solid #ddd7d1;
    border-radius: 7px;
    padding: 0 10px;
    color: var(--ink);
    background: #fff;
    font-size: 11px;
  }

  .check-control {
    min-height: 42px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #655e58;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }

  .check-control input {
    accent-color: var(--accent);
  }

  .data-list {
    max-height: 660px;
    overflow: auto;
  }

  .list-head,
  .list-row {
    display: grid;
    align-items: center;
    gap: 14px;
  }

  .list-head {
    position: sticky;
    z-index: 2;
    top: 0;
    min-height: 37px;
    padding: 0 21px;
    color: #8a8179;
    background: #f8f6f4;
    font-size: 9px;
    font-weight: 850;
    text-transform: uppercase;
  }

  .list-row {
    position: relative;
    min-height: 82px;
    padding: 12px 21px;
    border-top: 1px solid #eee9e4;
  }

  .list-head + .list-row {
    border-top: 0;
  }

  .list-row.inactive {
    background: #faf9f8;
    opacity: 0.72;
  }

  .policy-grid {
    grid-template-columns:
      minmax(210px, 1.2fr) minmax(145px, 0.78fr) minmax(155px, 0.85fr) minmax(105px, 0.55fr)
      minmax(180px, auto);
  }

  .hours-grid {
    grid-template-columns:
      minmax(210px, 1.2fr) minmax(110px, 0.65fr) minmax(110px, 0.6fr) minmax(130px, 0.7fr)
      minmax(95px, auto);
  }

  .settlement-grid {
    grid-template-columns:
      minmax(200px, 1.15fr) minmax(150px, 0.8fr) minmax(125px, 0.65fr) minmax(125px, 0.65fr)
      minmax(170px, auto);
  }

  .ledger-grid {
    grid-template-columns:
      minmax(185px, 1fr) minmax(150px, 0.8fr) minmax(155px, 0.85fr) minmax(105px, 0.55fr)
      minmax(125px, 0.65fr);
  }

  .person {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .person > span:last-child {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .person b,
  .cell b {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .person small,
  .cell small,
  .cell > span:not(.status-pill) {
    overflow: hidden;
    color: var(--muted);
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .avatar {
    width: 39px;
    height: 39px;
    display: grid;
    place-items: center;
    flex: 0 0 39px;
    border: 1px solid #e2d2ca;
    border-radius: 50%;
    color: #94462f;
    background: #fff3ee;
    font-size: 11px;
    font-weight: 900;
  }

  .avatar.small {
    width: 34px;
    height: 34px;
    flex-basis: 34px;
    font-size: 10px;
  }

  .cell {
    min-width: 0;
    display: grid;
    align-content: center;
    gap: 4px;
  }

  .status-pill {
    width: fit-content;
    max-width: 100%;
    border-radius: 5px;
    padding: 4px 7px;
    font-size: 8px;
    font-style: normal;
    font-weight: 900;
    line-height: 1.2;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .status-pill.success {
    color: #267044;
    background: #eaf7ef;
  }

  .status-pill.warning {
    color: #826220;
    background: #faf3dd;
  }

  .status-pill.info {
    color: #316a83;
    background: #eaf4f8;
  }

  .status-pill.neutral {
    color: #716a64;
    background: #efedeb;
  }

  .row-actions {
    justify-content: flex-end;
    gap: 6px;
  }

  .row-actions .primary-button {
    min-width: 105px;
  }

  .no-action {
    color: #aaa29b;
  }

  .version-history {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 0;
    margin: 1px -21px -12px;
    border-top: 1px solid #eee9e4;
    background: #fbfaf8;
  }

  .version-history > span {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 3px 8px;
    padding: 10px 21px;
    border-right: 1px solid #eee9e4;
  }

  .version-history b {
    grid-row: 1 / span 2;
    color: var(--accent);
    font-size: 10px;
  }

  .version-history small,
  .version-history em {
    overflow: hidden;
    color: #69615a;
    font-size: 9px;
    font-style: normal;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .version-history em {
    color: #90877f;
  }

  .ledger-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-bottom: 1px solid #ece7e2;
    background: #fbfaf8;
  }

  .ledger-summary > span {
    min-width: 0;
    display: grid;
    gap: 4px;
    padding: 12px 21px;
  }

  .ledger-summary > span + span {
    border-left: 1px solid #ece7e2;
  }

  .ledger-summary small {
    color: var(--muted);
    font-size: 9px;
    text-transform: uppercase;
  }

  .ledger-summary b {
    overflow: hidden;
    font-size: 16px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ledger-amount {
    min-width: 0;
    display: grid;
    justify-items: end;
    gap: 3px;
  }

  .ledger-amount small {
    color: var(--muted);
    font-size: 9px;
    text-transform: uppercase;
  }

  .ledger-amount b {
    font-size: 13px;
    white-space: nowrap;
  }

  .ledger-amount.credit b {
    color: #267044;
  }

  .ledger-amount.debit b {
    color: #a14035;
  }

  .empty-state,
  .loading-state,
  .error-state {
    min-height: 260px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 7px;
    padding: 28px;
    text-align: center;
  }

  .loading-state {
    min-height: 360px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fff;
  }

  .loading-state > svg,
  .empty-state > svg,
  .error-state > svg {
    width: 30px;
    height: 30px;
    color: var(--accent);
  }

  .loading-state > svg {
    animation: compensation-spin 850ms linear infinite;
  }

  .empty-state h4,
  .error-state h2 {
    margin: 4px 0 0;
    font-size: 16px;
  }

  .empty-state p,
  .error-state p {
    margin: 0 0 8px;
    color: var(--muted);
    font-size: 11px;
  }

  .dialog-backdrop {
    position: fixed;
    z-index: 1300;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 20px;
    background: #221b1775;
    backdrop-filter: blur(2px);
  }

  .dialog {
    width: min(100%, 590px);
    max-height: min(820px, calc(100vh - 40px));
    overflow: auto;
    border: 1px solid #d8d0c9;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 24px 70px #1d141033;
  }

  .dialog.wide {
    width: min(100%, 860px);
  }

  .dialog-header {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 11px;
    padding: 17px 20px;
    border-bottom: 1px solid #e9e4df;
  }

  .dialog-header > div {
    min-width: 0;
  }

  .dialog-header h3 {
    margin: 3px 0 0;
    font-size: 17px;
  }

  .dialog-header .icon-button {
    width: 38px;
    height: 38px;
    flex-basis: 38px;
  }

  .dialog-icon {
    width: 39px;
    height: 39px;
    color: var(--accent);
    background: #fff0eb;
  }

  .dialog-icon svg {
    width: 18px;
    height: 18px;
  }

  .dialog-body {
    padding: 18px 20px 20px;
  }

  .dialog-actions {
    position: sticky;
    z-index: 3;
    bottom: 0;
    justify-content: flex-end;
    gap: 8px;
    min-height: 64px;
    padding: 11px 20px;
    border-top: 1px solid #e9e4df;
    background: #faf9f8;
  }

  .form-grid,
  .policy-form {
    display: grid;
    gap: 14px;
  }

  .form-grid.two-columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .field {
    min-width: 0;
    display: grid;
    gap: 7px;
  }

  .field.full-width {
    grid-column: 1 / -1;
  }

  .field.compact-field {
    width: min(100%, 320px);
  }

  .field > span:first-child,
  .policy-form legend {
    color: #514a44;
    font-size: 10px;
    font-weight: 850;
  }

  .field > span small {
    color: #8c837b;
    font-size: 8px;
  }

  .field > input,
  .field > select,
  .field > textarea {
    width: 100%;
    min-width: 0;
    border: 1px solid #ddd6cf;
    border-radius: 7px;
    color: var(--ink);
    background: #fff;
    outline: 0;
    font-size: 12px;
  }

  .field > input,
  .field > select {
    min-height: 43px;
    padding: 0 10px;
  }

  .field > textarea {
    resize: vertical;
    padding: 10px;
    line-height: 1.45;
  }

  .field > input:focus,
  .field > select:focus,
  .field > textarea:focus,
  .money-input:focus-within {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px #b74d3114;
  }

  .money-input {
    min-width: 0;
    min-height: 43px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    overflow: hidden;
    border: 1px solid #ddd6cf;
    border-radius: 7px;
    background: #fff;
  }

  .money-input > b {
    align-self: stretch;
    display: grid;
    place-items: center;
    min-width: 42px;
    padding: 0 9px;
    border-right: 1px solid #e1dbd5;
    color: #70675f;
    background: #f7f5f3;
    font-size: 10px;
  }

  .money-input input {
    min-width: 0;
    width: 100%;
    border: 0;
    padding: 0 10px;
    outline: 0;
  }

  .policy-form fieldset {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .policy-form legend {
    margin-bottom: 7px;
  }

  .model-options {
    display: grid;
    gap: 7px;
  }

  .model-options.three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .model-options.variable {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .model-options button {
    min-width: 0;
    min-height: 58px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: 1px solid #dfd8d1;
    border-radius: 7px;
    padding: 8px;
    color: #5b534c;
    background: #fff;
    cursor: pointer;
    text-align: center;
    font-size: 10px;
  }

  .model-options button > span {
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    flex: 0 0 24px;
    border-radius: 6px;
    color: #7a7169;
    background: #f4f1ee;
  }

  .model-options button svg {
    width: 13px;
  }

  .model-options button.selected {
    border-color: var(--accent);
    color: var(--accent);
    background: #fff8f5;
    box-shadow: inset 0 0 0 1px var(--accent);
  }

  .rule-lock,
  .subject-line {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid #e3ddd7;
    border-radius: 7px;
    padding: 11px 12px;
    background: #f8f7f5;
  }

  .rule-lock > svg,
  .subject-line > svg {
    width: 18px;
    flex: 0 0 18px;
    color: #766b61;
  }

  .rule-lock > span,
  .subject-line > span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .rule-lock b,
  .subject-line b {
    font-size: 11px;
  }

  .rule-lock small,
  .subject-line small {
    color: var(--muted);
    font-size: 9px;
  }

  .subject-line {
    margin-bottom: 14px;
  }

  .payment-balance,
  .settlement-totals {
    display: grid;
    gap: 0;
    margin-bottom: 17px;
    overflow: hidden;
    border: 1px solid #dfd9d3;
    border-radius: 7px;
    background: #faf9f7;
  }

  .payment-balance {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .settlement-totals {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .payment-balance > span,
  .settlement-totals > span {
    min-width: 0;
    display: grid;
    align-content: center;
    gap: 4px;
    min-height: 68px;
    padding: 11px 13px;
  }

  .payment-balance > span + span,
  .settlement-totals > span + span {
    border-left: 1px solid #e5dfd9;
  }

  .payment-balance small,
  .settlement-totals small {
    color: var(--muted);
    font-size: 8px;
    text-transform: uppercase;
  }

  .payment-balance b,
  .settlement-totals b {
    overflow: hidden;
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail-columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0;
    border-top: 1px solid #ece6e0;
  }

  .detail-columns > section {
    min-width: 0;
    padding-top: 15px;
  }

  .detail-columns > section + section {
    margin-left: 18px;
    padding-left: 18px;
    border-left: 1px solid #ece6e0;
  }

  .detail-columns section > header {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 8px;
  }

  .detail-columns section > header > svg {
    width: 17px;
    color: var(--accent);
  }

  .detail-columns section > header > div {
    display: grid;
    gap: 1px;
  }

  .detail-columns section > header b {
    font-size: 11px;
  }

  .detail-columns section > header small {
    color: var(--muted);
    font-size: 8px;
  }

  .detail-list {
    display: grid;
  }

  .detail-list > span {
    min-width: 0;
    min-height: 52px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    border-top: 1px solid #eee9e4;
  }

  .detail-list.payments > span {
    grid-template-columns: auto minmax(0, 1fr) auto auto;
  }

  .detail-list > span > i {
    width: 25px;
    height: 25px;
    display: grid;
    place-items: center;
    border-radius: 6px;
    font-size: 9px;
    font-style: normal;
    font-weight: 900;
  }

  .detail-list > span > i.credit {
    color: #287048;
    background: #eaf7ef;
  }

  .detail-list > span > i.debit {
    color: #a14035;
    background: #fdecea;
  }

  .detail-list > span > i.method {
    color: #376b83;
    background: #edf5f8;
  }

  .detail-list > span > span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .detail-list > span > span b,
  .detail-list > span > strong {
    font-size: 10px;
  }

  .detail-list > span > span small {
    overflow: hidden;
    color: var(--muted);
    font-size: 8px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail-list > span > .icon-button {
    width: 30px;
    height: 30px;
    flex-basis: 30px;
  }

  .detail-list > span > em {
    color: #8a8179;
    font-size: 8px;
    font-style: normal;
    text-transform: uppercase;
  }

  .detail-list > span.reversed {
    opacity: 0.58;
  }

  .empty-line,
  .inline-loading {
    margin: 0;
    padding: 24px 0;
    color: var(--muted);
    font-size: 10px;
    text-align: center;
  }

  .inline-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .inline-loading svg {
    width: 16px;
  }

  ${employeeCompensationResponsiveStyles}
`;
