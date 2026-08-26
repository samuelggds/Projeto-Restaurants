import styled from 'styled-components';

export const Metrics = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 13px;
  margin-bottom: 17px;
  @media (max-width: 850px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;
export const Metric = styled.article`
  border: 1px solid var(--border);
  border-radius: 13px;
  background: #fff;
  padding: 18px;
  display: grid;
  gap: 7px;
  span,
  small {
    color: var(--muted);
    font-size: 11px;
  }
  b {
    font-size: 25px;
  }
  em {
    font-style: normal;
    color: #43853e;
    font-size: 10px;
  }
`;
export const AdminGrid = styled.div`
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 17px;
  @media (max-width: 850px) {
    grid-template-columns: 1fr;
  }
`;
export const DataList = styled.div`
  display: grid;
  .data-row {
    min-height: 66px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
  }
  .data-row img {
    width: 46px;
    height: 46px;
    border-radius: 9px;
    object-fit: cover;
  }
  .data-row div {
    display: grid;
    gap: 4px;
    min-width: 0;
  }
  .data-row span,
  .data-row small {
    font-size: 10px;
    color: var(--muted);
  }
  .data-row strong {
    margin-left: auto;
    white-space: nowrap;
  }
  .data-row > button {
    margin-left: auto;
    border: 1px solid var(--a);
    border-radius: 7px;
    background: #fff;
    color: var(--a);
    height: 34px;
    padding: 0 10px;
  }
  .category-actions {
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 9px;
    min-width: 200px;
  }
  .category-actions button {
    width: 92px;
    height: 34px;
    border: 1px solid var(--a);
    border-radius: 8px;
    background: #fff;
    color: var(--a);
    transition:
      background 160ms ease,
      color 160ms ease,
      transform 160ms ease;
  }
  .category-actions button:hover:not(:disabled) {
    background: #fff3ed;
    transform: translateY(-1px);
  }
  .category-actions .category-delete {
    border-color: #e7aaa3;
    color: #b23b32;
  }
  .category-actions .category-delete:hover:not(:disabled) {
    background: #fff1ef;
  }
  .category-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  @media (max-width: 560px) {
    .data-row {
      min-height: 62px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
    }
    .category-actions {
      width: auto;
      min-width: auto;
      margin-left: auto;
      gap: 6px;
    }
    .category-actions button {
      width: 74px;
      height: 32px;
      padding: 0 6px;
      border-radius: 9px;
      font-size: 11px;
    }
  }
`;
export const OverviewFilters = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px;
  gap: 9px;
  margin: 16px 0 5px;
  label {
    position: relative;
    display: block;
  }
  label svg {
    position: absolute;
    left: 11px;
    top: 50%;
    width: 16px;
    color: #887d75;
    transform: translateY(-50%);
    pointer-events: none;
  }
  input,
  select {
    width: 100%;
    height: 40px;
    border: 1px solid #e5ddd6;
    border-radius: 10px;
    outline: 0;
    background: #fcfbfa;
    color: #282522;
    font: inherit;
    font-size: 12px;
  }
  input {
    padding: 0 12px 0 36px;
  }
  select {
    padding: 0 9px;
  }
  input:focus,
  select:focus {
    border-color: var(--a);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--a) 12%, transparent);
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;
export const OverviewPagination = styled.div`
  min-height: 50px;
  padding-top: 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--muted);
  font-size: 11px;
  & > div {
    display: flex;
    gap: 7px;
  }
  button {
    height: 34px;
    padding: 0 10px;
    display: flex;
    align-items: center;
    gap: 4px;
    border: 1px solid #e1d8d0;
    border-radius: 9px;
    color: #b94715;
    background: #fff;
    font-size: 11px;
    font-weight: 650;
    transition: 0.16s ease;
  }
  button:hover:not(:disabled) {
    border-color: var(--a);
    background: #fff7f2;
    transform: translateY(-1px);
  }
  button:disabled {
    opacity: 0.38;
    cursor: not-allowed;
  }
  button svg {
    width: 14px;
  }
  @media (max-width: 480px) {
    align-items: flex-start;
    flex-direction: column;
    & > div {
      width: 100%;
    }
    button {
      flex: 1;
      justify-content: center;
    }
  }
`;
export const OverviewEmpty = styled.div`
  min-height: 92px;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 12px;
  border-bottom: 1px solid var(--border);
`;
export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 15px;
  input,
  select {
    height: 42px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fff;
    padding: 0 11px;
    outline: none;
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease;
  }
  input:focus,
  select:focus {
    border-color: var(--a);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 11%, transparent);
  }
  input {
    min-width: 0;
    flex: 1;
  }
  button {
    height: 42px;
    border: 0;
    border-radius: 8px;
    background: var(--a);
    color: #fff;
    padding: 0 14px;
  }
  @media (max-width: 520px) {
    display: grid;
    grid-template-columns: 1fr;
    input,
    select,
    button {
      width: 100%;
    }
  }
