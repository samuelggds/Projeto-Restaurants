import styled, { keyframes } from 'styled-components';

const cardEnter = keyframes`
  0% { opacity: 0; transform: translateY(10px) scale(.985); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;

const waveAlive = keyframes`
  0%, 72%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: .10; }
  78% { transform: translate3d(-7px, 1px, 0) scale(1.025); opacity: .14; }
  86% { transform: translate3d(5px, -1px, 0) scale(.99); opacity: .18; }
  94% { transform: translate3d(-2px, 0, 0) scale(1.01); opacity: .12; }
`;

const chipGlow = keyframes`
  0%, 76%, 100% { box-shadow: 0 0 0 rgba(225,198,148,0); }
  84% { box-shadow: 0 0 14px rgba(225,198,148,.20); }
`;

const contactlessSignalInner = keyframes`
  0%, 68%, 100% { opacity: .24; transform: translateX(0) scale(.96); }
  73%, 89% { opacity: 1; transform: translateX(.15px) scale(1); }
`;

const contactlessSignalMiddle = keyframes`
  0%, 72%, 100% { opacity: .18; transform: translateX(0) scale(.96); }
  78%, 91% { opacity: 1; transform: translateX(.25px) scale(1); }
`;

const contactlessSignalOuter = keyframes`
  0%, 76%, 100% { opacity: .12; transform: translateX(0) scale(.96); }
  83%, 93% { opacity: 1; transform: translateX(.35px) scale(1); }
