import { css } from 'styled-components';

/* Translated from the supplied GastroNexa-Telas-NFC reference: layout and
   design tokens only. No demo data or simulated business logic. */
export const nfcStaffReferenceStyles = css`
  &.staff.visual {
    color-scheme: light dark;
    --gx-bg: light-dark(#f7f8fa, #151a20);
    --gx-surface: light-dark(#fff, #202730);
    --gx-ink: light-dark(#232b35, #f4f5f7);
    --gx-muted: light-dark(#697582, #a8b4c3);
    --gx-line: light-dark(#e4e8ee, #36404d);
    --gx-brand: light-dark(#bd4414, #f59063);
    --gx-fill: light-dark(#bd4414, #b94215);
    --gx-soft: light-dark(#fff3ed, #392820);
    --gx-green: light-dark(#267345, #8bd5aa);
    --gx-green-bg: light-dark(#edf7f0, #23372d);
    --gx-amber: light-dark(#956516, #edc47a);
    --gx-amber-bg: light-dark(#fff8e9, #362e20);
    --gx-red: light-dark(#a73232, #ffabab);
    min-height: 100dvh;
    background: var(--gx-bg);
    padding: 0;
    color: var(--gx-ink);
    font: 14px/1.5 Inter, 'Segoe UI', system-ui, sans-serif;
  }
  &.staff.visual .nfc-frame {
    width: min(100%, 440px);
    min-height: 100dvh;
    margin: 0 auto;
    padding: 16px 20px 20px;
    background: var(--gx-bg);
    color: var(--gx-ink);
    border: 1px solid var(--gx-line);
    border-radius: 22px;
    box-shadow: 0 10px 36px #27364b09;
    overflow: hidden;
  }
  &.staff.visual h1, &.staff.visual h2, &.staff.visual h3,
  &.staff.visual h4, &.staff.visual p { margin: 0; }
  &.staff.visual .nfc-back {
    display: inline-flex; align-items: center; gap: 7px;
    border: 0; background: transparent;
    padding: 0; min-height: 34px; margin: 0;
    font-size: 12px; font-weight: 400; color: var(--gx-muted);
  }
  &.staff.visual .nfc-back svg { width: 15px; height: 15px; }
  &.staff.visual .nfc-staff-head {
    display:flex; justify-content:space-between; align-items:center;
    gap:10px; margin:0; padding:17px 0;
  }
  &.staff.visual .nfc-brand {
    font-size:22px; letter-spacing:-1px; font-weight:550; line-height:1.1;
    color:var(--gx-ink); white-space:nowrap;
  }
  &.staff.visual .nfc-brand img { width:31px; height:31px; margin-right:8px; }
  &.staff.visual .nfc-brand b { font-weight:650; color:var(--gx-brand); }
  &.staff.visual .nfc-staff-tag {
    display:inline-flex; align-items:center; gap:4px; border:0;
    border-radius:6px; background:var(--gx-green-bg); color:var(--gx-green);
    font-size:10px; padding:5px 7px; white-space:nowrap;
  }
  &.staff.visual .nfc-staff-tag svg { width:12px; height:12px; }
  &.staff.visual .gx-storebar {
    display:flex; align-items:center; gap:6px; padding:11px 0 14px;
    border-bottom:1px solid var(--gx-line); color:var(--gx-muted); font-size:11px;
  }
  &.staff.visual .gx-storebar svg { width:13px; height:13px; }
  &.staff.visual .gx-storebar span { margin-left:auto; }
  &.staff.visual .gx-screen-header { padding:24px 0 20px; display:grid; gap:8px; }
  &.staff.visual .nfc-kicker {
    font-size:10px; letter-spacing:1.2px; text-transform:uppercase;
    color:var(--gx-brand); font-weight:650;
  }
  &.staff.visual .nfc-staff-title {
    font-size:25px; line-height:1.2; letter-spacing:-.8px;
    font-weight:650; margin:0; color:var(--gx-ink);
  }
  &.staff.visual .nfc-subtitle { color:var(--gx-muted); font-size:13px; line-height:1.5; }
  &.staff.visual .nfc-staff-card {
    display:block; margin:0; padding:0; border:0; background:transparent; box-shadow:none;
    border-radius:0; color:var(--gx-ink);
  }
  &.staff.visual .nfc-staff-card > p[role="status"]:first-child { display:none; }
  &.staff.visual .nfc-note {
    border-top:1px solid var(--gx-line); margin:36px 0 0;
    padding:16px 0 8px; color:var(--gx-muted);
    font-size:10px; font-weight:400;
  }
  &.staff.visual .nfc-note svg { width:13px; height:13px; }
  &.staff.visual .gx-panel {
    background:var(--gx-surface); border:1px solid var(--gx-line);
    border-radius:16px; padding:19px; margin-bottom:16px;
  }
  &.staff.visual .gx-person-top { display:flex; align-items:center; gap:13px; }
  &.staff.visual .gx-avatar {
    display:grid; flex:none; place-items:center;
    width:48px; height:48px; border-radius:14px;
    background:var(--gx-soft); color:var(--gx-brand);
    font-size:17px; font-weight:600; letter-spacing:-.6px;
  }
  &.staff.visual .gx-person-label { display:block; margin-bottom:4px; font-size:11px; color:var(--gx-muted); }
  &.staff.visual .gx-person-name { font-size:18px; font-weight:650; letter-spacing:-.35px; line-height:1.35; overflow-wrap:anywhere; }
  &.staff.visual .gx-pill {
    display:inline-flex; align-items:center; gap:6px;
    border-radius:20px; padding:5px 9px; font-size:11px;
    background:var(--gx-green-bg); color:var(--gx-green);
  }
  &.staff.visual .gx-pill svg { width:13px; height:13px; }
  &.staff.visual .gx-status-row {
    display:flex; align-items:center; flex-wrap:wrap; gap:9px;
    margin:15px 0 16px;
  }
  &.staff.visual .gx-status-row > span:last-child { font-size:11px; color:var(--gx-muted); }
  &.staff.visual .gx-definition {
    display:grid; gap:10px; margin:0; padding-top:15px; border-top:1px solid var(--gx-line);
  }
  &.staff.visual .gx-definition > div { display:flex; justify-content:space-between; gap:12px; font-size:12px; }
  &.staff.visual dt { color:var(--gx-muted); }
  &.staff.visual dd { margin:0; font-weight:600; text-align:right; overflow-wrap:anywhere; }
  &.staff.visual .gx-action-title { margin:22px 0 10px; color:var(--gx-muted); font-size:11px; font-weight:650; letter-spacing:.8px; text-transform:uppercase; }
  &.staff.visual .gx-button {
    display:flex; align-items:center; justify-content:center; gap:8px;
    min-height:46px; width:100%; padding:12px 15px; border-radius:11px;
    border:1px solid var(--gx-line); background:var(--gx-surface);
    color:var(--gx-ink); font-size:13px; font-weight:600; text-align:center;
    text-decoration:none; cursor:pointer;
  }
  &.staff.visual .gx-primary { background:var(--gx-fill); border-color:var(--gx-fill); color:#fff; }
  &.staff.visual .gx-button:disabled { opacity:.45; cursor:not-allowed; }
  &.staff.visual .gx-actions { display:grid; gap:9px; }
  &.staff.visual .gx-action-row { justify-content:flex-start; text-align:left; padding:14px; }
  &.staff.visual .gx-action-row > span { flex:1; }
  &.staff.visual .gx-action-row small { display:block; opacity:.8; font-size:11px; font-weight:400; margin-top:2px; }
  &.staff.visual .gx-action-row > svg:last-child { width:15px; height:15px; }
  &.staff.visual .gx-line-note { display:flex; align-items:flex-start; gap:7px; margin-top:12px; font-size:11px; color:var(--gx-muted); }
  &.staff.visual .gx-line-note svg { width:14px; height:14px; margin-top:2px; flex:none; }
  &.staff.visual .gx-release { border-top:1px solid var(--gx-line); margin-top:23px; padding-top:7px; }
  &.staff.visual .gx-release summary {
    display:flex; align-items:center; gap:10px; list-style:none;
    padding:13px 0; font-size:13px; font-weight:600; cursor:pointer;
  }
  &.staff.visual .gx-release summary::-webkit-details-marker { display:none; }
  &.staff.visual .gx-release summary > span { flex:1; }
  &.staff.visual .gx-release summary > svg:last-child { width:14px; height:14px; }
  &.staff.visual .gx-release[open] summary > svg:last-child { transform:rotate(180deg); }
  &.staff.visual .gx-release-content { display:grid; gap:12px; padding:5px 0 10px; }
  &.staff.visual .gx-release-content > p { font-size:12px; color:var(--gx-muted); }
  &.staff.visual .gx-field { display:grid; gap:7px; font-size:12px; font-weight:600; }
  &.staff.visual input:not([type="checkbox"]),
  &.staff.visual textarea {
    width:100%; max-width:100%; min-width:0; padding:12px;
    color:var(--gx-ink); background:var(--gx-surface);
    border:1px solid var(--gx-line); border-radius:10px; font-size:16px;
  }
  &.staff.visual input::placeholder, &.staff.visual textarea::placeholder { color:var(--gx-muted); font-size:13px; }
  &.staff.visual textarea { resize:vertical; min-height:76px; }
  &.staff.visual .gx-help { color:var(--gx-muted); font-size:11px; font-weight:400; }
  &.staff.visual .gx-error { color:var(--gx-red); font-size:12px; line-height:1.55; }
  &.staff.visual .gx-inline-context {
    display:flex; align-items:center; gap:10px; padding:12px; margin-bottom:18px;
    border:1px solid var(--gx-line); border-radius:11px; background:var(--gx-surface);
  }
  &.staff.visual .gx-inline-context .gx-avatar { width:36px; height:36px; border-radius:10px; font-size:12px; }
  &.staff.visual .gx-inline-context strong { display:block; font-size:12px; }
  &.staff.visual .gx-inline-context small { font-size:10px; color:var(--gx-muted); }
  &.staff.visual .gx-inline-context > svg { margin-left:auto; width:16px; height:16px; color:var(--gx-green); }
  &.staff.visual .gx-search { display:block; position:relative; }
  &.staff.visual .gx-search > svg { position:absolute; left:12px; top:14px; width:18px; height:18px; color:var(--gx-muted); }
  &.staff.visual .gx-search input { height:46px; padding-left:39px; }
  &.staff.visual .gx-categories { display:flex; gap:6px; flex-wrap:wrap; margin:12px 0 15px; }
  &.staff.visual .gx-categories button {
    min-height:38px; padding:8px 12px; border:1px solid var(--gx-line);
    border-radius:8px; background:var(--gx-surface); color:var(--gx-ink); font-size:11px;
  }
  &.staff.visual .gx-categories button[aria-pressed="true"] {
    background:var(--gx-soft); color:var(--gx-brand); border-color:var(--gx-brand);
  }
  &.staff.visual .gx-list-meta { display:flex; align-items:center; justify-content:space-between; margin:16px 0 9px; color:var(--gx-muted); font-size:11px; }
  &.staff.visual .gx-products { border:1px solid var(--gx-line); border-radius:14px; background:var(--gx-surface); overflow:hidden; }
  &.staff.visual .gx-product { display:grid; grid-template-columns:66px minmax(0,1fr); align-items:center; gap:12px; padding:14px 12px; }
  &.staff.visual .gx-product + .gx-product { border-top:1px solid var(--gx-line); }
  &.staff.visual .gx-photo { width:66px; height:72px; border-radius:10px; flex:none; }
  &.staff.visual .gx-product h3 { font-size:13px; line-height:1.3; }
  &.staff.visual .gx-product p { font-size:10px; color:var(--gx-muted); margin-top:3px; }
  &.staff.visual .gx-product-bottom { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:9px; }
  &.staff.visual .gx-price { font-size:12px; font-weight:650; white-space:nowrap; }
  &.staff.visual .gx-quantity { display:flex; align-items:center; flex:none; border:1px solid var(--gx-line); background:var(--gx-bg); border-radius:8px; overflow:hidden; }
  &.staff.visual .gx-quantity button { display:grid; place-items:center; width:32px; height:36px; padding:0; border:0; background:transparent; color:var(--gx-brand); cursor:pointer; }
  &.staff.visual .gx-quantity button svg { width:14px; height:14px; }
  &.staff.visual .gx-quantity output { min-width:22px; text-align:center; font-size:12px; font-weight:600; }
  &.staff.visual .gx-cart { margin-top:16px; }
  &.staff.visual .gx-section-heading { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:12px; }
  &.staff.visual .gx-section-heading h2 { font-size:15px; }
  &.staff.visual .gx-count { border-radius:6px; padding:3px 7px; font-size:11px; color:var(--gx-muted); background:var(--gx-bg); }
  &.staff.visual .gx-cart-empty { display:flex; align-items:center; gap:10px; padding:6px 0 12px; color:var(--gx-muted); font-size:12px; }
  &.staff.visual .gx-mini-line { display:flex; align-items:center; gap:9px; padding:10px 0; border-bottom:1px solid var(--gx-line); font-size:12px; }
  &.staff.visual .gx-mini-line .gx-photo { width:38px; height:38px; border-radius:7px; }
  &.staff.visual .gx-mini-line > span { flex:1; min-width:0; }
  &.staff.visual .gx-mini-line > strong { white-space:nowrap; font-size:12px; }
  &.staff.visual .gx-total-row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:16px 0; }
  &.staff.visual .gx-total-row > span { color:var(--gx-muted); font-size:12px; }
  &.staff.visual .gx-total-row > strong { font-size:20px; letter-spacing:-.5px; }
  &.staff.visual .gx-note-field { margin-top:15px; }
  &.staff.visual .gx-mini-caption { margin-top:10px; text-align:center; font-size:11px; color:var(--gx-muted); }
  &.staff.visual .gx-empty { display:grid; place-items:center; gap:8px; text-align:center; padding:28px 12px; }
  &.staff.visual .gx-empty > span { display:grid; place-items:center; width:43px; height:43px; border-radius:12px; color:var(--gx-muted); background:var(--gx-bg); }
  &.staff.visual .gx-empty p { max-width:240px; color:var(--gx-muted); font-size:12px; }
  &.staff.visual .gx-status-hero { padding:23px 15px 18px; text-align:center; }
  &.staff.visual .gx-status-symbol { display:grid; place-items:center; width:56px; height:56px; border-radius:17px; margin:0 auto 14px; color:var(--gx-amber); background:var(--gx-amber-bg); }
  &.staff.visual .gx-status-symbol svg { width:27px; height:27px; }
  &.staff.visual .gx-status-hero h2 { font-size:22px; font-weight:650; letter-spacing:-.6px; line-height:1.25; }
  &.staff.visual .gx-status-hero > p { max-width:285px; margin:10px auto 0; color:var(--gx-muted); font-size:12px; }
  &.staff.visual .gx-status-hero.gx-success .gx-status-symbol { color:var(--gx-green); background:var(--gx-green-bg); }
  &.staff.visual .gx-steps { padding:0; margin:8px 0 19px; list-style:none; }
  &.staff.visual .gx-steps li { display:flex; gap:11px; align-items:flex-start; padding:12px 0; }
  &.staff.visual .gx-steps li + li { border-top:1px solid var(--gx-line); }
  &.staff.visual .gx-step-icon { display:grid; place-items:center; flex:none; width:28px; height:28px; border-radius:50%; color:var(--gx-green); background:var(--gx-green-bg); }
  &.staff.visual .gx-step-icon.gx-wait { color:var(--gx-amber); background:var(--gx-amber-bg); }
  &.staff.visual .gx-steps strong { font-size:12px; }
  &.staff.visual .gx-steps small { display:block; font-size:11px; color:var(--gx-muted); }
  &.staff.visual .gx-status-summary { padding:12px 0; border-top:1px solid var(--gx-line); }
  &.staff.visual .gx-status-summary summary { font-size:12px; color:var(--gx-muted); cursor:pointer; }
  &.staff.visual .gx-alert { padding:12px; border-radius:10px; background:var(--gx-amber-bg); color:var(--gx-amber); font-size:12px; }
  &.staff.visual .gx-balance { padding:20px; border:1px solid var(--gx-line); border-radius:16px; background:var(--gx-surface); margin-bottom:18px; }
  &.staff.visual .gx-balance-label { display:flex; align-items:center; justify-content:space-between; color:var(--gx-muted); font-size:12px; }
  &.staff.visual .gx-balance > strong { display:block; font-size:34px; letter-spacing:-1.1px; line-height:1.2; margin:8px 0 19px; }
  &.staff.visual .gx-balance dl { display:grid; grid-template-columns:1fr 1fr; margin:0; padding-top:15px; border-top:1px solid var(--gx-line); }
  &.staff.visual .gx-balance dl > div + div { border-left:1px solid var(--gx-line); padding-left:18px; }
  &.staff.visual .gx-balance dt { font-size:11px; }
  &.staff.visual .gx-balance dd { text-align:left; font-size:14px; margin-top:3px; }
  &.staff.visual .gx-bill-tabs { display:flex; gap:20px; margin-bottom:15px; border-bottom:1px solid var(--gx-line); }
  &.staff.visual .gx-bill-tabs button { position:relative; min-height:42px; padding:10px 0 12px; border:0; background:transparent; color:var(--gx-muted); font-size:12px; }
  &.staff.visual .gx-bill-tabs button[aria-pressed="true"] { color:var(--gx-brand); font-weight:650; }
  &.staff.visual .gx-bill-tabs button[aria-pressed="true"]:after { content:''; position:absolute; bottom:-1px; left:0; right:0; height:2px; background:var(--gx-brand); }
  &.staff.visual .gx-order-card { padding:14px 0; }
  &.staff.visual .gx-order-card + .gx-order-card { border-top:1px solid var(--gx-line); }
  &.staff.visual .gx-order-top { display:flex; align-items:center; justify-content:space-between; gap:10px; }
  &.staff.visual .gx-order-top strong { font-size:13px; }
  &.staff.visual .gx-order-top small { display:block; margin-top:3px; color:var(--gx-muted); font-size:11px; }
  &.staff.visual .gx-refresh-row { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:16px; color:var(--gx-muted); font-size:11px; }
  &.staff.visual .gx-refresh-row button { width:auto; padding:8px 12px; min-height:42px; font-size:11px; }
  &.staff.visual .gx-payment { display:grid; gap:13px; }
  &.staff.visual .gx-payment .gx-panel { display:grid; gap:13px; }
  &.staff.visual button:focus-visible, &.staff.visual a:focus-visible,
  &.staff.visual input:focus-visible, &.staff.visual summary:focus-visible {
    outline:3px solid var(--gx-brand); outline-offset:3px;
  }
  @media (max-width:380px) {
    &.staff.visual .nfc-frame { padding-inline:14px; }
    &.staff.visual .gx-product { grid-template-columns:56px minmax(0,1fr); gap:10px; padding:12px 10px; }
    &.staff.visual .gx-photo { width:56px; height:67px; }
    &.staff.visual .gx-panel { padding:16px; }
    &.staff.visual .gx-product p { display:none; }
    &.staff.visual .gx-categories button { padding:8px 10px; }
  }
  @media (pointer:coarse) {
    &.staff.visual .gx-quantity button { width:39px; height:44px; }
    &.staff.visual .gx-categories button { min-height:44px; }
    &.staff.visual .nfc-back { min-height:44px; }
  }
  @media (prefers-reduced-motion:reduce) {
    &.staff.visual *, &.staff.visual *:before, &.staff.visual *:after { animation:none!important; transition:none!important; }
  }
`;
