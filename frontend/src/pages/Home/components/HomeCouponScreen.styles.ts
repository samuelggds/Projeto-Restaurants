import styled from 'styled-components';

/* Coupon-screen treatment from the supplied GastroNexa reference.
 * All typography, layout and colors are scoped to the fullscreen coupon view. */
export const CouponScreen = styled.section`
  --cp-bg: #f7f8fa;
  --cp-card: #fff;
  --cp-text: #192434;
  --cp-muted: #637087;
  --cp-border: #e5e8ec;
  --cp-red: #d92337;
  --cp-soft-red: #fff0f2;
  --cp-green: #277549;
  --cp-soft-green: #f1f8f3;
  --cp-green-border: #d6e8dd;
  position: fixed;
  inset: 0;
  z-index: 94;
  display: block;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--cp-bg);
  color: var(--cp-text);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 12px;
  line-height: 1.5;

  * { box-sizing: border-box; }
  button, input { font: inherit; }
  button { cursor: pointer; }
  button:disabled { cursor: not-allowed; opacity: .58; }
  button:focus-visible, input:focus-visible, summary:focus-visible {
    outline: 2px solid var(--cp-red);
    outline-offset: 3px;
  }
  p, h1, h2, h3 { margin: 0; }

  .cp-inner {
    width: min(720px, calc(100% - 36px));
    min-height: 100dvh;
    margin: 0 auto;
    padding: 20px 0 max(24px, env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
  }
  .cp-content { flex: 1 0 auto; min-width: 0; width: 100%; }
  .cp-top {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  }
  .cp-back {
    border: 0;
    background: transparent;
    padding: 7px 0;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--cp-red);
    font-size: 12px;
    font-weight: 500;
  }
  .cp-back svg { width: 16px; height: 16px; }
  .cp-heading { margin: 0 0 18px; }
  h1 {
    font-weight: 600;
    font-size: clamp(21px, 3vw, 25px);
    line-height: 1.18;
    letter-spacing: -.035em;
    color: var(--cp-text);
  }
  .cp-heading p { margin-top: 8px; color: var(--cp-muted); font-size: 12px; }
  .cp-manual { margin-bottom: 18px; }
  .cp-manual label { display: block; margin-bottom: 7px; color: var(--cp-text); font-size: 12px; }
  .cp-manual-row { display: flex; gap: 7px; min-width: 0; }
  .cp-manual input {
    flex: 1;
    min-width: 0;
    width: 100%;
    height: 46px;
    border: 1px solid var(--cp-border);
    border-radius: 9px;
    padding: 10px 11px;
    background: var(--cp-card);
    color: var(--cp-text);
    font-size: 16px;
  }
  .cp-manual input::placeholder { color: var(--cp-muted); }
  .cp-manual button {
    flex: 0 0 auto;
    min-height: 46px;
    border: 1px solid var(--cp-border);
    border-radius: 9px;
    background: transparent;
    padding: 0 12px;
    color: var(--cp-red);
    font-size: 12px;
    font-weight: 500;
  }
  .cp-list-label { margin: 0 0 9px; font-size: 11px; color: var(--cp-muted); }
  .cp-list { display: grid; gap: 11px; }
  .cp-ticket {
    min-width: 0;
    padding: 12px 12px 0;
    border: 1px solid var(--cp-border);
    border-radius: 12px;
    background: var(--cp-card);
  }
  .cp-ticket-main {
    min-width: 0;
    display: grid;
    align-items: center;
    grid-template-columns: 36px minmax(0, 1fr) 76px;
    gap: 9px;
    min-height: 51px;
    padding-bottom: 9px;
  }
  .cp-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: var(--cp-green);
    background: var(--cp-soft-green);
  }
  .cp-icon:not(.cp-shipping) { background: var(--cp-soft-red); color: var(--cp-red); }
  .cp-icon svg { width: 21px; height: 21px; stroke-width: 1.6; }
  .cp-ticket-copy { min-width: 0; }
  .cp-ticket-copy h2 {
    font-size: 15px;
    line-height: 1.25;
    font-weight: 600;
    letter-spacing: -.02em;
    color: var(--cp-text);
    overflow-wrap: anywhere;
  }
  .cp-ticket-copy p {
    margin-top: 4px;
    font-size: 11px;
    line-height: 1.4;
    color: var(--cp-muted);
    overflow-wrap: anywhere;
  }
  .cp-use {
    width: 76px;
    min-height: 44px;
    padding: 9px 7px;
    border: 1px solid var(--cp-red);
    border-radius: 8px;
    background: var(--cp-red);
    color: white;
    font-weight: 600;
    font-size: 12px;
  }
  .cp-use.is-selected { background: #ee919a; border-color: #ee919a; color: white; }
  .cp-ticket-footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0 9px;
    border-top: 1px solid var(--cp-border);
    min-width: 0;
  }
  .cp-code-row { display: flex; min-height: 44px; flex: 1; min-width: 0; align-items: center; gap: 3px; }
  .cp-code-row strong {
    color: var(--cp-text);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-weight: 500;
    font-size: 12px;
    line-height: 1.2;
    letter-spacing: .02em;
    overflow-wrap: anywhere;
    user-select: all;
  }
  .cp-copy {
    min-height: 44px;
    min-width: 44px;
    border: 0;
    background: transparent;
    display: grid;
    place-items: center;
    padding: 9px;
    color: var(--cp-muted);
    flex: none;
  }
  .cp-copy svg { width: 16px; height: 16px; }
  .cp-rules { min-width: 0; flex: 0 0 auto; color: var(--cp-muted); }
  .cp-rules summary {
    list-style: none;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 5px;
    min-height: 44px;
    padding: 9px 0 9px 4px;
    font-size: 11px;
    cursor: pointer;
  }
  .cp-rules summary::-webkit-details-marker { display: none; }
  .cp-rules summary::marker { content: ''; }
  .cp-rules summary svg { width: 13px; height: 13px; }
  .cp-rules[open] { flex-basis: 100%; width: 100%; }
  .cp-rules[open] summary { justify-content: flex-start; padding-left: 0; }
  .cp-rules[open] summary svg { transform: rotate(180deg); }
  .cp-rules ul { margin: 0; padding: 0 0 14px 17px; font-size: 11px; line-height: 1.6; }
  .cp-rules li + li { margin-top: 6px; }
  .cp-status { margin: 13px 0; font-size: 12px; color: var(--cp-muted); }
  .cp-status:empty { display: none; }
  .cp-selected {
    background: var(--cp-soft-green);
    border: 1px solid var(--cp-green-border);
    border-radius: 10px;
    padding: 12px;
    margin: 13px 0;
  }
  .cp-selected-heading { display: flex; align-items: center; gap: 7px; color: var(--cp-green); }
  .cp-selected-heading svg { width: 16px; height: 16px; }
  .cp-selected-heading strong { font-size: 12px; font-weight: 600; }
  .cp-selected p { margin: 5px 0; color: var(--cp-muted); font-size: 11px; line-height: 1.5; }
  .cp-selected-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0 12px; }
  .cp-selected-actions button {
    min-height: 44px;
    padding: 8px 0;
    border: 0;
    background: transparent;
    color: var(--cp-green);
    font-size: 11px;
    font-weight: 600;
  }
  .cp-selected-actions button:last-child { color: var(--cp-muted); font-weight: 400; }
  .cp-guest-note { display: flex; align-items: flex-start; gap: 8px; margin: 18px 0 14px; color: var(--cp-muted); }
  .cp-guest-note svg { width: 16px; height: 16px; flex: none; margin-top: 2px; }
  .cp-guest-note p { margin: 0; font-size: 11px; line-height: 1.6; }
  .cp-wallet {
    border: 0;
    background: transparent;
    color: var(--cp-red);
    padding: 10px 0;
    min-height: 44px;
    font-size: 11px;
    font-weight: 600;
  }
  .cp-divider { width: 100%; border-top: 1px solid var(--cp-border); margin: 2px 0 8px; }
  .cp-bottom-nav {
    width: 100%;
    margin: auto 0 16px;
    padding: 5px;
    border: 1px solid var(--cp-border);
    border-radius: 12px;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    background: var(--cp-card);
    gap: 3px;
  }
  .cp-bottom-nav button {
    display: grid;
    place-items: center;
    align-content: center;
    gap: 5px;
    min-height: 57px;
    padding: 8px 2px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    color: var(--cp-muted);
    font-size: 11px;
  }
  .cp-bottom-nav button[aria-current='page'] { color: var(--cp-red); background: var(--cp-soft-red); }
  .cp-bottom-nav svg { width: 17px; height: 17px; }
  .cp-footer { padding: 7px 0 2px; text-align: center; color: var(--cp-muted); font-size: 11px; }
  .cp-footer strong { color: var(--cp-text); margin-left: 6px; font-weight: 700; }

  &.is-dark {
    --cp-bg: #252c35;
    --cp-card: #1a2028;
    --cp-text: #f4f6fa;
    --cp-muted: #c0cad9;
    --cp-border: #3c4755;
    --cp-red: #ff8090;
    --cp-soft-red: #392a32;
    --cp-green: #a4dfba;
    --cp-soft-green: #263d32;
    --cp-green-border: #3e584a;
  }
  &.is-dark .cp-use:not(.is-selected) { color: #211d24; }
  &.is-dark .cp-use.is-selected { color: #fff; background: #a25965; border-color: #a25965; }
  &.is-dark .cp-selected-actions button:last-child { color: #c0cad9; }

  @media (max-width: 450px) {
    .cp-inner { padding-top: 16px; }
    .cp-ticket { padding-inline: 11px; }
    .cp-ticket-copy h2 { font-size: 14px; }
  }
  @media (max-width: 350px) {
    .cp-ticket { padding-inline: 10px; }
    .cp-ticket-main { grid-template-columns: 34px minmax(0, 1fr) 70px; gap: 7px; }
    .cp-icon { width: 34px; height: 34px; }
    .cp-use { width: 70px; }
    .cp-ticket-copy h2 { font-size: 13px; }
  }
  @media (prefers-reduced-motion: reduce) {
    &, *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
  }
`;