`;

const brandReveal = keyframes`
  0% { opacity: 0; transform: translateY(-2px) scale(.94); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;


export const PaymentMethodGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  @container profile-content (max-width: 700px) {
    grid-template-columns: 1fr;
  }
`;
export const SavedCard = styled.article<{ $default: boolean; $brand?: string }>`
  min-width: 0;
  min-height: 194px;
  overflow: hidden;
  padding: 20px;
  border: 1px solid ${({ $default }) => ($default ? '#294237' : '#d9ddd7')};
  border-radius: 8px;
  background: ${({ $default }) => ($default ? '#294237' : '#fff')};
  box-shadow: ${({ $default }) =>
    $default ? '0 14px 30px rgba(32, 53, 44, 0.16)' : '0 8px 20px rgba(32, 37, 33, 0.05)'};
  color: ${({ $default }) => ($default ? '#fff' : '#252a26')};
  display: flex;
  flex-direction: column;
  gap: 15px;
  header,
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }
  .saved-card-chip {
    width: 34px;
    height: 25px;
    border: 1px solid ${({ $default }) => ($default ? 'rgba(255,255,255,.28)' : '#c9cec8')};
    border-radius: 6px;
    background: ${({ $default }) => ($default ? '#d5a963' : '#e5e8e3')};
  }
  .saved-card-brand {
    min-width: 0;
    margin-left: auto;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }
  .saved-card-brand img {
    display: block;
    width: min(88px, 100%);
    height: auto;
    max-width: 88px;
    max-height: 32px;
    object-fit: contain;
  }
  .saved-card-brand img[data-card-brand='visa'] {
    width: min(78px, 100%);
    max-width: 78px;
    max-height: 28px;
  }
  header b {
    padding: 4px 7px;
    border-radius: 5px;
    background: ${({ $default }) => ($default ? 'rgba(255,255,255,.12)' : '#eef0ec')};
    color: ${({ $default }) => ($default ? '#fff' : '#555e57')};
    font-size: 9px;
    text-transform: uppercase;
  }
  > strong {
    margin-top: auto;
    font-size: 20px;
    letter-spacing: 0;
  }
  small {
    color: ${({ $default }) => ($default ? 'rgba(255,255,255,.64)' : '#737a74')};
  }
  .saved-card-details {
    display: flex;
    justify-content: space-between;
    align-items: end;
    gap: 12px;
  }
  .saved-card-details span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .saved-card-details span:first-child {
    flex: 1;
  }
  .saved-card-details b {
    overflow: hidden;
    color: inherit;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  button {
    min-height: 34px;
    padding: 0 9px;
    border: 1px solid ${({ $default }) => ($default ? 'rgba(255,255,255,.24)' : '#d9ddd7')};
    border-radius: 6px;
    background: ${({ $default }) => ($default ? 'rgba(255,255,255,.08)' : '#fff')};
    color: inherit;
    cursor: pointer;
    transition:
      border-color 160ms ease,
      transform 160ms ease;
  }
  button:hover {
    transform: translateY(-1px);
  }
  button.danger {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 5px;
  }
`;
export const PaymentProtection = styled.div`
  margin-top: 18px;
  padding: 14px 16px;
  border: 1px solid #c9d9cd;
  border-radius: 8px;
  background: #eef5f0;
  color: #315f40;
  display: flex;
  align-items: center;
  gap: 12px;
  span {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12px;
  }
`;

export const PaymentCardPreview = styled.div<{ $brand?: string; $compact?: boolean }>`
  width: ${({ $compact }) => ($compact ? '320px' : '536px')};
  min-height: ${({ $compact }) => ($compact ? '174px' : '220px')};
  box-sizing: border-box;
  padding: ${({ $compact }) => ($compact ? '22px' : '32px')};
  border: 0;
  border-radius: 20px;
  background: linear-gradient(135deg, #2e2d2a 0%, #12110f 100%);
  color: #fff;
  box-shadow: 0 12px 24px rgba(31, 30, 26, .20);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  animation: ${cardEnter} 420ms cubic-bezier(.2,.8,.2,1) both;
  will-change: transform, opacity;

  .card-waves {
    position: absolute;
    top: -20px;
    right: -40px;
    width: 220px;
    height: 220px;
    opacity: .22;
    pointer-events: none;
    transform-origin: 50% 50%;
    animation: ${waveAlive} 5s cubic-bezier(.4,0,.2,1) infinite;
    overflow: visible;
  }

  .card-waves path {
    fill: none;
    stroke: rgba(255,255,255,.96);
    stroke-width: 1.7;
    vector-effect: non-scaling-stroke;
  }

  header,
  footer {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  header { min-height: 29px; }

  .card-tech {
    width: 60px;
    height: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .payment-chip {
    width: 32px;
    height: 24px;
    flex: 0 0 32px;
    border-radius: 4px;
    background: #e1c694;
    animation: ${chipGlow} 5s ease-in-out infinite;
  }

  .contactless-icon {
    width: 17px;
    height: 17px;
    color: #fff;
    stroke: #fff;
    fill: none;
    stroke-width: 1.9;
    opacity: 1;
    overflow: visible;
  }

  .contactless-icon path {
    transform-box: fill-box;
    transform-origin: center;
    will-change: opacity, transform;
  }

  .contactless-icon path:nth-child(1) {
    animation: ${contactlessSignalInner} 5s cubic-bezier(.4,0,.2,1) infinite;
  }

  .contactless-icon path:nth-child(2) {
    animation: ${contactlessSignalMiddle} 5s cubic-bezier(.4,0,.2,1) infinite;
  }

  .contactless-icon path:nth-child(3) {
    animation: ${contactlessSignalOuter} 5s cubic-bezier(.4,0,.2,1) infinite;
  }

  .card-generic-icon {
    width: 32px;
    height: 22px;
    stroke-width: 1.35;
    color: #fff;
    transition: opacity 180ms ease, transform 180ms ease;
  }

  .card-brand-logo {
    display: block;
    width: auto;
    max-width: 82px;
    max-height: 29px;
    object-fit: contain;
    animation: ${brandReveal} 240ms cubic-bezier(.2,.8,.2,1) both;
    transform-origin: right center;
  }

  > strong {
    position: relative;
    z-index: 1;
    margin-top: 36px;
    margin-bottom: 30px;
    color: #fff;
    font-size: 19px;
    line-height: 24px;
    font-weight: 800;
    letter-spacing: .08em;
    white-space: nowrap;
    transition: letter-spacing 220ms ease;
  }

  footer {
    min-height: 30px;
    align-items: flex-end;
  }

  footer span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  footer span:first-child {
    width: 147px;
    flex: 0 0 147px;
  }

  footer span:last-child {
    min-width: 51px;
    text-align: right;
  }

  footer small {
    color: #a8a59e;
    font-size: 8px;
    line-height: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }

  footer b {
    overflow: hidden;
    color: #fff;
    font-size: 12px;
    line-height: 17px;
    font-weight: 800;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  @media (max-width:900px) {
    width:100%;
    min-height:${({ $compact }) => ($compact ? '168px' : '190px')};
    margin-top:${({ $compact }) => ($compact ? '0' : '20px')};
    padding:${({ $compact }) => ($compact ? '20px' : '24px')};
    border-radius:20px;
    box-shadow:0 8px 16px rgba(31,30,26,.20);

    .card-waves { right:-40px; }

    .card-brand-logo {
      max-width:72px;
      max-height:29px;
    }

    > strong {
      margin-top:29px;
      margin-bottom:29px;
      font-size:18px;
      line-height:24px;
    }

    footer span:first-child {
      width:147px;
      flex-basis:147px;
    }

    footer b {
      font-size:12px;
      line-height:17px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &,
    .card-waves,
    .payment-chip,
    .card-brand-logo,
    .contactless-icon path {
      animation: none !important;
    }
    .contactless-icon,
    .card-generic-icon,
    > strong {
      transition: none !important;
    }
  }
`;

export const PaymentModalCard = styled.form`
  width: 600px;
  min-height: 893px;
  box-sizing: border-box;
  padding: 32px;
  border: 1px solid #ece6e0;
  border-radius: 16px;
  background: #fff;
  color: #211c18;
  display: grid;
  align-content: start;
  gap: 24px;

  .payment-fields { display:grid;gap:20px; }
  label { display:grid;gap:6px;color:#2f2a26;font-size:14px;font-weight:750; }
  input,
  .mp-secure-field {
    width:100%;
    min-height:42px;
    border:1px solid #e4ded8;
    border-radius:10px;
    padding:0 16px;
    background:#fff;
    color:#211c18;
    font:inherit;
    font-weight:500;
    outline:none;
  }
  input::placeholder { color:#9a938c;opacity:1; }
  input,
  .mp-secure-field {
    transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
  }
  input:focus,
  .mp-secure-field:focus-within {
    border-color:var(--payment-primary);
    box-shadow:0 0 0 3px color-mix(in srgb,var(--payment-primary) 10%,transparent);
  }
  .payment-number-field { position:relative; }
  .payment-number-field input,
  .payment-number-field .mp-secure-field { padding-right:56px; }
  .card-brand-pill {
    position:absolute;
    top:50%;
    right:16px;
    transform:translateY(-50%);
    width:32px;
    height:24px;
    display:flex;
    align-items:center;
    justify-content:flex-end;
    pointer-events:none;
  }
  .card-brand-pill img { max-width:32px;max-height:22px;object-fit:contain; }
  .generic-number-icon { width:24px;height:16px;color:#77716a; }
  .payment-row { display:grid;grid-template-columns:1fr 1fr;gap:20px; }

  .payment-security {
    margin:0;
    min-height:42px;
    display:flex;
    align-items:center;
    gap:10px;
    color:#57825f;
    font-size:13px;
  }
  .payment-security>svg { width:20px;height:20px;flex:0 0 20px; }
  .payment-security>span { display:grid;gap:2px; }
  .payment-security strong { font-size:13px;font-weight:600; }
  .payment-security small { color:#8a837c;font-size:11px; }
  .payment-error {
    margin:0;
    padding:10px 12px;
    border-radius:9px;
    background:#fff1f0;
    color:#b42318;
    font-size:12px;
  }

  .payment-actions {
    margin-top:auto;
    padding-top:124px;
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:16px;
  }
  .payment-actions button {
    min-height:51px;
    border-radius:10px;
    font:inherit;
    font-size:16px;
    font-weight:750;
    cursor:pointer;
    transition: transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease, background-color 180ms ease;
  }
  .payment-actions button:not(:disabled):hover {
    transform: translateY(-1px);
  }
  .payment-actions button:not(:disabled):active {
    transform: translateY(0) scale(.99);
  }
  .payment-actions .secondary {
    border:1px solid #e5dfd9;
    background:#fff;
    color:#726b65;
  }
  .payment-actions button[type='submit'] {
    border:0;
    background:var(--payment-primary);
    color:#fff;
    box-shadow:0 8px 18px color-mix(in srgb,var(--payment-primary) 22%,transparent);
  }
  .payment-actions button:disabled { opacity:.55;cursor:wait; }

  @media (max-width:900px) {
    width:100%;
    min-height:677px;
    padding:0;
    border:0;
    border-radius:0;
    gap:24px;
    .payment-fields { gap:16px; }
    label { font-size:14px; }
    input,.mp-secure-field { min-height:42px; }
    .payment-row { gap:12px; }
    .payment-security { min-height:16px; }
    .payment-security small { display:none; }
    .payment-actions {
      position:fixed;
      z-index:10;
      right:0;
      bottom:0;
      left:0;
      margin:0;
      padding:16px 20px calc(21px + env(safe-area-inset-bottom,0px));
      border-top:1px solid #ece8e3;
      background:#fff;
      grid-template-columns:1fr 1fr;
      gap:12px;
    }
    .payment-actions button { min-height:46px;font-size:15px; }
  }
`;

export const PaymentScreen = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  overflow-y: auto;
  background: #fbfaf7;
  color: #211c18;
  font-family: 'DM Sans', sans-serif;
  --payment-primary: var(--p, #ff5a2c);

  @media (max-width: 760px) {
    background: #fff;
  }
`;

export const PaymentDesktopHeader = styled.header`
  min-height: 80px;
  padding: 0 max(24px, calc((100vw - 1200px) / 2));
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 380px minmax(260px, 1fr);
  align-items: center;
  gap: 28px;
  border-bottom: 1px solid #ece8e3;
  background: #fff;

  button { font: inherit; cursor: pointer; }
  .brand { justify-self:start;padding:0;border:0;background:transparent;display:flex;align-items:center;gap:12px;color:#211c18;text-align:left; }
  .brand-logo { width:40px;height:40px;flex:0 0 40px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:var(--payment-primary);color:#fff;font-weight:800; }
  .brand-logo img { width:100%;height:100%;display:block;object-fit:cover; }
  .brand-copy { display:grid;gap:2px; }
  .brand-copy b { font-size:15px; }
  .brand-copy small { display:flex;align-items:center;gap:6px;color:#77716b;font-size:11px; }
  .brand-copy i { width:7px;height:7px;border-radius:50%;background:#2fbd67; }

  .search { min-height:38px;padding:0 14px;border:1px solid #e5e0db;border-radius:12px;background:#faf9f7;color:#8c857f;display:flex;align-items:center;gap:10px;text-align:left; }
  .search svg { width:16px;height:16px; }
  .search span { overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px; }

  .actions { justify-self:end;display:flex;align-items:center;gap:20px; }
  .account,.cart { border:0;background:transparent;color:#211c18;display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700; }
  .account svg,.cart svg { width:18px;height:18px; }
  .cart { min-height:38px;padding:0 14px;border-radius:10px;background:var(--payment-primary);color:#fff; }
  .cart b { min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#27231f;color:#fff;display:grid;place-items:center;font-size:10px; }

  @media (max-width: 900px) { display:none; }
`;

export const PaymentMobileHeader = styled.header`
  display:none;
  @media (max-width: 900px) {
    min-height:68px;padding:0 20px;border-bottom:1px solid #ece8e3;background:#fff;
    display:grid;grid-template-columns:44px 1fr 44px;align-items:center;
    .customer-avatar {
      width:44px;
      height:44px;
      padding:0;
      border:0;
      border-radius:50%;
      overflow:hidden;
      background:#f6f4f0;
      color:#2b2723;
      display:grid;
      place-items:center;
      font-weight:800;
      cursor:pointer;
    }
    .customer-avatar img { width:100%;height:100%;display:block;object-fit:cover; }
    .customer-avatar span { font-size:16px; }
    strong { text-align:left;padding-left:12px;font-size:20px;letter-spacing:-.02em; }
  }
`;

export const PaymentScreenMain = styled.main`
  width:min(100%, 1440px);
  min-height:1136px;
  box-sizing:border-box;
  margin:0 auto;
  padding:64px 0 80px;
  display:grid;
  justify-items:center;
  align-content:start;
  gap:32px;

  @media (max-width:900px) {
    width:100%;
    min-height:auto;
    padding:0 20px 115px;
    gap:0;
    background:#fff;
  }
`;

export const PaymentHeading = styled.div`
  width:600px;
  display:grid;
  gap:12px;

  span { color:var(--payment-primary);font-size:14px;font-weight:800; }
  h1 { margin:0;font-size:32px;line-height:1.18;letter-spacing:-.035em; }

  @media (max-width:900px) { display:none; }
`;


export const SavedCardDetails = styled.section`
  width: min(100%, 600px);
  margin: 0 auto;
  animation: ${cardEnter} 320ms cubic-bezier(.2,.8,.2,1) both;

  .details-heading {
    display:flex;
    align-items:center;
    gap:14px;
    margin-bottom:18px;
  }

  .details-heading .back {
    width:38px;
    height:38px;
    flex:0 0 38px;
    border:0;
    border-radius:50%;
    background:transparent;
    color:#211c18;
    display:grid;
    place-items:center;
    cursor:pointer;
    transition:background-color 180ms ease, transform 180ms ease;
  }

  .details-heading .back:hover {
    background:#f5f1ed;
    transform:translateX(-1px);
  }

  .details-heading .back svg {
    width:20px;
    height:20px;
  }

  .details-heading > div {
    min-width:0;
    display:grid;
    gap:4px;
  }

  .details-heading small {
    color:#8c847d;
    font-size:11px;
  }

  .details-heading h2 {
    margin:0;
    font-size:30px;
    line-height:1.15;
    letter-spacing:-.035em;
  }

  .details-card {
    padding:24px;
    border:1px solid #ece6e0;
    border-radius:16px;
    background:#fff;
    box-shadow:0 14px 38px rgba(37,30,24,.06);
    display:grid;
    grid-template-columns:320px minmax(0,1fr);
    gap:24px;
    align-items:start;
  }

  .visual-column {
    min-width:0;
  }

  .protected {
    margin:12px 8px 0;
    display:flex;
    align-items:center;
    gap:8px;
    color:#2f8f4e;
    font-size:11px;
  }

  .protected svg {
    width:14px;
    height:14px;
    flex:0 0 14px;
  }

  .info-column {
    min-width:0;
  }

  .primary-badge {
    min-height:48px;
    margin-bottom:8px;
    padding:8px 12px;
    border-radius:10px;
    background:#edf9f0;
    color:#2e914e;
    display:flex;
    align-items:center;
    gap:8px;
    font-size:12px;
    font-weight:700;
  }

  .primary-badge svg {
    width:18px;
    height:18px;
    flex:0 0 18px;
  }

  dl {
    margin:0;
    display:grid;
  }

  dl > div {
    min-height:48px;
    border-bottom:1px solid #eee9e4;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:16px;
  }

  dl > div:last-child {
    border-bottom:0;
  }

  dt {
    color:#8a837c;
    font-size:12px;
  }

  dd {
    margin:0;
    color:#292521;
    font-size:12px;
    font-weight:800;
    text-align:right;
  }

  .details-actions {
    margin-top:16px;
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:18px;
  }

  .details-actions button {
    min-height:46px;
    border-radius:10px;
    font:inherit;
    font-size:13px;
    font-weight:800;
    cursor:pointer;
    transition:transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
  }

  .details-actions button:not(:disabled):hover {
    transform:translateY(-1px);
  }

  .details-actions button:not(:disabled):active {
    transform:translateY(0) scale(.99);
  }

  .details-actions .remove {
    border:0;
    background:#fff1f1;
    color:#e03232;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:8px;
  }

  .details-actions .remove svg {
    width:16px;
    height:16px;
  }

  .details-actions .set-primary {
    border:1px solid var(--p);
    background:#fff;
    color:var(--p);
  }

  .details-actions .set-primary.current {
    border-color:#cfe5d6;
    background:#edf9f0;
    color:#2e914e;
    cursor:default;
  }

  @media(max-width:700px) {
    width:100%;

    .details-heading {
      margin-bottom:16px;
    }

    .details-heading small {
      display:none;
    }

    .details-heading h2 {
      font-size:22px;
    }

    .details-card {
      padding:0;
      border:0;
      border-radius:0;
      box-shadow:none;
      grid-template-columns:1fr;
      gap:18px;
    }

    .visual-column {
      display:grid;
      gap:10px;
    }

    .protected {
      display:none;
    }

    .primary-badge {
      margin:0;
      min-height:48px;
      font-size:13px;
    }

    dl > div {
      min-height:44px;
    }

    dt,
    dd {
      font-size:13px;
    }

    .details-actions {
      grid-template-columns:1fr;
      gap:12px;
      margin-top:16px;
    }

    .details-actions .set-primary {
      order:-1;
      min-height:48px;
    }

    .details-actions .remove {
      min-height:48px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation:none;
    .details-heading .back,
    .details-actions button {
      transition:none;
    }
  }
`;
