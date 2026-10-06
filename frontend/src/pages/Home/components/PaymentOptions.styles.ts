import styled from 'styled-components';
import {
  PAYMENT_CARD_OPEN_DURATION_MS,
  paymentCardFormExpand,
  paymentReducedMotion,
} from '../../../components/payment/paymentMotion';

export const PaymentIntro = styled.div`
  display: grid;
  gap: 4px;
  margin: 6px 0 10px;

  strong {
    color: var(--home-text);
    font-size: 15px;
    font-weight: 900;
  }

  span {
    color: #747b77;
    font-size: 11px;
    line-height: 1.45;
  }
`;

export const PaymentMethodHeading = styled.div`
  display: grid;
  gap: 3px;
  margin-bottom: 10px;

  b {
    color: #292521;
    font-size: 13px;
    font-weight: 900;
  }

  small {
    color: #7b756f;
    font-size: 10px;
    line-height: 1.4;
  }
`;

export const PaymentModeHint = styled.p`
  margin: 2px 0 0;
  color: #7b827e;
  font-size: 10px;
  line-height: 1.45;
`;

export const SecurePaymentNote = styled.div`
  min-height: 42px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #dce7ef;
  border-radius: 10px;
  background: #f6fafc;
  color: #496172;
  font-size: 10px;
  line-height: 1.4;
  text-align: center;

  svg {
    flex: 0 0 auto;
    color: #2f69a3;
  }
`;

export const OpenFinanceBankPicker = styled.label`
  display: grid;
  gap: 7px;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #dce7ef;
  border-radius: 12px;
  background: #f7fafc;
  color: #364a58;
  font-size: 11px;
  font-weight: 800;

  span {
    display: block;
  }

  small {
    color: #74818a;
    font-size: 10px;
    font-weight: 500;
    line-height: 1.45;
  }

  select {
    width: 100%;
    min-height: 44px;
    padding: 0 11px;
    border: 1px solid #cfdbe3;
    border-radius: 10px;
    background: #fff;
    color: #283740;
    font: inherit;
    font-size: 12px;
  }
`;

export const OpenFinanceNotice = styled.p`
  margin: 8px 0 0;
  color: #62737d;
  font-size: 10px;
  line-height: 1.45;
`;
export const FigmaPaymentMethods = styled.section`
  display: grid;
  gap: 12px;
`;

export const FigmaPaymentOption = styled.button<{ $active: boolean; $disabled: boolean }>`
  width: 100%;
  min-height: 50px;
  padding: 12px 14px;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 1px solid ${({ $active }) => ($active ? 'var(--checkout-primary)' : '#efece6')};
  border-radius: 14px;
  background: ${({ $disabled }) => ($disabled ? '#fbfaf8' : '#fff')};
  color: ${({ $disabled }) => ($disabled ? '#8e8a84' : '#1f1e1a')};
  font: inherit;
  text-align: left;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.78 : 1)};
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;

  ${paymentReducedMotion}
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease,
    background-color 180ms ease;

  ${paymentReducedMotion}

  .method-icon {
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: #f0f0ee;
  }

  .method-icon.pix {
    background: #fdf2ec;
    color: var(--checkout-primary);
  }

  .method-icon svg {
    width: 14px;
    height: 14px;
  }

  .method-copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .method-name {
    min-width: 0;
    font-size: 14px;
    font-weight: 600;
  }

  .unavailable,
  .method-detail {
    color: #9a958f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 500;
  }

  .method-detail {
    color: #6f6a64;
  }

  .recommended {
    padding: 4px 8px;
    border-radius: 6px;
    background: #268c43;
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .radio {
    width: 16px;
    height: 16px;
    display: grid;
    place-items: center;
    border: 2px solid ${({ $active }) =>
      $active ? 'var(--checkout-primary)' : '#efece6'};
    border-radius: 50%;
  }

  .radio i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $active }) =>
      $active ? 'var(--checkout-primary)' : 'transparent'};
  }

  &:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(31, 30, 26, 0.06);
  }

  &:not(:disabled):active {
    transform: scale(0.992);
  }

  &:disabled {
    pointer-events: none;
  }

  @media (max-width: 760px) {
    min-height: 50px;
    padding: 10px 12px;
    border-radius: 12px;

    .method-name {
      font-size: 13px;
    }

    .unavailable {
      font-size: 9px;
      line-height: 12px;
    }
  }
`;

export const FigmaCardSection = styled.section<{ $active: boolean; $disabled: boolean }>`
  padding: 14px;
  display: grid;
  gap: 12px;
  border: ${({ $active }) => ($active ? '2px' : '1px')} solid
    ${({ $active }) => ($active ? 'var(--checkout-primary)' : '#efece6')};
  border-radius: 14px;
  background: ${({ $disabled }) => ($disabled ? '#fbfaf8' : '#fff')};
  opacity: ${({ $disabled }) => ($disabled ? 0.78 : 1)};

  .card-heading {
    width: 100%;
    padding: 0;
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) 16px;
    align-items: center;
    gap: 10px;
    border: 0;
    background: transparent;
    color: ${({ $disabled }) => ($disabled ? '#8e8a84' : '#1f1e1a')};
    font: inherit;
    text-align: left;
    cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  }

  .card-heading {
    transition: transform 160ms ease;

    ${paymentReducedMotion}
  }

  .card-heading:not(:disabled):active {
    transform: scale(0.994);
  }

  .card-heading:disabled {
    pointer-events: none;
  }

  .method-icon {
    width: 24px;
    height: 24px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: #f0f0ee;
  }

  .method-icon svg {
    width: 14px;
    height: 14px;
  }

  .method-copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .method-name {
    font-size: 14px;
    font-weight: 600;
  }

  .unavailable,
  .method-detail {
    color: #9a958f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 500;
  }

  .method-detail {
    color: #6f6a64;
  }

  .radio {
    width: 16px;
    height: 16px;
    display: grid;
    place-items: center;
    border: 2px solid ${({ $active }) =>
      $active ? 'var(--checkout-primary)' : '#efece6'};
    border-radius: 50%;
  }

  .radio i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $active }) =>
      $active ? 'var(--checkout-primary)' : 'transparent'};
  }

  @media (max-width: 760px) {
    padding: 12px;
    border-radius: 12px;

    .method-name {
      font-size: 13px;
    }

    .unavailable {
      font-size: 9px;
      line-height: 12px;
    }
  }
`;

export const FigmaGuestCardForm = styled.div`
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
  transform-origin: top;
  animation: ${paymentCardFormExpand} ${PAYMENT_CARD_OPEN_DURATION_MS}ms
    cubic-bezier(0.22, 0.78, 0.24, 1) both;

  ${paymentReducedMotion}

  > section {
    min-height: 0;
    overflow: hidden;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
  }
  > section > header, > section .security { display: none; }
  > section label > span { color: #72706b; font-size: 11px; font-weight: 500; }
  > section input, > section .secure-field { min-height: 44px; border-color: #efece6; border-radius: 8px; background: #f7f5f0; }
`;

