import styled, { keyframes } from 'styled-components';
const rotate = keyframes`to { transform: rotate(360deg); }`;
export const Root = styled.div`
  --ink: #213c30;
  --muted: #738076;
  --accent: #dd5c16;
  --line: #e2e6dc;
  min-height: 100vh;
  min-height: 100dvh;
  background: radial-gradient(ellipse at 0 100%, #e8eddf88, transparent 45%), #f8f9f4;
  color: var(--ink);
  font-family: 'Manrope', Inter, system-ui, sans-serif;
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  button,
  textarea {
    font: inherit;
  }
  button {
    cursor: pointer;
  }
  button:disabled {
    cursor: wait;
    opacity: 0.65;
  }
  button:focus-visible,
  summary:focus-visible,
  textarea:focus-visible {
    outline: 3px solid #96ae86;
    outline-offset: 4px;
  }
  .spin {
    animation: ${rotate} 1s linear infinite;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  @media (prefers-reduced-motion: reduce) {
    .spin {
      animation: none;
    }
  }
`;

export const Header = styled.header`
  min-height: 84px;
  padding: 16px max(24px, calc((100vw - 1200px) / 2));
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid var(--line);
  background: #fffefb;
  .header-actions {
    display: flex;
    align-items: center;
    gap: 24px;
  }
  .secure {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #6c786a;
    font-size: 13px;
  }
  button {
    display: flex;
    align-items: center;
    gap: 7px;
    min-height: 42px;
    padding: 8px 13px;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: transparent;
    color: var(--ink);
    font-size: 12px;
  }
  button:hover {
    background: #f1f4eb;
  }
  @media (max-width: 650px) {
    min-height: 72px;
    padding: 12px 18px;
    .secure {
      display: none;
    }
    button span {
      position: absolute;
      width: 1px;
      height: 1px;
      clip-path: inset(50%);
      overflow: hidden;
    }
  }
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  img {
    object-fit: contain;
  }
  > span {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.9px;
  }
  em {
    color: var(--accent);
    font-style: normal;
  }
  small {
    display: block;
    margin-top: 2px;
    color: #869180;
    font-size: 8px;
    font-weight: 600;
    letter-spacing: 1.55px;
  }
`;

export const Main = styled.main`
  width: min(1200px, calc(100% - 48px));
  margin: 0 auto;
  padding: clamp(28px, 4.5vw, 62px) 0 22px;
  @media (max-width: 650px) {
    width: calc(100% - 32px);
    padding-top: 26px;
  }
`;

export const Heading = styled.div`
  margin-bottom: 34px;
  .eyebrow {
    display: block;
    margin-bottom: 18px;
    font-size: 9px;
    font-weight: 750;
    letter-spacing: 1.8px;
    color: #839177;
  }
  .eyebrow span {
    padding: 0 8px;
    color: #bec8b5;
  }
  .title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
  }
  h1 {
    margin: 0 0 12px;
    font-size: clamp(27px, 3.2vw, 41px);
    font-weight: 650;
    letter-spacing: -1.7px;
    line-height: 1.15;
  }
  h1 span {
    color: var(--accent);
  }
  p {
    margin: 0;
    max-width: 630px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.8;
  }
  .status {
    flex-shrink: 0;
    display: inline-flex;
    gap: 7px;
    align-items: center;
    padding: 9px 12px;
    background: #fff1e5;
    border: 1px solid #f4dfc9;
    color: #9b581f;
    font-size: 12px;
    font-weight: 700;
    border-radius: 999px;
  }
  .status > span {
    height: 5px;
    width: 5px;
    background: #cc8a49;
    border-radius: 50%;
  }
  @media (max-width: 650px) {
    margin-bottom: 23px;
    .title-row {
      flex-direction: column;
      gap: 14px;
    }
    .eyebrow {
      margin-bottom: 15px;
    }
    h1 {
      letter-spacing: -1px;
    }
  }
`;

