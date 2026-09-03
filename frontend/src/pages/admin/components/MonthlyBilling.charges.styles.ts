import styled, { keyframes } from 'styled-components';

type BillingTone = 'success' | 'warning' | 'danger' | 'neutral';

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const toneColors: Record<BillingTone, { background: string; color: string; border: string }> = {
  success: { background: '#eaf7ef', color: '#247344', border: '#cde9d8' },
  warning: { background: '#fff7e8', color: '#97621d', border: '#f0dfbc' },
  danger: { background: '#fff0ed', color: '#b04438', border: '#f0cbc5' },
  neutral: { background: '#f2f0ed', color: '#625c56', border: '#e4ded8' },
};

export const InvoiceOverview = styled.div`
  display: flex;
  align-items: center;
  padding: 6px;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: #fff;

  > span {
    min-width: 76px;
    display: grid;
    gap: 2px;
    padding: 4px 12px;
    border-right: 1px solid var(--border);
  }

  > span:last-child {
    border-right: 0;
  }

  small {
    color: var(--muted);
    font-size: 8px;
  }

  strong {
    font-size: 16px;
  }
`;

export const ChargeMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 850px) {
    grid-template-columns: 1fr;
  }
`;

export const ChargeMetric = styled.article<{ $tone: BillingTone }>`
  min-width: 0;
  min-height: 100px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 16px;
  border: 1px solid ${({ $tone }) => toneColors[$tone].border};
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 7px 22px rgba(52, 36, 25, 0.045);

  .metric-icon {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: ${({ $tone }) => toneColors[$tone].color};
    background: ${({ $tone }) => toneColors[$tone].background};
  }

  .metric-icon svg {
    width: 19px;
    height: 19px;
  }

  > span:last-child {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  small {
    color: var(--muted);
    font-size: 9px;
    font-weight: 700;
  }

  strong {
    overflow: hidden;
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  em {
    color: ${({ $tone }) => toneColors[$tone].color};
    font-size: 9px;
    font-style: normal;
    font-weight: 750;
  }
`;

export const BillingCard = styled.article`
  position: relative;
  isolation: isolate;
  min-width: 0;
  overflow: hidden;
  display: grid;
  gap: 22px;
  padding: clamp(20px, 3vw, 28px);
  border: 1px solid var(--border);
  border-radius: 22px;
  background: linear-gradient(140deg, #fff 0%, #fffaf5 100%);
  box-shadow: 0 14px 34px rgba(43, 31, 22, 0.07);

  &::after {
    content: '';
    position: absolute;
    z-index: -1;
    width: 220px;
    height: 220px;
    right: -110px;
    top: -130px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--a) 9%, transparent);
  }
`;

export const BillingCardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;

  .label {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: var(--a);
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .label svg {
    width: 15px;
    height: 15px;
  }

  h2 {
    margin: 8px 0 4px;
    font-size: clamp(19px, 2.2vw, 24px);
    letter-spacing: -0.03em;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 11px;
  }

  .cycle {
    min-width: 106px;
    display: grid;
    grid-template-columns: auto auto;
    grid-template-rows: auto auto;
    align-items: baseline;
    justify-content: center;
    column-gap: 5px;
    padding: 12px 14px;
    border-radius: 15px;
    color: #fff;
    background: #211e1b;
    text-align: center;
  }

  .cycle small {
    grid-column: 1 / 3;
    color: #bdb6b0;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .cycle strong {
    margin-top: 2px;
    font-size: 22px;
  }

  .cycle span {
    color: #c6c0bb;
    font-size: 9px;
  }

  @media (max-width: 560px) {
    flex-direction: column;

    .cycle {
      width: 100%;
    }
  }
`;

export const BillingTimeline = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 9px;

  &::before {
    content: '';
    position: absolute;
    left: 9%;
    right: 9%;
    top: 22px;
    height: 2px;
    background: #e6dfd8;
  }

  > div {
    position: relative;
    min-width: 0;
    min-height: 104px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 9px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.91);
    text-align: center;
  }

  .step-icon {
    z-index: 1;
    width: 25px;
    height: 25px;
    flex: 0 0 25px;
    display: grid;
    place-items: center;
    border: 3px solid #fff;
    border-radius: 50%;
    color: #6f6862;
    background: #e8e3df;
  }

  .step-icon svg {
    width: 12px;
    height: 12px;
  }

  .completed .step-icon {
    color: #257244;
    background: #dff3e7;
  }

  .current {
    border-color: #efc9b7;
    background: #fffaf7;
  }

  .current .step-icon {
    color: #fff;
    background: var(--a);
  }

  .grace {
    border-color: #eed9ba;
    background: #fffaf0;
  }

  .grace .step-icon {
    color: #93631f;
    background: #fff0cf;
  }

  small {
    margin-top: 9px;
    color: var(--muted);
    font-size: 8px;
    font-weight: 700;
  }

  strong {
    overflow: hidden;
    max-width: 100%;
    margin-top: 4px;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  em {
    margin-top: 3px;
    color: #987047;
    font-size: 8px;
    font-style: normal;
  }

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    &::before {
      display: none;
    }
  }

  @media (max-width: 440px) {
    grid-template-columns: 1fr;

    > div {
      min-height: 78px;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      grid-template-rows: auto auto auto;
      column-gap: 10px;
      align-items: center;
      text-align: left;
    }

    .step-icon {
      grid-row: 1 / 4;
    }

    small,
    strong,
    em {
      margin-top: 0;
    }
  }
