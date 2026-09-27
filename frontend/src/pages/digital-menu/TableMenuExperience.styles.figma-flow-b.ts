import styled from 'styled-components';

export const PaymentOptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 620px));
  gap: 44px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

export const PaymentChoiceCard = styled(FlowCard)`
  min-height: 300px;
  padding: 32px;
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  grid-template-rows: auto auto 1fr auto;
  column-gap: 26px;

  .icon {
    grid-row: 1 / span 3;
    width: 64px;
    height: 64px;
    border-radius: 17px;
    background: color-mix(in srgb, var(--primary) 7%, #fff);
    color: var(--primary);
    display: grid;
    place-items: center;
  }

  h2 {
    margin: 0;
    font-size: 26px;
  }

  p {
    margin: 8px 0 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.45;
  }

  small {
    margin-top: 12px;
    color: #777982;
    font-size: 11px;
  }

  button {
    grid-column: 1 / -1;
    align-self: end;
    width: 100%;
    min-height: 52px;
    border-radius: 11px;
    font-weight: 850;
  }

  .primary {
    border: 0;
    background: var(--primary);
    color: #fff;
  }

  .secondary {
    border: 1px solid #dfe0e4;
    background: #fff;
    color: #161616;
  }

  @media (max-width: 759px) {
    min-height: 146px;
    padding: 18px;
    grid-template-columns: 48px minmax(0, 1fr);
    column-gap: 16px;
    border-radius: 14px;

    .icon {
      width: 48px;
      height: 48px;
      border-radius: 13px;
    }

    h2 {
      font-size: 18px;
    }

    p {
      margin-top: 4px;
      font-size: 10px;
    }

    small {
      margin-top: 5px;
      font-size: 9px;
    }

    button {
      min-height: 40px;
      margin-top: 10px;
      font-size: 10px;
    }
  }
`;

export const PaymentSummary = styled(OrderSummaryBar)`
  margin-top: 48px;

  @media (max-width: 759px) {
    margin-top: 18px;
  }
`;

export const PixLayout = styled.div`
  display: grid;
  grid-template-columns: 560px minmax(0, 728px);
  gap: 48px;
  align-items: start;

  @media (max-width: 1050px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

export const PixQrCard = styled(FlowCard)`
  min-height: 760px;
  padding: 28px 32px;
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 12px;
  text-align: center;

  .amount {
    justify-self: start;
    color: #111;
    font-size: 38px;
    font-weight: 900;
  }

  .order {
    justify-self: start;
    color: var(--muted);
    font-size: 11px;
  }

  .qr {
    width: 350px;
    height: 350px;
    margin-top: 42px;
    padding: 24px;
    border: 1px solid #e4e5e8;
    border-radius: 18px;
    background: #fff;
    display: grid;
    place-items: center;
  }

  .qr svg {
    width: 100%;
    height: 100%;
  }

  .pix-badge {
    min-width: 150px;
    min-height: 42px;
    margin-top: 14px;
    border-radius: 999px;
    background: #eefbfa;
    color: #13a99b;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    font-size: 12px;
    font-weight: 850;
  }

  @media (max-width: 759px) {
    min-height: 0;
    padding: 18px 16px;
    border: 0;
    border-radius: 0;

    .amount {
      font-size: 27px;
    }

    .order {
      font-size: 9px;
    }

    .qr {
      width: min(290px, 100%);
      height: auto;
      aspect-ratio: 1;
      margin-top: 14px;
      padding: 18px;
    }

    .pix-badge {
      min-width: 120px;
      min-height: 36px;
      margin-top: 4px;
      font-size: 10px;
    }
  }
`;

export const PixCopyBox = styled.div`
  width: 100%;
  min-height: 74px;
  margin-top: 22px;
  padding: 12px 12px 12px 16px;
  border: 1px solid #e2e3e6;
  border-radius: 12px;
  background: #fafafa;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  text-align: left;

  code {
    min-width: 0;
    max-height: 44px;
    overflow: hidden;
    word-break: break-all;
    color: #53555e;
    font-family: inherit;
    font-size: 10px;
    line-height: 1.35;
  }

  button {
    min-width: 76px;
    min-height: 44px;
    border: 0;
    border-radius: 9px;
    background: var(--primary);
    color: #fff;
    font-size: 10px;
    font-weight: 850;
  }

  @media (max-width: 759px) {
    min-height: 64px;
    margin-top: 8px;

    code {
      font-size: 8px;
    }

    button {
      min-width: 66px;
      min-height: 40px;
    }
  }
