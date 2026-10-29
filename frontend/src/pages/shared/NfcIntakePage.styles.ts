import styled from 'styled-components';

/** Responsive reception layout shared by NFC intake and checkout. */
export const Frame = styled.main`

  --nfc-orange: #e9661d;
  --nfc-ink: #23302b;
  --nfc-muted: #69796e;
  --nfc-line: #dce5dc;
  box-sizing: border-box;
  min-height: 100dvh;
  padding: 0 22px 42px;
  background: #f7f8f5;
  color: var(--nfc-ink);
  font-size: 14px;
  *, *::before, *::after { box-sizing: border-box; }
  button, input { font: inherit; }
  button { cursor: pointer; }
  button:disabled { opacity: .55; cursor: not-allowed; }
  button:focus-visible, input:focus-visible, a:focus-visible {
    outline: 3px solid #efa071; outline-offset: 2px;
  }
  h1, h2, h3, p { margin: 0; }
  p { color: var(--nfc-muted); line-height: 1.6; }
  .nfc-header {
    max-width: 1180px; margin: 0 auto;
    display: flex; justify-content: space-between; align-items: center;
    gap: 14px; padding: 22px 0;
  }
  .nfc-brand { display: inline-flex; align-items: center; gap: 10px; min-width: 0; }
  .nfc-brand img { width: 45px; height: 45px; object-fit: contain; flex-shrink: 0; }
  .nfc-brand strong { display: block; font-size: 22px; line-height: 1.1; font-weight: 900; letter-spacing: -.8px; }
  .nfc-brand strong span { color: var(--nfc-orange); }
  .nfc-brand small { color: #7a8880; display: block; font-size: 9px; font-weight: 850; letter-spacing: 1px; margin-top: 3px; }
  .nfc-header-note { display: flex; align-items: center; gap: 7px; color: #64776c; font-size: 12px; white-space: nowrap; }
  .nfc-shell { max-width: 1100px; margin: 0 auto; }
  .nfc-hero { padding: 26px 0 29px; }
  .nfc-eyebrow { color: var(--nfc-orange); font-size: 11px; letter-spacing: 1.65px; text-transform: uppercase; font-weight: 900; }
  .nfc-hero-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .nfc-hero h1 { font-size: clamp(28px, 4vw, 40px); letter-spacing: -1.6px; font-weight: 900; margin: 6px 0 7px; color: #203028; }
  .nfc-hero h1 span { color: var(--nfc-orange); }
  .nfc-hero p { font-size: 13px; }
  .nfc-badge {
    display: inline-flex; align-items: center; gap: 7px; border-radius: 10px;
    background: #e9f5ea; color: #28784e; padding: 11px 13px;
    font-size: 11px; font-weight: 850; white-space: nowrap;
  }
  .nfc-layout { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(265px, .83fr); gap: 21px; align-items: start; }
  .nfc-panel { min-width: 0; background: #fff; border: 1px solid #e3eae2; border-radius: 20px; overflow: hidden; box-shadow: 0 12px 32px #2c38280a; }
  .nfc-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; padding: 10px; border-bottom: 1px solid #e3e9e2; background: #f2f5f0; }
  .nfc-tab {
    background: transparent; color: #66746c; border: 0; border-radius: 11px;
    padding: 12px 9px; min-height: 47px; font-size: 12px; font-weight: 800;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-width: 0;
  }
  .nfc-tab.active { background: #fff; color: #23342b; box-shadow: 0 2px 7px #1b322115; }
  .nfc-form-inner { padding: clamp(18px, 3vw, 32px); display: grid; gap: 19px; }
  .nfc-form-title { font-size: 23px; font-weight: 900; letter-spacing: -.7px; color: #20312b; }
  .nfc-desc { font-size: 12px; }
  .nfc-form { display: grid; gap: 16px; }
  .nfc-field { min-width: 0; display: grid; gap: 7px; font-size: 12px; font-weight: 750; color: #25392f; }
  .nfc-input {
    width: 100%; min-width: 0; min-height: 44px; padding: 12px 14px;
    background: #fff; border: 1px solid #dce5db; border-radius: 11px;
    color: #23362d;
  }
  .nfc-input::placeholder { color: #97a49b; }
  .nfc-two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; }
  .nfc-divider { height: 1px; background: #e7ede6; margin: 2px 0; }
  .nfc-optional { color: #8b988e; font-size: 11px; font-weight: 500; margin-left: 4px; }
  .nfc-muted-help { color: #78887d; font-size: 11px; line-height: 1.5; }
  .nfc-checkbox {
    display: flex; gap: 11px; align-items: flex-start;
    background: #f3f6f1; padding: 13px 14px; border-radius: 11px;
    color: #304538; font-size: 12px; font-weight: 760;
  }
  .nfc-checkbox input { width: 17px; height: 17px; flex-shrink: 0; margin: 2px 0 0; accent-color: var(--nfc-orange); }
  .nfc-checkbox small { display: block; color: #7a887d; font-size: 10px; font-weight: 500; line-height: 1.55; margin-top: 4px; }
  .nfc-btn {
    background: var(--nfc-orange); color: #fff; border: 1px solid var(--nfc-orange);
    border-radius: 10px; min-height: 44px; padding: 11px 15px;
    font-size: 12px; font-weight: 850; text-align: center;
  }
  .nfc-btn.wide { width: 100%; }
  .nfc-btn.secondary { background: #fff; border-color: #d8e3d9; color: #304537; }
  .nfc-btn.ghost { background: #f7f9f6; border-color: #e1e8df; color: #304537; }
  .nfc-assurance { text-align: center; font-size: 11px; color: #78887b; }
  .nfc-aside { display: grid; gap: 15px; min-width: 0; }
  .nfc-feature { border-radius: 20px; background: #fff1e6; padding: 23px 20px; min-width: 0; }
  .nfc-feature-kicker { color: #a96231; font-size: 10px; letter-spacing: 1.4px; font-weight: 850; text-transform: uppercase; }
  .nfc-card-preview {
    transform: rotate(-6deg); box-shadow: 0 12px 30px #7950311b; background: #fff;
    color: #1c2924; padding: 17px 15px; border-radius: 10px; margin: 22px auto 25px;
    max-width: 255px; min-height: 138px;
    display: flex; flex-direction: column; justify-content: space-between; gap: 12px;
  }
  .nfc-card-brand { display: flex; align-items: center; gap: 8px; }
  .nfc-card-brand img { width: 30px; height: 30px; object-fit: contain; }
  .nfc-card-brand strong { font-size: 17px; font-weight: 900; letter-spacing: -.6px; }
  .nfc-card-brand strong span { color: var(--nfc-orange); }
  .nfc-card-preview h3 { font-size: 16px; font-weight: 900; letter-spacing: -.6px; }
  .nfc-card-preview small { display: block; font-size: 9px; color: #68786e; }
  .nfc-feature h2 { font-size: 22px; font-weight: 900; line-height: 1.18; letter-spacing: -.65px; color: #22352a; }
  .nfc-feature p { font-size: 11px; margin-top: 10px; }
  .nfc-feature-foot { border-top: 1px solid #efd8c5; margin-top: 20px; padding-top: 14px; font-size: 11px; color: #b16f3e; }
  .nfc-action-card { background: #fff; border: 1px solid #e0e8df; border-radius: 16px; padding: 19px; display: grid; gap: 11px; }
  .nfc-action-icon { display: grid; place-items: center; font-size: 18px; background: #f1f5ef; width: 33px; height: 33px; border-radius: 9px; color: #da702e; }
  .nfc-action-card h2 { color: #233329; font-size: 14px; font-weight: 900; }
  .nfc-action-card p { font-size: 11px; }
  .nfc-error { border: 1px solid #efc6c3; background: #fff0ef; color: #982d29; padding: 12px; border-radius: 9px; font-size: 12px; line-height: 1.55; }
  .nfc-success { border: 1px solid #cbead3; background: #eaf7ee; color: #226e44; padding: 12px; border-radius: 9px; font-size: 12px; line-height: 1.6; }
  .nfc-info { border: 1px solid #dde8de; background: #f4f8f3; color: #516b56; padding: 12px; border-radius: 9px; font-size: 12px; line-height: 1.6; }
  .nfc-footer { max-width: 1100px; margin: 30px auto 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 11px; color: #7a897d; }
  .nfc-footer strong { color: #697c6b; }
  @media (max-width: 840px) {
    .nfc-layout { grid-template-columns: minmax(0, 1fr); gap: 15px; }
    .nfc-aside { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  }
  @media (max-width: 620px) {
    padding: 0 13px 24px;
    .nfc-header { padding: 14px 2px; }
    .nfc-brand img { width: 36px; height: 36px; }
    .nfc-brand strong { font-size: 18px; }
    .nfc-brand small { font-size: 7px; letter-spacing: .65px; }
    .nfc-header-note { font-size: 10px; }
    .nfc-hero { padding: 23px 3px 21px; }
    .nfc-hero-row { align-items: flex-start; flex-direction: column; gap: 13px; }
    .nfc-hero h1 { font-size: clamp(28px, 8vw, 35px); }
    .nfc-badge { padding: 8px 10px; }
    .nfc-layout { gap: 13px; }
    .nfc-form-inner { padding: 20px 17px 22px; gap: 15px; }
    .nfc-form-title { font-size: 20px; }
    .nfc-tabs { padding: 7px; gap: 3px; }
    .nfc-tab { padding: 10px 4px; font-size: 11px; gap: 5px; }
    .nfc-two { grid-template-columns: 1fr; gap: 15px; }
    .nfc-aside { grid-template-columns: 1fr; }
    .nfc-feature { padding: 20px 18px; }
    .nfc-card-preview { margin: 17px auto 25px; }
    .nfc-footer { margin-top: 18px; padding: 0 3px; }
  }
  @media (max-width: 360px) {
    padding-left: 9px; padding-right: 9px;
    .nfc-header-note { display: none; }
    .nfc-form-inner { padding: 16px 13px 20px; }
    .nfc-tab { font-size: 10px; }
  }
`;