export const Layout = styled.div`
  display: grid;
  grid-template-columns: minmax(290px, 0.85fr) minmax(0, 1.6fr);
  gap: 26px;
  align-items: start;
  @media (max-width: 1000px) {
    grid-template-columns: minmax(240px, 0.8fr) minmax(0, 1.3fr);
    gap: 18px;
  }
  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const Receipt = styled.section`
  position: relative;
  padding: 30px;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid #294b3b;
  color: #f6f8ed;
  background: radial-gradient(circle at 105% 5%, #4b694247, transparent 50%), #233f32;
  box-shadow: 0 12px 32px #203b3210;
  .receipt-top {
    display: flex;
    align-items: center;
    gap: 11px;
    margin-bottom: 30px;
  }
  .receipt-icon {
    display: grid;
    place-items: center;
    width: 42px;
    height: 44px;
    border: 1px solid #7892704f;
    border-radius: 10px;
    color: #dfedbb;
  }
  .receipt-top > span:last-child {
    font-size: 9px;
    letter-spacing: 1.7px;
    color: #d5dfc8;
  }
  .receipt-top small {
    display: block;
    margin-top: 6px;
    font-size: 13px;
    letter-spacing: 0;
    color: #a9b9a5;
  }
  h2 {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 500;
    color: #d3ddcb;
  }
  .amount {
    display: block;
    font-size: clamp(34px, 3.4vw, 48px);
    font-weight: 600;
    letter-spacing: -2px;
    line-height: 1.15;
  }
  .plan {
    margin: 9px 0 25px;
    color: #c6d8b3;
    font-size: 12px;
  }
  dl {
    margin: 0;
    padding: 21px 0;
    border-top: 1px dashed #73866b7a;
    border-bottom: 1px dashed #73866b7a;
  }
  dl > div {
    display: flex;
    justify-content: space-between;
    gap: 15px;
    font-size: 13px;
    margin-bottom: 13px;
  }
  dt {
    color: #b9c7b1;
  }
  dd {
    margin: 0;
    text-align: right;
    color: #f1f4e9;
  }
  dl .receipt-total {
    margin: 22px 0 0;
    font-size: 12px;
    font-weight: 650;
  }
  .receipt-total dt {
    color: #f1f4e9;
  }
  .receipt-note {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-top: 22px;
    font-size: 13px;
    line-height: 1.7;
    color: #c1cdb8;
  }
  .receipt-note svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: #d8e8b6;
  }
  .other-invoices {
    padding: 12px;
    margin: 15px 0 0;
    border-radius: 9px;
    background: #ffffff0c;
    color: #e6dabc;
    font-size: 13px;
    line-height: 1.6;
  }
  .receipt-bottom {
    display: flex;
    justify-content: center;
    gap: 15px;
    align-items: center;
    margin: 30px 0 0;
    font-size: 12px;
    color: #a2b398;
  }
  .receipt-bottom span {
    height: 1px;
    width: 27px;
    background: #81947865;
  }
  @media (max-width: 760px) {
    padding: 20px;
    .receipt-top {
      margin-bottom: 14px;
    }
    .receipt-icon {
      width: 34px;
      height: 34px;
    }
    h2 {
      margin-bottom: 5px;
    }
    .plan {
      margin: 6px 0 16px;
    }
    dl > div {
      display: block;
      margin-bottom: 0;
    }
    dd {
      margin-top: 5px;
      text-align: left;
    }
    dl .receipt-total {
      display: none;
    }
    .receipt-note {
      display: none;
    }
    dl {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 14px 0 0;
      border-bottom: 0;
    }
    .amount {
      font-size: 36px;
    }
    .receipt-bottom {
      display: none;
    }
  }
`;

export const PaymentCard = styled.section`
  min-width: 0;
  padding: 30px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: #fffefb;
  box-shadow: 0 8px 24px #263e2705;
  .payment-heading {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .pix-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: #eff3e5;
    color: #637b42;
    flex-shrink: 0;
  }
  h2 {
    margin: 0 0 5px;
    font-size: 20px;
    letter-spacing: -0.5px;
    font-weight: 650;
  }
  .payment-heading p {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.6;
  }
  .step {
    margin-left: auto;
    font-size: 13px;
    font-weight: 750;
    color: #8b9a7b;
    white-space: nowrap;
  }
  .step span {
    font-weight: 400;
    color: #b8c3ad;
  }
  .expiry {
    margin: 0 0 24px;
    padding: 11px 15px;
    background: #f6f7f0;
    border-radius: 8px;
    color: #7a856e;
    font-size: 12px;
    line-height: 1.6;
    text-align: center;
  }
  @media (max-width: 1000px) {
    padding: 24px;
  }
  @media (max-width: 760px) {
    padding: 22px;
  }
  @media (max-width: 350px) {
    padding: 18px;
    .step {
      display: none;
    }
  }
