import styled from 'styled-components';

export const PaymentStage = styled.div`
  display: grid;
  justify-items: center;
  text-align: center;

  h3 {
    margin: 13px 0 0;
    color: #241e19;
    font-size: 19px;
  }

  > p {
    max-width: 470px;
    margin: 7px 0 0;
    color: #756a62;
    font-size: 12px;
    line-height: 1.55;
  }

  .payment-total {
    margin-top: 15px;
    color: #202d34;
    font-size: 30px;
    line-height: 1;
  }

  .status-chip {
    margin-top: 9px;
    padding: 5px 9px;
    border-radius: 999px;
    background: #fff5d9;
    color: #7b5b14;
    font-size: 10px;
    font-weight: 850;
  }

  &[data-status='PAID'] .status-chip {
    background: #eaf7ed;
    color: #26723c;
  }

  &[data-status='FAILED'] .status-chip,
  &[data-status='EXPIRED'] .status-chip,
  &[data-status='CANCELED'] .status-chip {
    background: #f6ece9;
    color: #934137;
  }

  &[data-status='REFUNDED'] .status-chip {
    background: #eef3f7;
    color: #466274;
  }
`;

export const PaymentStatusIcon = styled.span`
  width: 66px;
  height: 66px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #fff5d9;
  color: #896313;

  &[data-status='PAID'] {
    background: #eaf7ed;
    color: #26723c;
  }

  &[data-status='FAILED'],
  &[data-status='EXPIRED'],
  &[data-status='CANCELED'] {
    background: #f8ebe8;
    color: #a33e33;
  }

  &[data-status='REFUNDED'] {
    background: #edf3f7;
    color: #46687a;
  }
`;

export const AmountBreakdown = styled.div`
  width: 100%;
  display: grid;
  gap: 7px;
  margin-top: 18px;
  padding: 12px 0;
  border-top: 1px solid #eee4dc;
  border-bottom: 1px solid #eee4dc;

  span {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: #7b7068;
    font-size: 11px;
  }

  span:last-child {
    color: #342d28;
    font-weight: 800;
  }

  b {
    color: inherit;
  }
`;

export const PixArea = styled.div`
  width: 100%;
  display: grid;
  justify-items: center;
  gap: 10px;
  margin-top: 16px;

  .qr-code {
    width: 208px;
    height: 208px;
    display: grid;
    place-items: center;
    border: 1px solid #e5ddd6;
    border-radius: 8px;
    background: #fff;
  }
`;

export const PaymentCode = styled.code`
  width: 100%;
  max-height: 70px;
  overflow: auto;
  padding: 10px;
  border: 1px solid #e7ddd4;
  border-radius: 8px;
  background: #f8f5f2;
  color: #554c45;
  font-size: 10px;
  line-height: 1.45;
  overflow-wrap: anywhere;
  text-align: left;
`;

export const SecondaryAction = styled.button`
  width: 100%;
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 11px;
  border: 1px solid #d8ccc2;
  border-radius: 11px;
  background: #fff;
  color: #352d27;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 850;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const CheckoutLink = styled.a`
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  border-radius: 11px;
  background: var(--home-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 850;
  text-decoration: none;
`;

export const TextAction = styled.button`
  min-height: 42px;
  margin-top: 6px;
  border: 0;
  background: transparent;
  color: #8d4038;
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  font-weight: 800;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

export const VerificationMessage = styled.p`
  width: 100%;
  margin: 11px 0 0 !important;
  padding: 9px 10px;
  border-radius: 8px;
  background: #fff8e7;
  color: #765817 !important;
  font-size: 11px !important;
`;
