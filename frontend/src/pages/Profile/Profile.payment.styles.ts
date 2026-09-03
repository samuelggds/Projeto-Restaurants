import styled from 'styled-components';

export const PaymentMethodGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  @media (max-width: 700px) {
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

export const PaymentCardPreview = styled.div<{ $brand?: string }>`
  min-height: 154px;
  padding: 18px 20px;
  border: 1px solid #d9d5d1;
  border-radius: 8px;
  background: #294237;
  color: #fff;
  box-shadow: 0 14px 32px rgba(32, 53, 44, 0.16);
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
  position: relative;

  header,
  footer {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .card-brand-logo {
    display: block;
    width: auto;
    max-width: 102px;
    max-height: 35px;
    object-fit: contain;
  }
  .card-brand-logo[data-card-brand='visa'] {
    max-width: 88px;
    max-height: 28px;
  }
  .card-brand-logo[data-card-brand='hipercard'],
  .card-brand-logo[data-card-brand='diners'],
  .card-brand-logo[data-card-brand='discover'] {
    max-height: 29px;
  }
  .payment-chip {
    width: 35px;
    height: 26px;
    border-radius: 7px;
    border: 1px solid #c9c4be;
    background: #e5e1dc;
  }
  > strong {
    position: relative;
    z-index: 1;
    margin-top: auto;
    color: #fff;
    font-size: 19px;
    letter-spacing: 0;
  }
  footer span {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  footer span:first-child {
    flex: 1;
  }
  footer small {
    color: rgba(255, 255, 255, 0.62);
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }
  footer b {
    overflow: hidden;
    color: #fff;
    font-size: 11px;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }
`;
export const PaymentModalCard = styled.form`
  width: min(480px, calc(100vw - 28px));
  max-height: calc(100dvh - 28px);
  overflow-y: auto;
  color-scheme: light;
  color: #211c18;
  background: #fff;
  border: 1px solid #e8dfd7;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 28px 80px rgba(20, 14, 10, 0.25);
  display: grid;
  gap: 16px;
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  header > div {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  header > div > svg {
    color: var(--p, #d64d08);
  }
  header span {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  header b {
    color: #211c18;
    font-size: 17px;
  }
  header small {
    color: #756b62;
  }
  header button {
    width: 38px;
    height: 38px;
    border: 0;
    border-radius: 7px;
    display: grid;
    place-items: center;
    background: #f6f1ed;
    color: #211c18;
    cursor: pointer;
    transition:
      transform 0.18s ease,
      background 0.18s ease;
  }
  header button:hover {
    background: #eee5de;
    transform: rotate(5deg);
  }
  label {
    display: grid;
    gap: 7px;
    color: #39312c;
    font-size: 13px;
    font-weight: 750;
  }
  input {
    width: 100%;
    border: 1px solid #d8cec5;
    border-radius: 7px;
    padding: 13px;
    background: #fff;
    color: #211c18;
    caret-color: var(--p, #d64d08);
    font: inherit;
    font-weight: 500;
    outline: none;
  }
  input::placeholder {
    color: #938980;
    opacity: 1;
  }
  input:-webkit-autofill {
    -webkit-text-fill-color: #211c18;
    box-shadow: 0 0 0 1000px #fff inset;
  }
  input:focus {
    border-color: var(--p, #d64d08);
    box-shadow: 0 0 0 3px rgba(214, 77, 8, 0.13);
  }
  .payment-number-field {
    position: relative;
  }
  .payment-number-field input {
    padding-right: 94px;
  }
  .card-brand-pill {
    position: absolute;
    top: 50%;
    right: 13px;
    transform: translateY(-50%);
    width: 72px;
    height: 30px;
    border: 0;
    padding: 0;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    overflow: hidden;
    pointer-events: none;
  }
  .card-brand-pill img {
    display: block;
    width: auto;
    max-width: 70px;
    max-height: 28px;
    object-fit: contain;
  }
  .card-brand-pill img[data-card-brand='visa'] {
    max-width: 54px;
    max-height: 22px;
  }
  .card-brand-pill img[data-card-brand='hipercard'],
  .card-brand-pill img[data-card-brand='diners'],
  .card-brand-pill img[data-card-brand='discover'] {
    max-height: 23px;
  }
  .mp-secure-field {
    min-height: 45px;
    border: 1px solid #d8cec5;
    border-radius: 7px;
    padding: 0 12px;
    background: #fff;
  }
  .payment-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .payment-security {
    margin: 0;
    display: flex;
    gap: 8px;
    align-items: center;
    color: #42664a;
    font-size: 12px;
  }
  .payment-provider-note {
    margin: -7px 0 0;
    color: #756b62;
    font-size: 11px;
    line-height: 1.45;
  }
  .payment-error {
    margin: 0;
    color: #b3261e;
    font-size: 13px;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
  footer button {
    border: 0;
    border-radius: 7px;
    background: var(--p, #d64d08);
    color: #fff;
    padding: 11px 17px;
    cursor: pointer;
    font-weight: 750;
  }
  footer button.secondary {
    background: #f2eee9;
    color: #38302b;
  }
  footer button:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  @media (max-width: 520px) {
    padding: 20px;
    border-radius: 8px 8px 0 0;
    gap: 14px;
    .payment-row {
      grid-template-columns: 1fr;
    }
    footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    footer button {
      width: 100%;
    }
  }
`;