`;

export const PixGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(170px, 0.85fr) minmax(0, 1fr);
  gap: 27px;
  align-items: center;
  padding: 30px 0 24px;
  .qr-column {
    text-align: center;
    min-width: 0;
  }
  .qr {
    width: fit-content;
    max-width: 100%;
    padding: 15px;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 12px;
    margin: auto;
  }
  .qr svg {
    display: block;
    width: 100%;
    height: auto;
    max-width: 204px;
  }
  .qr-column > small {
    display: block;
    margin-top: 11px;
    font-size: 9px;
    line-height: 1.6;
    color: #8a947f;
  }
  .mini-label {
    font-size: 8px;
    font-weight: 750;
    color: #83916e;
    letter-spacing: 1.25px;
    line-height: 1.6;
  }
  h3 {
    margin: 9px 0 12px;
    font-size: 23px;
    font-weight: 650;
    letter-spacing: -0.8px;
  }
  p {
    margin: 0 0 18px;
    font-size: 13px;
    line-height: 1.8;
    color: var(--muted);
  }
  p strong {
    font-weight: 600;
    color: #4f6251;
  }
  button {
    width: 100%;
  }
  .copy-feedback {
    display: block;
    min-height: 18px;
    margin: 8px 0 0;
    color: #5f7b47;
    font-size: 12px;
    line-height: 1.5;
  }
  summary {
    width: fit-content;
    font-size: 12px;
    color: #7b8771;
    cursor: pointer;
    padding: 9px 0;
  }
  textarea {
    display: block;
    width: 100%;
    resize: vertical;
    min-height: 72px;
    padding: 9px;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: #fbfcf7;
    color: #4f6150;
    font-size: 13px;
    word-break: break-all;
  }
  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
    gap: 24px;
    .copy-column {
      max-width: 380px;
      width: 100%;
      margin: auto;
    }
  }
  @media (max-width: 760px) and (min-width: 560px) {
    grid-template-columns: minmax(170px, 0.85fr) minmax(0, 1fr);
  }
  @media (max-width: 559px) {
    .copy-column {
      grid-row: 1;
    }
    padding-top: 22px;
  }
`;

export const Primary = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 46px;
  padding: 12px 18px;
  border: 1px solid #233f32;
  border-radius: 10px;
  background: #233f32;
  color: #f7f9f0;
  font-size: 12px;
  font-weight: 650;
  transition: background 0.18s;
  &:hover:not(:disabled) {
    background: #34573e;
  }
`;

export const Generate = styled.div`
  display: flex;
  align-items: center;
  gap: 27px;
  padding: 42px 0;
  min-height: 282px;
  .qr-placeholder {
    position: relative;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 140px;
    height: 150px;
    border: 1px dashed #cdd6bf;
    border-radius: 15px;
    background: #f4f6ec;
    color: #99ab86;
  }
  .qr-placeholder > span {
    position: absolute;
    bottom: 30px;
    right: 29px;
    display: grid;
    place-items: center;
    width: 25px;
    height: 25px;
    border: 3px solid #f4f6ec;
    border-radius: 50%;
    color: #fff;
    background: #789664;
  }
  h3 {
    margin: 0 0 12px;
    font-size: 23px;
    letter-spacing: -0.7px;
    font-weight: 650;
  }
  p {
    margin: 0 0 20px;
    font-size: 12px;
    line-height: 1.8;
    color: var(--muted);
  }
  @media (max-width: 1080px) {
    flex-direction: column;
    text-align: center;
    padding: 28px 0;
    min-height: 0;
    .qr-placeholder {
      width: 110px;
      height: 110px;
    }
    .qr-placeholder > span {
      bottom: 20px;
      right: 20px;
    }
  }
`;

export const Confirmation = styled.div`
  padding-top: 22px;
  border-top: 1px solid var(--line);
  display: grid;
  gap: 19px;
  > div {
    display: flex;
    align-items: center;
    gap: 11px;
  }
  .confirm-icon {
    width: 37px;
    height: 37px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: #76985d;
    background: #f1f5e9;
    flex-shrink: 0;
  }
  strong {
    display: block;
    font-size: 12px;
    font-weight: 700;
  }
  small {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.65;
    color: var(--muted);
  }
  button {
    min-height: 44px;
    display: flex;
    gap: 8px;
    justify-content: center;
    align-items: center;
    padding: 10px 16px;
    border: 1px solid var(--line);
    border-radius: 9px;
    background: #fffefb;
    color: #596b4f;
    font-size: 13px;
    font-weight: 650;
  }
  button:hover:not(:disabled) {
    background: #f5f7ee;
  }
`;

export const Feedback = styled.div<{ $tone: 'info' | 'success' | 'error' }>`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 18px;
  padding: 12px;
  border-radius: 9px;
  background: ${({ $tone }) => ($tone === 'error' ? '#fff0e9' : '#f0f5e9')};
  color: ${({ $tone }) => ($tone === 'error' ? '#9d4f30' : '#597349')};
  font-size: 13px;
  line-height: 1.7;
  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
`;

export const State = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64px 24px;
  min-height: 320px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: #fffefb;
  text-align: center;
  > svg {
    width: 30px;
    height: 30px;
    color: #8aa370;
  }
  h2 {
    margin: 21px 0 11px;
    font-size: 23px;
    letter-spacing: -0.6px;
  }
  p {
    margin: 0 0 24px;
    max-width: 480px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.8;
  }
`;

export const Footer = styled.footer`
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 26px;
  color: #809071;
  font-size: 12px;
  line-height: 1.7;
  > svg {
    flex-shrink: 0;
  }
  .signature {
    margin-left: auto;
    font-size: 8px;
    letter-spacing: 1.6px;
    white-space: nowrap;
    padding-left: 20px;
  }
  @media (max-width: 760px) {
    align-items: flex-start;
    padding: 20px 4px;
    .signature {
      display: none;
    }
  }
`;
