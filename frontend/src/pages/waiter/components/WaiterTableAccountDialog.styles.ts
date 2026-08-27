import styled from 'styled-components';

export const PaymentBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 140;
  display: flex;
  justify-content: flex-end;
  background: rgba(16, 22, 27, 0.56);
  backdrop-filter: blur(4px);
`;
export const PaymentDialog = styled.section`
  width: min(760px, 100%);
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  background: #fffdfb;
  box-shadow: -22px 0 55px rgba(20, 26, 31, 0.2);
  animation: waiter-account-enter 180ms ease-out;

  @keyframes waiter-account-enter {
    from {
      transform: translateX(28px);
      opacity: 0.7;
    }
  }

  @media (max-width: 680px) {
    width: 100%;
  }
`;
export const PaymentHeader = styled.header`
  min-height: 104px;
  padding: 20px 22px;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 14px;
  color: #fff;
  background: linear-gradient(115deg, #182c37 0%, #5a3d35 100%);

  > .icon {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.1);
  }
  > .icon svg {
    width: 23px;
  }
  small {
    display: block;
    margin-bottom: 3px;
    color: #ffb08c;
    font-size: 9px;
    font-weight: 850;
    letter-spacing: 0.11em;
  }
  h2 {
    margin: 0;
    font-size: clamp(20px, 3vw, 26px);
  }
  p {
    margin: 4px 0 0;
    color: rgba(255, 255, 255, 0.78);
    font-size: 12px;
  }
  > button {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 11px;
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
    cursor: pointer;
  }

  @media (max-width: 520px) {
    min-height: 92px;
    padding: 16px;
    grid-template-columns: 40px minmax(0, 1fr) 38px;
    gap: 10px;
    > .icon,
    > button {
      width: 40px;
      height: 40px;
    }
    p {
      display: none;
    }
  }
`;
export const PaymentDialogBody = styled.div`
  min-height: 0;
  overflow-y: auto;
  padding: 18px 22px 30px;
  display: grid;
  align-content: start;
  gap: 14px;

  @media (max-width: 520px) {
    padding: 14px 12px 24px;
  }
`;
export const AccountGuidance = styled.div`
  padding: 14px;
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 11px;
  border: 1px solid #d8e6eb;
  border-radius: 13px;
  color: #28434f;
  background: #f4f9fb;
  > svg {
    width: 22px;
    margin-top: 1px;
    color: #397185;
  }
  b {
    font-size: 13px;
  }
  p {
    margin: 4px 0 0;
    color: #536b75;
    font-size: 12px;
    line-height: 1.55;
  }
  p strong {
    color: #28434f;
  }
`;
export const AccountLoading = styled.div`
  min-height: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: var(--muted);
  font-size: 13px;
  svg {
    width: 19px;
    animation: spin 0.8s linear infinite;
  }
`;
export const AccountSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  > span {
    min-width: 0;
    padding: 15px;
    display: grid;
    gap: 5px;
    border: 1px solid var(--border);
    border-radius: 13px;
    background: #fff;
  }
  small {
    color: var(--muted);
    font-size: 10px;
  }
  b {
    font-size: clamp(17px, 2.6vw, 22px);
  }
  .paid {
    border-color: #bde0c5;
    color: #18743a;
    background: #f3fbf5;
  }
  .remaining {
    border-color: #efc8b5;
    color: #bc4d24;
    background: #fff7f2;
  }

  @media (max-width: 520px) {
    grid-template-columns: 1fr 1fr;
    > span:first-child {
      grid-column: 1 / -1;
    }
  }
`;
export const ProcessingNotice = styled.div`
  padding: 11px 13px;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid #ead9a8;
  border-radius: 11px;
  color: #755b18;
  background: #fff9e8;
  font-size: 11px;
  line-height: 1.45;
  svg {
    width: 17px;
    flex: 0 0 auto;
  }
`;
export const AccountPayments = styled.section`
  padding: 16px;
  display: grid;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fff;
  > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 2px;
  }
  h3 {
    margin: 0;
    font-size: 16px;
  }
  header p {
    margin: 3px 0 0;
    color: var(--muted);
    font-size: 11px;
  }
  header > button {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border: 1px solid var(--border);
    border-radius: 9px;
    color: #45525a;
    background: #fff;
    cursor: pointer;
  }
  header > button:disabled {
    opacity: 0.55;
  }
  header svg {
    width: 17px;
  }

  @media (max-width: 520px) {
    padding: 13px 11px;
  }
`;
export const PaymentRow = styled.article<{
  $status: 'RESERVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'CANCELED' | 'REFUNDED';
}>`
  padding: 13px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 1px solid ${(p) => (p.$status === 'PAID' ? '#bde0c5' : '#eadfd7')};
  border-radius: 12px;
  background: ${(p) => (p.$status === 'PAID' ? '#f5fbf6' : '#fffdfa')};
  .method-icon {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    color: ${(p) => (p.$status === 'PAID' ? '#218044' : '#bc512b')};
    background: ${(p) => (p.$status === 'PAID' ? '#e4f5e8' : '#fff0e9')};
  }
  .method-icon svg {
    width: 19px;
  }
  .payment-info {
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  .payment-info b {
    font-size: 13px;
  }
  .payment-info small {
    color: var(--muted);
    font-size: 10px;
    line-height: 1.35;
  }
  .payment-value {
    display: grid;
    justify-items: end;
    gap: 3px;
  }
  .payment-value b {
    font-size: 14px;
  }
  .payment-value em {
    padding: 3px 6px;
    border-radius: 999px;
    color: ${(p) => (p.$status === 'PAID' ? '#18743a' : '#8b5c32')};
    background: ${(p) => (p.$status === 'PAID' ? '#e0f3e5' : '#f7eee6')};
    font-size: 8px;
    font-style: normal;
    font-weight: 800;
    text-transform: uppercase;
  }

  @media (max-width: 520px) {
    grid-template-columns: 34px minmax(0, 1fr) auto;
    padding: 11px;
    .method-icon {
      width: 34px;
      height: 34px;
    }
  }
`;
export const ConfirmReceivedButton = styled.button`
  grid-column: 2 / -1;
  min-height: 39px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #90c89e;
  border-radius: 9px;
  color: #176c33;
  background: #edf9f0;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  svg {
    width: 16px;
  }
  &:disabled {
    cursor: wait;
    opacity: 0.6;
  }
`;
export const AccountEmpty = styled.p`
  margin: 0;
  padding: 26px 12px;
  border: 1px dashed var(--border);
  border-radius: 11px;
  color: var(--muted);
  text-align: center;
  font-size: 12px;
`;
export const Error = styled.p`
  margin: 5px 0 0;
  border-radius: 8px;
  padding: 8px 10px;
  color: #a12b21;
  background: #fff0ee;
  font-size: 11px;
  line-height: 1.4;
`;
