import styled from 'styled-components';

export const AddressGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  @media (max-width: 650px) {
    grid-template-columns: 1fr;
  }
`;
export const AddressCard = styled.article`
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 18px;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  gap: 13px;
  align-items: start;
  i {
    width: 44px;
    height: 44px;
    border-radius: 7px;
    background: #e9eeea;
    color: var(--forest);
    display: grid;
    place-items: center;
    font-style: normal;
  }
  div {
    display: grid;
    gap: 5px;
  }
  span {
    color: var(--muted);
    font-size: 12px;
  }
  small {
    color: #43853e;
    font-weight: 700;
  }
  button {
    min-height: 34px;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0 9px;
    background: #fff;
    color: var(--p);
  }
  button:disabled {
    border-color: #c4d6c8;
    background: #eef6f0;
    color: #316342;
  }
`;
export const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(21, 27, 23, 0.6);
  backdrop-filter: blur(5px);
  display: grid;
  place-items: center;
  padding: 20px;
  @media (max-width: 560px) {
    place-items: end center;
    padding: 12px 0 0;
  }
`;
export const AddressModalCard = styled.form`
  width: min(650px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 24px 70px rgba(18, 28, 22, 0.26);
  color: #191816;
  header {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: start;
  }
  h2 {
    margin: 0 0 5px;
    color: #191816;
    font-size: 25px;
  }
  p {
    margin: 0;
    color: #70675f;
  }
  header button {
    border: 0;
    background: #eef0ec;
    border-radius: 7px;
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
  }
  .default {
    display: flex;
    gap: 9px;
    align-items: center;
    margin-top: 17px;
    font-weight: 700;
    color: #292521;
  }
  .default input {
    accent-color: var(--p, #d64d08);
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 22px;
  }
  footer button {
    border: 1px solid var(--border, #ded5cc);
    border-radius: 7px;
    padding: 12px 18px;
    background: #fff;
    color: #292521;
    font-weight: 700;
  }
  footer .primary {
    border-color: var(--p, #d64d08);
    background: var(--p, #d64d08);
    color: #fff;
    box-shadow: 0 8px 18px rgba(214, 77, 8, 0.2);
  }
  footer .primary:disabled {
    opacity: 0.65;
  }
  @media (max-width: 560px) {
    width: 100%;
    max-height: calc(100dvh - 12px);
    padding: 20px 16px;
    border-radius: 8px 8px 0 0;
    footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
  }
`;
export const AddressFormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 22px;
  label {
    display: grid;
    gap: 7px;
    font-size: 12px;
    font-weight: 700;
    color: #39342f;
  }
  input {
    width: 100%;
    height: 48px;
    border: 1px solid var(--border, #ded5cc);
    border-radius: 7px;
    padding: 0 13px;
    outline: none;
    background: #fcfbf9;
    color: #191816;
    font: inherit;
  }
  input:hover {
    border-color: #bfb4aa;
    background: #fff;
  }
  input:focus {
    border-color: var(--p, #d64d08);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(214, 77, 8, 0.12);
  }
  .street,
  .full {
    grid-column: 1 / -1;
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
    .street,
    .full {
      grid-column: auto;
    }
  }
`;
export const AddressMessage = styled.p`
  margin-top: 12px !important;
  color: var(--p, #d64d08) !important;
  font-size: 12px;
  font-weight: 700;
`;
export const FavoriteGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  @media (max-width: 520px) {
    width: 100%;
    gap: 12px;
  }
`;
export const FavoriteCard = styled.article`
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  min-width: 0;
  position: relative;
  height: 132px;
  display: grid;
  grid-template-columns: 118px minmax(0, 1fr);
  background: #fff;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;
  &:hover {
    border-color: rgba(214, 77, 8, 0.42);
    box-shadow: 0 10px 22px rgba(55, 38, 26, 0.09);
    transform: translateY(-2px);
  }
  > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .heart {
    position: absolute;
    right: 9px;
    top: 9px;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 50%;
    background: #fff;
    color: var(--p);
    box-shadow: 0 4px 12px rgba(32, 37, 33, 0.12);
  }
  div {
    padding: 15px 50px 13px 16px;
    display: flex;
    min-height: 0;
    min-width: 0;
    flex-direction: column;
  }
  h3 {
    margin: 0;
    color: #201c18;
    font-size: 16px;
    line-height: 1.25;
  }
  p {
    margin: 5px 0 10px;
    min-height: 0;
    color: var(--muted);
    font-size: 11px;
    line-height: 1.4;
  }
  footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    position: absolute;
    right: 9px;
    bottom: 13px;
    left: 134px;
    margin: 0;
  }
  footer strong {
    color: var(--p);
    font-size: 15px;
  }
  footer .add-favorite {
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 7px;
    background: var(--p);
    color: #fff;
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    box-shadow: 0 6px 14px rgba(214, 77, 8, 0.2);
  }
  footer .add-favorite svg {
    width: 18px;
  }
  @media (max-width: 520px) {
    width: 100%;
    grid-template-columns: 102px minmax(0, 1fr);
    height: 128px;
    div {
      padding: 13px 43px 12px 14px;
    }
    > img {
      min-height: 128px;
    }
    h3 {
      font-size: 14px;
    }
    p {
      margin: 4px 0 8px;
    }
    footer {
      right: 7px;
      bottom: 12px;
      left: 116px;
    }
    .heart {
      width: 31px;
      height: 31px;
      right: 7px;
      top: 7px;
    }
  }
`;
export const SettingsForm = styled.form`
  max-width: 780px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  padding-top: 20px;
  label {
    display: grid;
    gap: 7px;
    font-size: 12px;
    font-weight: 700;
  }
  input {
    width: 100%;
    height: 48px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0 12px;
    outline: 0;
    background: #fff;
    color: var(--ink);
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease;
  }
  input:hover:not(:disabled) {
    border-color: #aeb4ad;
  }
  input:focus:not(:disabled) {
    border-color: var(--p);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--p) 14%, transparent);
  }
  input:disabled {
    background: #eeefec;
    color: #828781;
  }
  label.full {
    grid-column: 1/-1;
  }
  .password-requirements {
    grid-column: 1/-1;
  }
  .form-message {
    grid-column: 1 / -1;
    padding: 10px 12px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 700;
  }
  .form-message.error {
    border: 1px solid #ecc5c1;
    background: #fff1ef;
    color: var(--danger);
  }
  .form-message.success {
    border: 1px solid #c5d9ca;
    background: #eff7f1;
    color: #316342;
  }
  footer {
    grid-column: 1/-1;
    display: flex;
    justify-content: flex-end;
    border-top: 1px solid var(--border);
    padding-top: 17px;
  }
  button {
    height: 43px;
    border: 0;
    border-radius: 8px;
    background: var(--p);
    color: #fff;
    padding: 0 20px;
    font-weight: 700;
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    label.full,
    .password-requirements,
    footer {
      grid-column: auto;
    }
    footer button {
      width: 100%;
    }
  }
`;
export const SecurityList = styled.div`
  display: grid;
  .security-row {
    min-height: 82px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .security-row > i {
    width: 44px;
    height: 44px;
    border-radius: 7px;
    background: #e9eeea;
    color: var(--forest);
    display: grid;
    place-items: center;
    font-style: normal;
  }
  .security-row div {
    display: grid;
    gap: 5px;
  }
  .security-row span {
    color: var(--muted);
    font-size: 12px;
  }
  .security-row button {
    margin-left: auto;
    border: 1px solid var(--p);
    border-radius: 7px;
    background: #fff;
    color: var(--p);
    height: 38px;
    padding: 0 13px;
    cursor: pointer;
  }
  .security-row button:disabled,
  .security-confirmation button:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
  .security-confirmation {
    display: grid;
    gap: 7px;
    margin: 10px 0 2px 58px;
    padding: 14px;
    border: 1px solid #f0c6c0;
    border-radius: 7px;
    background: #fff7f5;
  }
  .security-confirmation > span,
  .security-error {
    color: var(--muted);
    font-size: 13px;
  }
  .security-confirmation > div {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .security-confirmation button {
    border: 1px solid var(--p);
    border-radius: 6px;
    background: var(--p);
    color: #fff;
    height: 36px;
    padding: 0 12px;
    cursor: pointer;
  }
  .security-confirmation button.secondary {
    background: #fff;
    color: var(--p);
  }
  .security-confirmation button.danger {
    background: #c94040;
    border-color: #c94040;
  }
  .security-error {
    color: #c94040;
    margin: 10px 0;
  }
  @media (max-width: 520px) {
    .security-row {
      display: grid;
      grid-template-columns: 44px 1fr;
      padding: 14px 0;
    }
    .security-row button {
      grid-column: 1/-1;
      width: 100%;
      margin: 0;
    }
    .security-confirmation {
      margin-left: 0;
    }
  }
`;
