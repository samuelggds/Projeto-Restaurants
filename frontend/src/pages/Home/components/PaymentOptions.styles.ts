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

export const AccountShortcut = styled.a`
  width: 100%;
  min-height: 62px;
  padding: 11px 12px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  border: 1px solid #e2ddd8;
  border-radius: 12px;
  background: #fff;
  color: var(--home-text);
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(20, 20, 20, 0.035);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--home-primary) 45%, #e2ddd8);
    box-shadow: 0 9px 24px rgba(33, 27, 22, 0.08);
  }

  .shortcut-icon {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: color-mix(in srgb, var(--home-primary) 10%, #fff);
    color: var(--home-primary);
  }

  .shortcut-copy {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  .shortcut-copy b {
    color: #27231f;
    font-size: 13px;
    font-weight: 900;
  }

  .shortcut-copy small {
    overflow: hidden;
    color: #7b746e;
    font-size: 10px;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .shortcut-arrow {
    color: #978f88;
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

  .unavailable {
    color: #9a958f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 500;
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

  .unavailable {
    color: #9a958f;
    font-size: 10px;
    line-height: 13px;
    font-weight: 500;
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

export const FigmaSavedCards = styled.div`
  display: grid; gap: 8px;
  > button { min-height: 58px; padding: 10px; display: grid; grid-template-columns: 22px minmax(0, 1fr) 16px; align-items: center; gap: 10px; border: 1px solid #efece6; border-radius: 10px; background: #fff; color: #1f1e1a; font: inherit; text-align: left; cursor: pointer; }
  > button.selected { border-color: var(--checkout-primary); background: #fff7f2; }
  > button > svg { width: 17px; color: #6f765f; }
  > button > span:nth-child(2) { min-width: 0; display: grid; gap: 2px; }
  b { font-size: 13px; text-transform: capitalize; }
  small { color: #72706b; font-size: 11px; }
  .radio { width: 16px; height: 16px; display: grid; place-items: center; border: 2px solid #efece6; border-radius: 50%; }
  button.selected .radio { border-color: var(--checkout-primary); }
  button.selected .radio i { width: 8px; height: 8px; border-radius: 50%; background: var(--checkout-primary); }
  .add-card { width: max-content; display: inline-flex; align-items: center; gap: 6px; color: var(--checkout-primary); font-size: 12px; font-weight: 700; text-decoration: none; }
  .add-card svg { width: 15px; }
`;

export const FigmaEmptyCards = styled.div`
  padding: 8px 0 2px; display: grid; justify-items: center; gap: 8px; text-align: center;
  b { font-size: 14px; }
  span { color: #72706b; font-size: 12px; }
  a { margin-top: 2px; padding: 8px 16px; border: 1.5px solid var(--checkout-primary); border-radius: 8px; color: var(--checkout-primary); font-size: 13px; font-weight: 600; text-decoration: none; }
`;

export const FigmaPaymentStatus = styled.div`
  padding: 10px 12px; border-radius: 9px; background: #fafaf8; color: #72706b; font-size: 12px;
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

export const FigmaSavedCardSecurity = styled.div`
  display: grid;
  grid-template-rows: auto;
  min-width: 0;
  overflow: visible;
  transform-origin: top;
  animation: ${paymentCardFormExpand} ${PAYMENT_CARD_OPEN_DURATION_MS}ms
    cubic-bezier(0.22, 0.78, 0.24, 1) both;

  ${paymentReducedMotion}

  > section {
    min-width: 0;
    min-height: 0;
    overflow: visible;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
  }

  > section > header,
  > section .security {
    display: none;
  }

  > section label {
    min-width: 0;
  }

  > section label > span {
    font-size: 11px;
  }

  > section input,
  > section .secure-field {
    width: 100%;
    min-width: 0;
    min-height: 44px;
    box-sizing: border-box;
  }

  @media (max-width: 760px) {
    padding-bottom: 2px;

    > section {
      padding-bottom: 2px;
    }
  }
`;