`;

export const PixSide = styled.div`
  display: grid;
  gap: 40px;

  @media (max-width: 759px) {
    gap: 16px;
  }
`;

export const PixStatusCard = styled(FlowCard)`
  min-height: 300px;
  padding: 30px;
  display: grid;
  align-content: start;
  gap: 14px;

  h2 {
    margin: 0;
    font-size: 30px;
  }

  p {
    margin: 0;
    max-width: 620px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }

  .timer {
    width: max-content;
    margin-top: 8px;
    padding: 8px 11px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--primary) 7%, #fff);
    color: var(--primary);
    font-size: 11px;
    font-weight: 850;
  }

  .buttons {
    margin-top: auto;
    display: grid;
    gap: 10px;
  }

  @media (max-width: 759px) {
    min-height: 0;
    padding: 18px;
    border-radius: 14px;

    h2 {
      font-size: 21px;
    }

    p {
      font-size: 10px;
    }
  }
`;

export const HowToPayCard = styled(FlowCard)`
  min-height: 420px;
  padding: 28px 30px;

  h2 {
    margin: 0 0 28px;
    font-size: 26px;
  }

  ol {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 28px;
  }

  li {
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 20px;
    align-items: center;
    font-size: 13px;
    font-weight: 750;
  }

  li span {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--primary) 8%, #fff);
    color: var(--primary);
    display: grid;
    place-items: center;
    font-weight: 900;
  }

  @media (max-width: 759px) {
    min-height: 0;
    padding: 18px;
    border-radius: 14px;

    h2 {
      margin-bottom: 16px;
      font-size: 19px;
    }

    ol {
      gap: 14px;
    }

    li {
      grid-template-columns: 28px minmax(0, 1fr);
      gap: 12px;
      font-size: 10px;
    }

    li span {
      width: 28px;
      height: 28px;
    }
  }
`;

export const PaymentSuccessLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 780px) minmax(0, 514px);
  gap: 42px;
  align-items: start;

  @media (max-width: 1050px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

export const PaymentSuccessMain = styled(FlowCard)`
  min-height: 716px;
  padding: 54px 78px;
  display: grid;
  justify-items: center;
  align-content: start;
  text-align: center;

  .ring {
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: #eef9f1;
    display: grid;
    place-items: center;
  }

  .check {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: #28ad54;
    color: #fff;
    display: grid;
    place-items: center;
  }

  h1 {
    margin: 36px 0 0;
    font-size: 30px;
  }

  > p {
    margin: 18px 0 34px;
    color: var(--muted);
    font-size: 13px;
  }

  @media (max-width: 759px) {
    min-height: 0;
    padding: 24px 18px;
    border: 0;

    .ring {
      width: 132px;
      height: 132px;
    }

    .check {
      width: 64px;
      height: 64px;
    }

    h1 {
      margin-top: 24px;
      font-size: 23px;
    }

    > p {
      margin: 12px 0 20px;
      font-size: 10px;
    }
  }
`;

export const PaidReceipt = styled(FlowCard)`
  width: 100%;
  min-height: 144px;
  padding: 20px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  text-align: left;

  .copy {
    display: grid;
    gap: 8px;
  }

  small {
    color: var(--muted);
    font-size: 11px;
  }

  strong {
    font-size: 28px;
  }

  .status {
    min-width: 98px;
    min-height: 34px;
    border-radius: 999px;
    background: #eaf8ee;
    color: #198844;
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 900;
  }

  @media (max-width: 759px) {
    min-height: 122px;
    padding: 16px;

    small {
      font-size: 9px;
    }

    strong {
      font-size: 22px;
    }

    .status {
      min-width: 74px;
      min-height: 30px;
      font-size: 9px;
    }
  }
`;

export const PaymentSuccessSide = styled(FlowCard)`
  min-height: 716px;
  padding: 34px 32px;

  h2 {
    margin: 0 0 14px;
    font-size: 24px;
  }

  > p {
    margin: 0 0 30px;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.5;
  }

  @media (max-width: 759px) {
    min-height: 0;
    padding: 20px 18px;
    border-radius: 14px;

    h2 {
      font-size: 19px;
    }

    > p {
      margin-bottom: 18px;
      font-size: 10px;
    }
  }
`;