`;
export const OrdersWorkspace = styled.div`
  display: grid;
  gap: 18px;
`;
export const OrdersSummary = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;

  article {
    min-width: 0;
    min-height: 126px;
    border: 1px solid #e9e3dc;
    border-radius: 18px;
    background: linear-gradient(145deg, #fff 0%, #fcfaf7 100%);
    padding: 18px;
    display: flex;
    align-items: flex-start;
    gap: 13px;
    box-shadow: 0 7px 24px rgba(51, 35, 22, 0.04);
  }

  article > div {
    min-width: 0;
    display: grid;
  }

  .summary-icon {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    border-radius: 13px;
    display: grid;
    place-items: center;
  }

  .summary-icon svg {
    width: 19px;
  }

  .summary-icon.active {
    color: #a94716;
    background: #fff0e5;
  }

  .summary-icon.payment {
    color: #a16a0b;
    background: #fff6d9;
  }

  .summary-icon.progress {
    color: #2d648f;
    background: #eaf4fc;
  }

  .summary-icon.delivered {
    color: #297049;
    background: #e9f6ef;
  }

  small {
    overflow: hidden;
    color: #6e6862;
    font-size: 11px;
    font-weight: 750;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    margin-top: 5px;
    color: #1d1b19;
    font-size: 26px;
    line-height: 1;
    letter-spacing: -0.04em;
  }

  p {
    overflow: hidden;
    margin: 7px 0 0;
    color: #8a837c;
    font-size: 10px;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 980px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 500px) {
    gap: 8px;

    article {
      min-height: 104px;
      padding: 13px;
      gap: 10px;
    }

    .summary-icon {
      width: 36px;
      height: 36px;
      flex-basis: 36px;
      border-radius: 11px;
    }

    .summary-icon svg {
      width: 17px;
    }

    strong {
      font-size: 22px;
    }

    p {
      white-space: normal;
    }
  }

  @media (max-width: 370px) {
    grid-template-columns: 1fr;
  }
`;
export const OrdersPanel = styled.section`
  overflow: hidden;
  border: 1px solid #e6ded6;
  border-radius: 22px;
  background: #fff;
  padding: 25px;
  box-shadow: 0 14px 42px rgba(51, 35, 22, 0.065);

  @media (max-width: 580px) {
    border-radius: 18px;
    padding: 16px 13px;
  }
`;

export const OrdersPanelHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 21px;
  border-bottom: 1px solid #eee8e1;

  > div > small {
    color: var(--a);
    font-size: 9px;
    font-weight: 850;
    letter-spacing: 0.11em;
  }

  h2 {
    margin: 6px 0 0;
    color: #1e1b18;
    font-size: 20px;
    letter-spacing: -0.025em;
  }

  p {
    margin: 5px 0 0;
    color: #766f68;
    font-size: 12px;
    line-height: 1.45;
  }

  .live-status {
    min-height: 36px;
    flex: 0 0 auto;
    border: 1px solid #d9eddf;
    border-radius: 999px;
    background: #f1faf4;
    color: #2c7447;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 10px;
    font-weight: 750;
    white-space: nowrap;
  }

  .live-status svg {
    color: #3d9860;
  }

  @media (max-width: 650px) {
    align-items: stretch;
    flex-direction: column;
    gap: 13px;

    .live-status {
      align-self: flex-start;
    }
  }