`;

export const BillingPayment = styled.div<{ $available: boolean }>`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 13px;
  align-items: center;
  padding: 16px;
  border: 1px solid ${({ $available }) => ($available ? '#cde7d7' : '#e4ddd6')};
  border-radius: 16px;
  background: ${({ $available }) => ($available ? '#f2faf5' : '#f7f5f2')};

  .payment-icon {
    width: 45px;
    height: 45px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    color: ${({ $available }) => ($available ? '#247344' : '#67605a')};
    background: #fff;
    box-shadow: 0 5px 16px rgba(52, 36, 25, 0.06);
  }

  .payment-icon svg {
    width: 20px;
    height: 20px;
  }

  small {
    color: ${({ $available }) => ($available ? '#247344' : '#77706a')};
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.09em;
  }

  h3 {
    margin: 4px 0 3px;
    font-size: 14px;
  }

  p {
    max-width: 670px;
    margin: 0;
    color: var(--muted);
    font-size: 10px;
    line-height: 1.45;
  }

  button {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 0 16px;
    border: 0;
    border-radius: 11px;
    color: #fff;
    background: ${({ $available }) => ($available ? '#237246' : '#77716b')};
    font-size: 10px;
    font-weight: 850;
    cursor: pointer;
    transition:
      filter 160ms ease,
      transform 160ms ease;
  }

  button svg {
    width: 16px;
    height: 16px;
  }

  button:hover:not(:disabled) {
    filter: brightness(0.92);
    transform: translateY(-1px);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  @media (max-width: 700px) {
    grid-template-columns: auto minmax(0, 1fr);

    button {
      grid-column: 1 / 3;
      width: 100%;
    }
  }
`;

export const HistorySection = styled.section`
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(52, 36, 25, 0.055);
`;

export const HistoryHeader = styled.header`
  min-height: 82px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 17px 20px;
  border-bottom: 1px solid var(--border);
  background: #fdfbf9;

  > div {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .history-icon {
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    color: #5c5650;
    background: #efebe7;
  }

  .history-icon svg {
    width: 17px;
    height: 17px;
  }

  h3 {
    margin: 0 0 3px;
    font-size: 14px;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 9px;
  }

  > strong {
    padding: 7px 10px;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: #706861;
    background: #fff;
    font-size: 9px;
    white-space: nowrap;
  }

  @media (max-width: 520px) {
    align-items: flex-start;

    p {
      display: none;
    }
  }
`;

export const Invoices = styled.div`
  padding: 0 18px;
`;

export const InvoiceRow = styled.article<{ $tone: BillingTone }>`
  min-width: 0;
  min-height: 84px;
  display: grid;
  grid-template-columns: auto minmax(160px, 1fr) auto auto auto;
  gap: 14px;
  align-items: center;
  border-bottom: 1px solid var(--border);

  &:last-child {
    border-bottom: 0;
  }

  .invoice-icon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: ${({ $tone }) => toneColors[$tone].color};
    background: ${({ $tone }) => toneColors[$tone].background};
  }

  .invoice-icon svg {
    width: 17px;
    height: 17px;
  }

  .invoice-copy {
    min-width: 0;
  }

  h3 {
    overflow: hidden;
    margin: 0 0 4px;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    overflow: hidden;
    margin: 0;
    color: var(--muted);
    font-size: 9px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .invoice-value {
    font-size: 12px;
    white-space: nowrap;
  }

  button {
    min-width: 114px;
    min-height: 40px;
    padding: 0 12px;
    border: 0;
    border-radius: 10px;
    color: #fff;
    background: #211e1b;
    font-size: 9px;
    font-weight: 800;
    cursor: pointer;
    transition:
      background 160ms ease,
      transform 160ms ease;
  }

  button:hover:not(:disabled) {
    background: var(--a);
    transform: translateY(-1px);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }

  @media (max-width: 720px) {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 10px;
    padding: 14px 0;

    .invoice-value {
      align-self: start;
      padding-top: 2px;
    }

    > button,
    > span:last-child {
      grid-column: 2 / 4;
      justify-self: stretch;
    }

    button {
      width: 100%;
    }
  }

  @media (max-width: 420px) {
    grid-template-columns: auto minmax(0, 1fr);

    .invoice-value,
    > span:last-child,
    > button {
      grid-column: 2;
      justify-self: start;
    }

    button {
      width: 100%;
      justify-self: stretch;
    }
  }
`;

export const InvoiceStatus = styled.span<{ $status: string }>`
  min-height: 27px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 9px;
  border-radius: 999px;
  color: ${({ $status }) => toneColors[$status === 'PAGO' ? 'success' : $status === 'PENDENTE' ? 'warning' : 'danger'].color};
  background: ${({ $status }) => toneColors[$status === 'PAGO' ? 'success' : $status === 'PENDENTE' ? 'warning' : 'danger'].background};
  font-size: 8px;
  font-weight: 900;
  text-transform: uppercase;
  white-space: nowrap;
`;

export const PaidMark = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #28763d;

  svg {
    width: 21px;
    height: 21px;
  }
`;

export const InvoiceUnavailable = styled.span`
  color: var(--muted);
  font-size: 9px;
  font-weight: 700;
  white-space: nowrap;
`;

export const Empty = styled.div`
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px;
  color: var(--muted);
  text-align: center;

  > span {
    width: 45px;
    height: 45px;
    display: grid;
    place-items: center;
    margin-bottom: 11px;
    border-radius: 14px;
    color: #77706a;
    background: #f1eeeb;
  }

  svg {
    width: 20px;
    height: 20px;
  }

  strong {
    color: #342f2b;
    font-size: 13px;
  }

  p {
    margin: 5px 0 0;
    font-size: 10px;
  }
`;

export const Loading = styled.div`
  min-height: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--border);
  border-radius: 22px;
  color: var(--muted);
  background: #fff;

  .spinner {
    width: 31px;
    height: 31px;
    margin-bottom: 6px;
    border: 3px solid #ede7e2;
    border-top-color: var(--a);
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
  }

  strong {
    color: #302b27;
    font-size: 13px;
  }

  small {
    font-size: 10px;
  }
`;

export const PixBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(20, 17, 15, 0.62);
  backdrop-filter: blur(5px);
`;

export const PixModal = styled.div`
  position: relative;
  width: min(440px, 100%);
  max-height: calc(100dvh - 40px);
  overflow: auto;
  padding: 27px;
  border: 1px solid #ede4dd;
  border-radius: 23px;
  background: #fff;
  box-shadow: 0 30px 90px rgba(20, 14, 10, 0.34);
  text-align: center;

  .close {
    position: absolute;
    right: 14px;
    top: 14px;
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 50%;
    color: #4b4540;
    background: #f3efeb;
    cursor: pointer;
  }

  .close svg {
    width: 18px;
    height: 18px;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 9px;
    border-radius: 999px;
    color: #167b68;
    background: #ecf8f4;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .brand svg {
    width: 14px;
    height: 14px;
  }

  h2 {
    margin: 15px 0 6px;
    font-size: 23px;
    letter-spacing: -0.03em;
  }

  > p {
    margin: 0 auto;
    max-width: 340px;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.5;
  }

  .qr-frame {
    width: 222px;
    height: 222px;
    display: grid;
    place-items: center;
    margin: 18px auto 13px;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 8px 24px rgba(35, 28, 22, 0.07);
  }

  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }

  .amount-label {
    color: #8b8179;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.1em;
  }

  .amount {
    margin: 4px 0 14px;
    color: var(--a);
    font-size: 26px;
    font-weight: 900;
    letter-spacing: -0.04em;
  }

  .copy {
    width: 100%;
    min-height: 47px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 12px;
    color: #fff;
    background: #191816;
    font-weight: 850;
    cursor: pointer;
    transition:
      background 160ms ease,
      transform 160ms ease;
  }

  .copy svg {
    width: 16px;
    height: 16px;
  }

  .copy:hover {
    background: var(--a);
    transform: translateY(-1px);
  }

  .copy-feedback {
    display: block;
    margin-top: 9px;
    font-size: 9px;
    line-height: 1.4;
  }

  .copy-feedback.copied {
    color: #247344;
  }

  .copy-feedback.error {
    color: #aa4137;
  }

  .expires {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 6px;
    margin-top: 11px;
    color: var(--muted);
    font-size: 9px;
    line-height: 1.4;
  }

  .expires svg {
    width: 13px;
    height: 13px;
    flex: 0 0 13px;
  }

  @media (max-width: 480px) {
    padding: 24px 18px 20px;

    .qr-frame {
      width: min(210px, 70vw);
      height: min(210px, 70vw);
    }
  }
`;
