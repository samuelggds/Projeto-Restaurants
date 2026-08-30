import styled from 'styled-components';

export const PaymentMethodGrid = styled.div`
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;
  @media (max-width: 700px) { grid-template-columns: 1fr; }
`;
export const SavedCard = styled.article<{ $default: boolean; $brand?: string }>`
  min-height: 190px; padding: 22px; border-radius: 18px; color: #25221f;
  border: 1px solid ${({ $default }) => ($default ? '#b9b3ad' : '#ded9d4')};
  background: #fbfaf9;
  box-shadow: ${({ $default }) => ($default ? '0 14px 34px rgba(30, 27, 24, .12), 0 0 0 2px rgba(37,34,31,.06)' : '0 10px 26px rgba(30, 27, 24, .08)')};
  display: flex; flex-direction: column; gap: 16px;
  header, footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .saved-card-chip { width: 34px; height: 25px; border: 1px solid #c9c4be; border-radius: 7px; background: #e5e1dc; }
  .saved-card-brand { margin-left: auto; display: flex; align-items: center; gap: 10px; }
  .saved-card-brand img { display: block; width: auto; max-width: 88px; max-height: 32px; object-fit: contain; }
  .saved-card-brand img[data-card-brand='visa'] { max-width: 78px; max-height: 28px; }
  header b { color: #625b55; font-size: 10px; background: #efedea; padding: 5px 8px; border-radius: 999px; }
  > strong { margin-top: auto; font-size: 20px; letter-spacing: .08em; }
  small { color: #77706a; }
  .saved-card-details { display: flex; justify-content: space-between; align-items: end; gap: 12px; }
  .saved-card-details span { min-width: 0; display: grid; gap: 2px; }
  .saved-card-details span:first-child { flex: 1; }
  .saved-card-details b { overflow: hidden; color: #25221f; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
  button { border: 1px solid #ded9d4; background: #fff; color: #3d3834; padding: 8px 10px; border-radius: 9px; cursor: pointer; transition: border-color .18s ease, transform .18s ease; }
  button:hover { border-color: #a9a29b; transform: translateY(-1px); }
  button.danger { margin-left: auto; display: flex; align-items: center; gap: 5px; }
`;
export const PaymentProtection = styled.div`
  margin-top: 18px; padding: 16px 18px; border: 1px solid #cfe4d1; background: #f3fbf4;
  color: #286337; border-radius: 14px; display: flex; align-items: center; gap: 12px;
  span { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
`;

export const PaymentCardPreview = styled.div<{ $brand?: string }>`
  min-height: 154px;
  padding: 18px 20px;
  border: 1px solid #d9d5d1;
  border-radius: 18px;
  background: #f8f7f5;
  color: #24211f;
  box-shadow: 0 14px 32px rgba(30, 27, 24, .1);
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    width: 180px;
    height: 180px;
    right: -78px;
    top: -92px;
    border: 1px solid rgba(37, 34, 31, .07);
    border-radius: 50%;
  }

  header, footer { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .card-brand-logo { display: block; width: auto; max-width: 102px; max-height: 35px; object-fit: contain; }
  .card-brand-logo[data-card-brand='visa'] { max-width: 88px; max-height: 28px; }
  .card-brand-logo[data-card-brand='hipercard'],
  .card-brand-logo[data-card-brand='diners'],
  .card-brand-logo[data-card-brand='discover'] { max-height: 29px; }
  .payment-chip {
    width: 35px; height: 26px; border-radius: 7px;
    border: 1px solid #c9c4be;
    background: #e5e1dc;
  }
  > strong { position: relative; z-index: 1; margin-top: auto; color: #24211f; font-size: 19px; letter-spacing: .1em; }
  footer span { min-width: 0; display: grid; gap: 2px; }
  footer span:first-child { flex: 1; }
  footer small { color: #77706a; font-size: 8px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
  footer b { overflow: hidden; color: #24211f; font-size: 11px; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
`;
export const PaymentModalCard = styled.form`
  width: min(480px, calc(100vw - 28px));
  max-height: calc(100dvh - 28px);
  overflow-y: auto;
  color-scheme: light;
  color: #211c18;
  background: #fff;
  border: 1px solid #e8dfd7;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 28px 80px rgba(20, 14, 10, .25);
  display: grid;
  gap: 16px;
  header { display: flex; align-items: center; justify-content: space-between; }
  header > div { display: flex; gap: 12px; align-items: center; }
  header > div > svg { color: var(--p, #d64d08); }
  header span { display: flex; flex-direction: column; gap: 3px; }
  header b { color: #211c18; font-size: 17px; }
  header small { color: #756b62; }
  header button {
    width: 38px; height: 38px; border: 0; border-radius: 50%;
    display: grid; place-items: center; background: #f6f1ed; color: #211c18; cursor: pointer;
    transition: transform .18s ease, background .18s ease;
  }
  header button:hover { background: #eee5de; transform: rotate(5deg); }
  label { display: grid; gap: 7px; color: #39312c; font-size: 13px; font-weight: 750; }
  input {
    width: 100%; border: 1px solid #d8cec5; border-radius: 11px; padding: 13px;
    background: #fff; color: #211c18; caret-color: var(--p, #d64d08);
    font: inherit; font-weight: 500; outline: none;
  }
  input::placeholder { color: #938980; opacity: 1; }
  input:-webkit-autofill { -webkit-text-fill-color: #211c18; box-shadow: 0 0 0 1000px #fff inset; }
  input:focus { border-color: var(--p, #d64d08); box-shadow: 0 0 0 3px rgba(214, 77, 8, .13); }
  .payment-number-field { position: relative; }
  .payment-number-field input { padding-right: 94px; }
  .card-brand-pill {
    position: absolute; top: 50%; right: 13px; transform: translateY(-50%);
    width: 72px; height: 30px; border: 0; padding: 0;
    background: transparent; display: flex; align-items: center; justify-content: flex-end;
    overflow: hidden; pointer-events: none;
  }
  .card-brand-pill img { display: block; width: auto; max-width: 70px; max-height: 28px; object-fit: contain; }
  .card-brand-pill img[data-card-brand='visa'] { max-width: 54px; max-height: 22px; }
  .card-brand-pill img[data-card-brand='hipercard'],
  .card-brand-pill img[data-card-brand='diners'],
  .card-brand-pill img[data-card-brand='discover'] { max-height: 23px; }
  .mp-secure-field { min-height: 45px; border: 1px solid #d8cec5; border-radius: 11px; padding: 0 12px; background: #fff; }
  .payment-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .payment-security { margin: 0; display: flex; gap: 8px; align-items: center; color: #42664a; font-size: 12px; }
  .payment-provider-note { margin: -7px 0 0; color: #756b62; font-size: 11px; line-height: 1.45; }
  .payment-error { margin: 0; color: #b3261e; font-size: 13px; }
  footer { display: flex; justify-content: flex-end; gap: 10px; }
  footer button { border: 0; border-radius: 10px; background: var(--p, #d64d08); color: #fff; padding: 11px 17px; cursor: pointer; font-weight: 750; }
  footer button.secondary { background: #f2eee9; color: #38302b; }
  footer button:disabled { opacity: .6; cursor: wait; }

  @media (max-width: 520px) {
    padding: 20px;
    border-radius: 18px;
    gap: 14px;
    .payment-row { grid-template-columns: 1fr; }
    footer { display: grid; grid-template-columns: 1fr 1fr; }
    footer button { width: 100%; }
  }
`;
