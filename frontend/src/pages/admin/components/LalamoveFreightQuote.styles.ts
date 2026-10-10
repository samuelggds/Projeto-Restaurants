import styled from 'styled-components';

export const QuoteSection = styled.section`
  && {
    min-width: 0;
    margin-top: 16px;
    overflow: hidden;
    border: 1px solid #e7ded5;
    border-radius: 12px;
    background: #fffdfb;
    box-shadow: 0 5px 18px rgba(44, 32, 22, 0.035);
  }
  && button {
    font: inherit;
    cursor: pointer;
    transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
  }
  && button:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a, #cb5d35) 32%, transparent);
    outline-offset: 3px;
  }
  && button:disabled {
    cursor: not-allowed;
    opacity: .55;
    transform: none;
  }
  && .quote-toggle {
    width: 100%;
    min-height: 64px;
    padding: 12px 15px;
    border: 0;
    border-radius: 0;
    color: #302822;
    background: #fcfaf7;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    text-align: left;
  }
  && .quote-toggle:hover:not(:disabled),
  && .quote-toggle[aria-expanded='true'] { background: #fff4ec; }
  && .toggle-leading,
  && .toggle-trailing {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 11px;
  }
  && .toggle-leading { flex: 1 1 auto; }
  && .toggle-trailing { flex: 0 0 auto; gap: 10px; }
  && .toggle-icon {
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    border-radius: 11px;
    color: #c3572f;
    background: #ffebe0;
    display: grid;
    place-items: center;
  }
  && .toggle-icon svg { width: 21px; height: 21px; }
  && .toggle-copy { min-width: 0; display: grid; gap: 4px; }
  && .toggle-copy strong {
    font-size: 13px;
    font-weight: 800;
    line-height: 1.25;
    letter-spacing: -0.01em;
  }
  && .toggle-copy small {
    color: #82766e;
    font-size: 11px;
    line-height: 1.35;
  }
  && .sandbox-badge {
    padding: 6px 9px;
    border: 1px solid #ecded0;
    border-radius: 7px;
    color: #8e582c;
    background: #fff7ed;
    font-size: 10px;
    font-weight: 800;
  }
  && .chevron {
    width: 17px;
    height: 17px;
    color: #97897f;
    transition: transform 160ms ease;
  }
  && .quote-toggle[aria-expanded='true'] .chevron { transform: rotate(180deg); }
  && .quote-panel {
    min-width: 0;
    padding: 16px;
    border-top: 1px solid #eee5dd;
    display: grid;
    gap: 14px;
  }
  && .quote-overview {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }
  && .quote-overview strong {
    display: block;
    color: #302823;
    font-size: 13px;
    font-weight: 800;
    line-height: 1.4;
  }
  && .quote-overview p {
    margin: 5px 0 0;
    color: #80766e;
    font-size: 11px;
    line-height: 1.5;
  }
  && .thermal-pill {
    flex: 0 0 auto;
    min-height: 30px;
    padding: 5px 9px;
    border: 1px solid #dceade;
    border-radius: 7px;
    color: #2d754f;
    background: #f0f9f2;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 750;
    white-space: nowrap;
  }
  && .thermal-pill svg { width: 14px; height: 14px; }
  && .quote-result {
    padding: 14px 16px;
    border: 1px solid #eee4da;
    border-radius: 10px;
    background: linear-gradient(120deg, #fffdfa, #faf7f2);
    display: grid;
    gap: 12px;
  }
  && .quote-result--ready {
    border-color: #d7e9dd;
    background: linear-gradient(110deg, #f7fcf8, #fffdfa);
  }
  && .quote-result--approved {
    border-color: #cee4d5;
    background: #f4fbf6;
  }
  && .result-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  && .result-heading > small { color: #8c8076; font-size: 10px; font-weight: 700; }
  && .status-badge {
    min-height: 25px;
    padding: 4px 9px;
    border-radius: 999px;
    color: #786852;
    background: #f1e9dc;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10px;
    font-weight: 800;
  }
  && .status-badge svg { width: 13px; height: 13px; }
  && .quote-result--ready .status-badge,
  && .quote-result--approved .status-badge {
    color: #28754b;
    background: #ddf1e3;
  }
  && .price-grid {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }
  && .price-value { min-width: 0; display: grid; gap: 2px; }
  && .price-value span { color: #7b7066; font-size: 10px; font-weight: 750; }
  && .price-value strong {
    color: #29221c;
    font-size: clamp(22px, 2.7vw, 29px);
    font-weight: 850;
    line-height: 1.14;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
  }
  && .price-meta {
    min-width: 0;
    display: grid;
    justify-items: end;
    gap: 6px;
    color: #71685e;
    font-size: 11px;
    text-align: right;
  }
  && .price-meta span { display: inline-flex; align-items: center; gap: 5px; }
  && .price-meta svg { width: 13px; height: 13px; }
  && .quote-status-copy {
    margin: 0;
    color: #6f655d;
    font-size: 11px;
    line-height: 1.5;
  }
  && .quote-alert {
    min-width: 0;
    padding: 12px;
    border: 1px solid #f2d7cc;
    border-radius: 10px;
    color: #923e2e;
    background: #fff5ef;
    display: flex;
    align-items: flex-start;
    gap: 9px;
  }
  && .quote-alert--success {
    border-color: #d6e9da;
    color: #28734b;
    background: #f1faf3;
  }
  && .quote-alert > svg { flex: 0 0 auto; width: 17px; height: 17px; margin-top: 1px; }
  && .quote-alert strong { display: block; font-size: 11px; font-weight: 800; line-height: 1.4; }
  && .quote-alert p { margin: 3px 0 0; font-size: 11px; line-height: 1.55; overflow-wrap: anywhere; }
  && .quote-loading {
    padding: 11px 12px;
    border: 1px solid #e7e2dc;
    border-radius: 9px;
    color: #70675e;
    background: #faf9f7;
    display: flex;
    align-items: center;
    gap: 9px;
    font-size: 11px;
  }
  && .quote-loading svg,
  && .quote-action-loading { animation: lalamove-quote-spin 900ms linear infinite; }
  && .quote-loading svg { width: 17px; height: 17px; }
  && .quote-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
  && .quote-actions .quote-action {
    width: auto;
    min-height: 42px;
    padding: 0 16px;
    border: 1px solid transparent;
    border-radius: 9px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 800;
    text-align: center;
  }
  && .quote-action svg { width: 15px; height: 15px; }
  && .quote-action--primary {
    color: #fff;
    background: var(--a, #ca5737);
    box-shadow: 0 5px 12px rgba(156, 67, 32, 0.12);
  }
  && .quote-action--primary:hover:not(:disabled) { background: #ab492c; }
  && .quote-action--approve { border-color: #bcdcc6; color: #24734a; background: #ecf8ef; }
  && .quote-action--approve:hover:not(:disabled) { border-color: #87c29c; background: #def3e5; }
  && .quote-disclaimer {
    padding-top: 12px;
    border-top: 1px solid #eee9e3;
    color: #877b72;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 10px;
    line-height: 1.55;
  }
  && .quote-disclaimer svg { flex: 0 0 auto; width: 14px; height: 14px; margin-top: 1px; }
  @keyframes lalamove-quote-spin { to { transform: rotate(360deg); } }
  @media (max-width: 640px) {
    && .quote-toggle { min-height: 62px; padding: 11px; }
    && .quote-panel { padding: 13px; }
    && .quote-overview { align-items: flex-start; flex-direction: column; gap: 10px; }
    && .thermal-pill { align-self: flex-start; }
  }
  @media (max-width: 480px) {
    && .toggle-copy strong { font-size: 12px; }
    && .toggle-copy small { font-size: 10px; }
    && .toggle-icon { flex-basis: 36px; width: 36px; height: 36px; }
    && .sandbox-badge { padding: 5px 7px; font-size: 9px; }
    && .toggle-trailing { gap: 5px; }
    && .quote-actions { display: grid; grid-template-columns: minmax(0, 1fr); }
    && .quote-actions .quote-action { width: 100%; }
    && .price-grid { align-items: flex-start; flex-direction: column; gap: 11px; }
    && .price-meta { justify-items: start; text-align: left; }
  }
  @media (prefers-reduced-motion: reduce) {
    &&, && button, && .chevron { transition: none; }
    && .quote-loading svg, && .quote-action-loading { animation: none; }
  }
`;
