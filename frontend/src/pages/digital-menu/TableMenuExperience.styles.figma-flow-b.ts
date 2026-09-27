import styled from 'styled-components';
import { FlowCard, OrderSummaryBar } from './TableMenuExperience.styles.figma-flow-a';

export const PaymentCard = styled(FlowCard)`
  width: min(720px, 100%);
  margin: 155px auto 0;
  padding: 40px;
  display: grid;
  gap: 32px;
  box-shadow: 0 10px 14px rgba(0, 0, 0, 0.04);

  @media (max-width: 759px) {
    margin-top: 0;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
    gap: 20px;
  }
`;

export const PaymentOptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;

  @media (max-width: 759px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

export const PaymentChoiceCard = styled(FlowCard)`
  min-height: 260px;
  padding: 24px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  grid-template-rows: auto auto 1fr auto;
  column-gap: 14px;
  border-width: 1px;

  &:first-child {
    border-width: 2px;
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 8%, #fff);
  }

  .icon {
    grid-row: 1 / span 3;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: #fff;
    color: var(--primary);
    display: grid;
    place-items: center;
  }

  h2 {
    margin: 2px 0 0;
    color: var(--text);
    font-size: 18px;
    line-height: 22px;
    font-weight: 700;
  }

  p {
    margin: 8px 0 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 18px;
  }

  small {
    margin-top: 10px;
    color: var(--primary);
    font-size: 11px;
    font-weight: 700;
  }

  button {
    grid-column: 1 / -1;
    align-self: end;
    width: 100%;
    min-height: 44px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
  }

  .primary {
    border: 0;
    background: var(--primary);
    color: #fff;
  }

  .secondary {
    border: 1px solid var(--line);
    background: #fff;
    color: var(--text);
  }

  @media (max-width: 759px) {
    min-height: 0;
    padding: 20px;
    border-radius: 20px;
    grid-template-columns: 32px minmax(0, 1fr);

    .icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
    }

    .icon svg {
      width: 18px;
      height: 18px;
    }

    h2 {
      font-size: 16px;
    }

    p {
      font-size: 12px;
    }

    small {
      font-size: 10px;
    }

    button {
      min-height: 40px;
      margin-top: 12px;
      font-size: 13px;
    }
  }
`;

export const PaymentSummary = styled(OrderSummaryBar)`
  margin-top: 0;
  background: #fff;

  .label {
    display: grid;
    gap: 2px;
  }

  .amount {
    color: var(--text);
    font-size: 18px;
  }
`;

export const PixLayout = styled.div`
  width: min(640px, 100%);
  margin: 85px auto 0;

  @media (max-width: 759px) {
    margin-top: 0;
  }
`;

export const PixQrCard = styled(FlowCard)`
  padding: 40px;
  display: grid;
  justify-items: center;
  gap: 20px;
  text-align: center;
  box-shadow: 0 10px 14px rgba(0, 0, 0, 0.04);

  .pix-label {
    color: var(--muted);
    font-size: 13px;
    line-height: 16px;
    font-weight: 700;
  }

  .amount {
    margin-top: -10px;
    color: var(--primary);
    font-size: 36px;
    line-height: 44px;
    font-weight: 500;
  }

  .order {
    margin-top: -14px;
    color: var(--muted);
    font-size: 13px;
    line-height: 16px;
  }

  .qr {
    width: 208px;
    height: 208px;
    padding: 24px;
    border: 1px solid var(--line);
    border-radius: 20px;
    background: #fff;
    display: grid;
    place-items: center;
  }

  .qr svg {
    width: 160px;
    height: 160px;
  }

  .instructions {
    max-width: 520px;
    margin: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 18px;
  }

  > button {
    width: 100%;
  }

  @media (max-width: 759px) {
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
    gap: 16px;

    .pix-label {
      font-size: 14px;
    }

    .amount {
      font-size: 32px;
      line-height: 38px;
    }

    .order {
      font-size: 11px;
    }

    .qr {
      width: 192px;
      height: 192px;
      padding: 16px;
    }

    .instructions {
      max-width: 300px;
      font-size: 12px;
    }
  }
`;

export const PixCopyBox = styled.div`
  width: 100%;
  min-height: 48px;
  padding: 8px 8px 8px 12px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--background);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  text-align: left;

  code {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
    font-family: inherit;
    font-size: 12px;
  }

  button {
    min-width: 76px;
    min-height: 32px;
    padding: 0 14px;
    border: 0;
    border-radius: 8px;
    background: color-mix(in srgb, var(--primary) 10%, #fff);
    color: var(--primary);
    font-size: 12px;
    font-weight: 700;
  }

  @media (max-width: 759px) {
    background: #fff;

    code {
      font-size: 11px;
    }
  }
`;

export const PixSide = styled.div`
  display: contents;
`;

export const PixStatusCard = styled.div`
  width: 100%;
  min-height: 64px;
  padding: 14px 16px;
  border-radius: 14px;
  background: #fef3c7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;

  h2 {
    margin: 0;
    color: var(--text);
    font-size: 14px;
    line-height: 18px;
    font-weight: 700;
  }

  p {
    margin: 2px 0 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 15px;
  }

  .timer {
    flex: 0 0 auto;
    color: var(--text);
    font-size: 12px;
    font-weight: 700;
  }
`;

export const HowToPayCard = styled(FlowCard)`
  display: none;
`;

export const PaymentSuccessLayout = styled.div`
  width: min(600px, 100%);
  margin: 70px auto 0;

  @media (max-width: 759px) {
    margin-top: 0;
  }
`;

export const PaymentSuccessMain = styled(FlowCard)`
  padding: 40px;
  display: grid;
  justify-items: stretch;
  gap: 20px;
  text-align: center;
  box-shadow: 0 10px 14px rgba(0, 0, 0, 0.04);

  .ring {
    width: 80px;
    height: 80px;
    margin: 0 auto;
    border-radius: 40px;
    background: #ecfdf5;
    display: grid;
    place-items: center;
  }

  .check {
    width: 48px;
    height: 48px;
    border-radius: 24px;
    background: #10b981;
    color: #fff;
    display: grid;
    place-items: center;
  }

  h1 {
    margin: 0;
    color: var(--text);
    font-size: 32px;
    line-height: 38px;
    font-weight: 500;
  }

  > p {
    margin: -10px 0 0;
    color: var(--muted);
    font-size: 14px;
    line-height: 20px;
  }

  .prep-banner {
    width: 100%;
    padding: 16px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--primary) 8%, #fff);
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--primary);
    text-align: left;
  }

  .prep-banner span {
    display: grid;
    gap: 2px;
  }

  .prep-banner b {
    color: var(--text);
    font-size: 14px;
  }

  .prep-banner small {
    color: var(--muted);
    font-size: 11px;
  }

  @media (max-width: 759px) {
    padding: 4px 0 0;
    border: 0;
    background: transparent;
    box-shadow: none;

    h1 {
      font-size: 28px;
      line-height: 34px;
    }

    > p {
      font-size: 13px;
    }
  }
`;

export const PaidReceipt = styled(FlowCard)`
  width: 100%;
  padding: 24px;
  border-radius: 20px;
  background: var(--background);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 16px;
  text-align: left;

  .copy {
    display: grid;
    gap: 8px;
  }

  small {
    color: var(--muted);
    font-size: 13px;
  }

  strong {
    color: var(--text);
    font-size: 28px;
    font-weight: 500;
  }

  .status {
    min-width: 58px;
    min-height: 26px;
    padding: 0 10px;
    border-radius: 6px;
    background: #ecfdf5;
    color: #10b981;
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 700;
  }

  @media (max-width: 759px) {
    padding: 20px;
    background: #fff;
  }
`;

export const PaymentSuccessSide = styled(FlowCard)`
  display: none;
`;