`;

export const OrdersToolbar = styled.div`
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 210px auto;
  align-items: end;
  gap: 12px;
  padding: 20px 0;

  .search-field,
  .status-filter {
    min-width: 0;
    display: grid;
    gap: 7px;
  }

  .search-field > span,
  .status-filter > span {
    color: #5f5953;
    font-size: 10px;
    font-weight: 800;
  }

  .search-field > div,
  .status-filter > div {
    height: 46px;
    border: 1px solid #ded7d0;
    border-radius: 12px;
    background: #fbfaf8;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 13px;
    color: #817a73;
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      background 180ms ease;
  }

  .search-field > div:focus-within,
  .status-filter > div:focus-within {
    border-color: color-mix(in srgb, var(--a) 70%, #fff);
    background: #fff;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 10%, transparent);
  }

  input,
  select {
    min-width: 0;
    width: 100%;
    height: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: #292521;
    font: inherit;
    font-size: 12px;
  }

  input::placeholder {
    color: #98918a;
  }

  select {
    appearance: none;
    cursor: pointer;
  }

  .status-filter svg {
    flex: 0 0 auto;
    pointer-events: none;
  }

  .results-count {
    min-height: 46px;
    border-radius: 12px;
    background: #f6f3ef;
    color: #6f6861;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 750;
    text-align: center;
    white-space: nowrap;
  }

  @media (max-width: 780px) {
    grid-template-columns: minmax(0, 1fr) 190px;

    .results-count {
      min-height: auto;
      grid-column: 1 / -1;
      justify-self: start;
      padding: 7px 10px;
    }
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
    padding: 16px 0;

    .results-count {
      grid-column: auto;
    }
  }
`;

export const OrdersList = styled.div`
  display: grid;
  gap: 12px;

  .order-card {
    min-width: 0;
    overflow: hidden;
    border: 1px solid #e6dfd7;
    border-radius: 17px;
    background: #fff;
    padding: 17px;
    box-shadow: 0 5px 18px rgba(49, 34, 22, 0.035);
    transition:
      border-color 180ms ease,
      box-shadow 180ms ease,
      transform 180ms ease;
  }

  .order-card:hover {
    border-color: #d8cec4;
    box-shadow: 0 10px 28px rgba(49, 34, 22, 0.07);
    transform: translateY(-1px);
  }

  .order-header {
    min-width: 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .order-identity {
    min-width: 0;
    display: grid;
    gap: 8px;
  }

  .order-identity > div {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .order-number {
    flex: 0 0 auto;
    border: 1px solid color-mix(in srgb, var(--a) 22%, #e3ddd6);
    border-radius: 8px;
    background: color-mix(in srgb, var(--a) 6%, #fff);
    color: var(--a);
    padding: 5px 8px;
    font-size: 11px;
    font-weight: 850;
  }

  h3 {
    overflow: hidden;
    margin: 0;
    color: #201d1a;
    font-size: 15px;
    letter-spacing: -0.015em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .order-created {
    color: #7d766f;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
  }

  .order-created svg {
    width: 13px;
    height: 13px;
  }

  .order-status {
    min-height: 30px;
    flex: 0 0 auto;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0 11px;
    background: #f3f1ed;
    color: #6b645a;
    font-size: 9px;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }

  .order-status i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }

  .status-pendente {
    background: #fff5e8;
    color: #a85d12;
  }

  .status-preparando {
    background: #fff0e6;
    color: #b84a1b;
  }

  .status-pronto {
    background: #edf8ec;
    color: #347a41;
  }

  .status-saiu_para_entrega {
    background: #eaf4ff;
    color: #286da8;
  }

  .status-entregue {
    background: #e9f7ef;
    color: #217644;
  }

  .status-cancelado {
    background: #f8eceb;
    color: #a9433c;
  }

  .order-details {
    min-width: 0;
    margin-top: 15px;
    border: 1px solid #eee8e1;
    border-radius: 13px;
    background: #fbfaf8;
    padding: 13px;
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr) auto;
    align-items: center;
    gap: 16px;
  }

  .detail {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .detail-icon {
    width: 35px;
    height: 35px;
    flex: 0 0 35px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: #2d7650;
    background: #e8f6ee;
  }

  .detail-icon svg {
    width: 17px;
  }

  .tone-warning .detail-icon {
    color: #9a640b;
    background: #fff3d5;
  }

  .tone-neutral .detail-icon {
    color: #5b6470;
    background: #edf0f3;
  }

  .detail-icon.neutral {
    color: #5b6470;
    background: #edf0f3;
  }

  .detail > div,
  .order-total {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .detail > div > span,
  .order-total > span {
    color: #8a837c;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .detail b {
    overflow: hidden;
    color: #2a2723;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail small {
    overflow: hidden;
    color: #777069;
    font-size: 9px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .order-total {
    min-width: 115px;
    padding-left: 16px;
    border-left: 1px solid #e6dfd8;
    text-align: right;
  }

  .order-total strong {
    color: #1e1b18;
    font-size: 17px;
    letter-spacing: -0.025em;
    white-space: nowrap;
  }

  .order-progress {
    margin-top: 14px;
    display: grid;
    grid-template-columns: 155px minmax(150px, 1fr);
    align-items: center;
    gap: 14px;
  }

  .order-progress > div:first-child {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .order-progress span {
    color: #89827b;
    font-size: 9px;
  }

  .order-progress b {
    overflow: hidden;
    color: #37322e;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .progress-track {
    min-width: 0;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 5px;
  }

  .progress-track i {
    height: 5px;
    border-radius: 999px;
    background: #e7e2dc;
    transition: background 180ms ease;
  }

  .progress-track i[data-active='true'] {
    background: color-mix(in srgb, var(--a) 82%, #d7864f);
  }

  .progress-track.cancelled i {
    background: #f2d7d4;
  }

  .order-actions {
    min-width: 0;
    margin-top: 15px;
    padding-top: 14px;
    border-top: 1px solid #eee8e1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .operation-note {
    min-width: 0;
    color: #777069;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    font-size: 9px;
    font-weight: 650;
    line-height: 1.4;
  }

  .operation-note svg {
    width: 14px;
    height: 14px;
    flex: 0 0 auto;
  }

  .refund-note {
    color: #28724a;
  }

  .manual-note {
    color: #95610e;
  }

  .processing-note {
    color: #2d648f;
  }

  .failed-note {
    color: #a43c35;
  }

  .finished-note {
    color: #777069;
  }

  .action-buttons {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  button {
    min-height: 37px;
    border-radius: 10px;
    padding: 0 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    font: inherit;
    font-size: 10px;
    font-weight: 750;
    cursor: pointer;
    transition:
      background 160ms ease,
      border-color 160ms ease,
      color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms ease;
  }

  button svg {
    width: 14px;
    height: 14px;
  }

  button:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  button:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a) 22%, transparent);
    outline-offset: 2px;
  }

  .confirm-payment {
    border: 1px solid color-mix(in srgb, var(--a) 38%, #e0d9d2);
    background: color-mix(in srgb, var(--a) 7%, #fff);
    color: var(--a);
  }

  .confirm-payment:hover:not(:disabled) {
    border-color: var(--a);
    background: var(--a);
    color: #fff;
    box-shadow: 0 7px 16px color-mix(in srgb, var(--a) 20%, transparent);
  }

  .cancel-order {
    border: 1px solid #e8c6c2;
    background: #fff8f7;
    color: #a43c35;
  }

  .cancel-order:hover:not(:disabled) {
    border-color: #b8443c;
    background: #b8443c;
    color: #fff;
    box-shadow: 0 7px 16px rgba(184, 68, 60, 0.2);
  }

  button:disabled {
    opacity: 0.55;
    cursor: wait;
    transform: none;
  }

  .loading-icon {
    animation: admin-order-loading 700ms linear infinite;
  }

  @keyframes admin-order-loading {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 800px) {
    .order-details {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .order-total {
      grid-column: 1 / -1;
      min-width: 0;
      padding: 10px 0 0;
      border-top: 1px solid #e6dfd8;
      border-left: 0;
      text-align: left;
    }

    .order-actions {
      align-items: flex-start;
      flex-direction: column;
    }

    .action-buttons {
      width: 100%;
      justify-content: flex-start;
    }
  }

  @media (max-width: 540px) {
    .order-card {
      padding: 14px 12px;
    }

    .order-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .order-status {
      align-self: flex-start;
    }

    .order-details {
      grid-template-columns: 1fr;
      gap: 13px;
    }

    .order-total {
      grid-column: auto;
    }

    .order-progress {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .action-buttons {
      display: grid;
      grid-template-columns: 1fr;
    }

    button {
      width: 100%;
    }
  }
`;

export const OrdersEmpty = styled.div`
  min-height: 270px;
  border: 1px dashed #dcd3ca;
  border-radius: 17px;
  background: #fbfaf8;
  padding: 30px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;

  > svg {
    width: 32px;
    height: 32px;
    color: #aaa098;
  }

  h3 {
    margin: 12px 0 0;
    color: #312d29;
    font-size: 15px;
  }

  p {
    max-width: 380px;
    margin: 6px 0 0;
    color: #7d756e;
    font-size: 11px;
    line-height: 1.5;
  }

  button {
    min-height: 38px;
    margin-top: 16px;
    border: 1px solid #ded6ce;
    border-radius: 10px;
    background: #fff;
    color: var(--a);
    padding: 0 14px;
    font: inherit;
    font-size: 11px;
    font-weight: 750;
  }
`;

export const OrdersPagination = styled.footer`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-top: 20px;
  color: #817a73;
  font-size: 10px;

  > div {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  b {
    color: #403b36;
    font-size: 10px;
    white-space: nowrap;
  }

  button {
    min-height: 37px;
    border: 1px solid #dfd8d1;
    border-radius: 10px;
    background: #fff;
    color: #48423d;
    padding: 0 11px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font: inherit;
    font-size: 10px;
    font-weight: 750;
    cursor: pointer;
    transition:
      border-color 160ms ease,
      color 160ms ease,
      background 160ms ease;
  }

  button:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--a) 45%, #d8d0c8);
    color: var(--a);
    background: color-mix(in srgb, var(--a) 5%, #fff);
  }

  button:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a) 20%, transparent);
    outline-offset: 2px;
  }

  button:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }

  @media (max-width: 620px) {
    align-items: stretch;
    flex-direction: column;

    > div {
      justify-content: space-between;
    }
  }

  @media (max-width: 430px) {
    > div {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    b {
      grid-column: 1 / -1;
      grid-row: 1;
      text-align: center;
    }

    button {
      justify-content: center;
    }
  }
`;
