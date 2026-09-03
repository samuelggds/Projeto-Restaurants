import styled from 'styled-components';

// ── Cart drawer
export const CartOverlay = styled.button<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(15, 12, 10, 0.6);
  backdrop-filter: blur(6px);
  border: 0;
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition:
    opacity 0.28s,
    visibility 0.28s;
  will-change: ${({ $open }) => ($open ? 'opacity' : 'auto')};
  cursor: default;
`;

export const CartDrawer = styled.aside<{ $open: boolean }>`
  position: fixed;
  right: 0;
  top: 0;
  z-index: 70;
  width: min(520px, 100%);
  height: 100dvh;
  background: #f4f6f3;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow-x: hidden;
  overflow-y: hidden;
  overscroll-behavior: contain;
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  pointer-events: ${({ $open }) => ($open ? 'auto' : 'none')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transform: translate3d(${({ $open }) => ($open ? '0' : '100%')}, 0, 0);
  transition:
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease,
    visibility 0s linear ${({ $open }) => ($open ? '0s' : '0.32s')};
  box-shadow: ${({ $open }) => ($open ? '-24px 0 80px rgba(20, 31, 26, 0.24)' : 'none')};
  will-change: ${({ $open }) => ($open ? 'transform, opacity' : 'auto')};
  contain: layout paint;
`;

export const CartHead = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--home-border);
  background: #fff;
  color: var(--home-text);

  .cart-heading {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .cart-mark {
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 7px;
    color: #fff;
    background: var(--home-primary);

    svg {
      width: 20px;
      height: 20px;
    }
  }

  .cart-title {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  h2 {
    margin: 0;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0;
    color: var(--home-text);
  }

  small {
    color: var(--home-primary);
    font-size: 9px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .cart-count {
    padding: 6px 9px;
    border-radius: 6px;
    color: #53605a;
    background: #eef2ee;
    font-size: 11px;
    font-weight: 800;
  }

  > button {
    width: 36px;
    height: 36px;
    border: 1px solid var(--home-border);
    border-radius: 50%;
    background: #f7f9f7;
    color: var(--home-text);
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 0.18s;
    svg {
      width: 18px;
      height: 18px;
    }
    &:hover {
      background: #edf1ed;
    }
  }

  @media (max-width: 420px) {
    padding: 14px 12px;

    .cart-mark {
      width: 38px;
      height: 38px;
    }

    h2 {
      font-size: 20px;
    }
  }
`;

export const CartBody = styled.div`
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--home-border) transparent;
`;

export const CartItems = styled.div`
  width: 100%;
  padding: 18px 20px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--home-border);
    border-radius: 2px;
  }
`;

export const CartItemRow = styled.div`
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: 14px;
  padding: 10px;
  background: #fff;
  border: 1px solid var(--home-border);
  border-radius: 8px;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 16px rgba(70, 45, 20, 0.08);
  }

  img {
    width: 76px;
    height: 76px;
    border-radius: 6px;
    object-fit: cover;
  }
`;

export const CartItemInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  strong {
    font-size: 14px;
    font-weight: 700;
    display: block;
    color: #191816;
    line-height: 1.3;
  }

  .item-price {
    color: #d64d08;
    font-weight: 800;
    font-size: 15px;
  }
  .item-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 10px;
  }

  .item-options {
    display: grid;
    gap: 2px;
    margin-top: 8px;
  }

  .item-options small,
  .item-observation {
    color: #756d65;
    font-size: 11px;
    line-height: 1.4;
  }

  .item-options b {
    color: #4e4741;
  }

  .item-observation {
    margin-top: 6px;
    padding: 6px 8px;
    border-radius: 7px;
    background: #f7f3ee;
  }
`;

export const CartQty = styled.div`
  display: flex;
  align-items: center;
  gap: 0;
  background: #f5f0ea;
  border-radius: 8px;
  width: fit-content;
  overflow: hidden;

  button {
    width: 30px;
    height: 30px;
    border: none;
    background: transparent;
    cursor: pointer;
    display: grid;
    place-items: center;
    color: #191816;
    transition: background 0.15s;
    &:hover {
      background: var(--home-border);
    }
    svg {
      width: 15px;
      height: 15px;
    }
  }

  b {
    font-size: 14px;
    font-weight: 700;
    min-width: 28px;
    text-align: center;
    color: #191816;
  }
`;

export const CartEmpty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: min(470px, 62dvh);
  gap: 12px;
  color: var(--home-muted);
  text-align: center;

  .icon {
    width: 58px;
    height: 58px;
    background: color-mix(in srgb, var(--home-primary) 9%, #fff);
    border-radius: 8px;
    display: grid;
    place-items: center;
    color: var(--home-primary);

    svg {
      width: 25px;
      height: 25px;
    }
  }

  strong {
    font-size: 16px;
    font-weight: 700;
    color: #191816;
  }

  p {
    font-size: 13px;
    margin: 0;
    max-width: 240px;
    line-height: 1.5;
  }

  > button {
    min-height: 42px;
    margin-top: 4px;
    padding: 0 15px;
    border: 1px solid var(--home-border);
    border-radius: 7px;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--home-text);
    background: #fff;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;

    svg {
      width: 16px;
      height: 16px;
    }
  }
`;

export const CartFoot = styled.div`
  width: 100%;
  padding: 16px 20px max(18px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--home-border);
  background: #fff;
  box-shadow: 0 -12px 30px rgba(20, 31, 26, 0.07);

  .cart-checkout-area {
    width: 100%;
  }

  &:empty {
    display: none;
  }
`;

export const CartOptions = styled.div`
  width: 100%;
  padding: 8px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  > * {
    flex: 0 0 auto;
    width: 100%;
  }
`;

export const CartSummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--home-muted);
  margin-bottom: 6px;
`;

export const CartTotal = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 800;
  font-size: 20px;
  color: var(--home-text);
  margin: 10px 0 14px;
  padding-top: 12px;
  border-top: 2px solid var(--home-border);

  span:last-child {
    color: #d64d08;
  }
`;

/* ── Order type toggle (Entrega / Retirada) */
export const CartSection = styled.div`
  padding: 14px 20px;
  border-top: 1px solid var(--home-border);

  label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--home-muted);
    margin-bottom: 10px;
  }
`;

export const OrderTypeToggle = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  background: #f5f0ea;
  border-radius: 12px;
  padding: 3px;
  gap: 3px;
`;

export const OrderTypeBtn = styled.button<{ $active: boolean }>`
  padding: 10px 8px;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition:
    background-color 0.18s,
    color 0.18s,
    box-shadow 0.18s;

  background: ${({ $active }) => ($active ? '#fff' : 'transparent')};
  color: ${({ $active }) => ($active ? '#d64d08' : '#6f6a63')};
  box-shadow: ${({ $active }) => ($active ? '0 2px 8px rgba(70,45,20,0.10)' : 'none')};
`;

export const CartCheckout = styled.button`
  width: 100%;
  height: 56px;
  background: var(--home-primary);
  color: #fff;
  border: 0;
  border-radius: 7px;
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  > svg {
    width: 19px;
    height: 19px;
    flex: 0 0 auto;
  }

  > span {
    min-width: 0;
    flex: 1;
    text-align: center;
  }

  .checkout-arrow {
    width: 18px;
  }

  transition:
    transform 0.18s,
    background 0.18s;

  .btn-price {
    margin-left: auto;
    font-size: 14px;
    background: rgba(255, 255, 255, 0.15);
    padding: 4px 10px;
    border-radius: 6px;
  }

  &:hover:not(:disabled) {
    filter: brightness(0.95);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* ── Delivery/pickup + payment section inside cart */
export const CartSectionLabel = styled.p`
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #9a9591;
  margin: 0 0 8px;
`;

export const DeliveryToggle = styled.div<{ $single?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $single }) => ($single ? '1fr' : '1fr 1fr')};
  background: #f0ece6;
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
  margin-bottom: 10px;
`;

export const CheckoutUnavailable = styled.p`
  margin: 0 0 10px;
  padding: 12px 14px;
  border: 1px solid #efc9b8;
  border-radius: 12px;
  background: #fff7f2;
  color: #8a3d20;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.45;
`;

export const DeliveryBtn = styled.button<{ $active: boolean }>`
  padding: 11px 8px;
  border: none;
  border-radius: 9px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  transition:
    background-color 0.2s,
    color 0.2s,
    box-shadow 0.2s;
  background: ${({ $active }) => ($active ? '#fff' : 'transparent')};
  color: ${({ $active }) => ($active ? '#d64d08' : '#6f6a63')};
  box-shadow: ${({ $active }) => ($active ? '0 2px 10px rgba(70,45,20,.12)' : 'none')};

  .btn-icon {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background: ${({ $active }) => ($active ? '#fdeee7' : '#e8e3dc')};
    display: grid;
    place-items: center;
    font-size: 14px;
    flex-shrink: 0;
    transition: background 0.2s;
  }
`;

export const PaymentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  background: #fffdf9;

  @media (max-width: 820px) {
    flex: 0 0 auto;
    height: auto;
    max-height: 34dvh;
    padding: 14px 16px 10px;
  }
  margin-bottom: 10px;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;
export const SavedPaymentChooser = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 10px;
  > button,
  > a {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: #fff;
    color: var(--text);
    padding: 11px 13px;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    cursor: pointer;
    text-decoration: none;
    transition:
      border-color 0.2s,
      transform 0.2s,
      background 0.2s,
      box-shadow 0.2s;
  }
  > button:hover,
  > a:hover {
    transform: translateY(-1px);
    border-color: var(--primary);
  }
  > button.active {
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 7%, white);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 12%, transparent);
  }
  span {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  small {
    color: var(--muted);
  }
  > a.add {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    min-height: 66px;
    padding: 11px 12px;
    border-color: #e6ded7;
    border-radius: 14px;
    background: #fbfaf8;
    color: #27231f;
    box-shadow: 0 6px 18px rgba(38, 31, 25, 0.05);
  }
  > a.add:hover {
    border-color: color-mix(in srgb, var(--primary) 45%, #e6ded7);
    background: #fff;
    box-shadow: 0 10px 24px rgba(38, 31, 25, 0.09);
  }
  .add-icon {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--primary) 10%, #f5f1ed);
    color: var(--primary);
  }
  .add-copy {
    min-width: 0;
    gap: 3px;
  }
  .add-copy b {
    color: #27231f;
    font-size: 12px;
    line-height: 1.25;
  }
  .add-copy small {
    overflow: hidden;
    font-size: 10px;
    line-height: 1.35;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .add-arrow {
    color: #9b938c;
    transition:
      color 0.2s,
      transform 0.2s;
  }
  > a.add:hover .add-arrow {
    color: var(--primary);
    transform: translateX(2px);
  }
`;
export const CardAccountNotice = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 10px 12px;
  margin: 4px 0 12px;
  padding: 14px;
  border: 1px solid #d9d0ff;
  border-radius: 14px;
  background: linear-gradient(135deg, #f8f6ff, #fff);
  color: #292342;
  animation: cardNoticeIn 0.28s ease-out both;
  @keyframes cardNoticeIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .notice-icon {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    display: grid;
    place-items: center;
    background: #ebe7ff;
    color: #5842c3;
  }
  .notice-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .notice-copy b {
    font-size: 13px;
  }
  .notice-copy span {
    color: #686178;
    font-size: 11px;
    line-height: 1.45;
  }
  .notice-actions {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  button {
    min-height: 38px;
    border: 1px solid #d9d0ff;
    border-radius: 10px;
    background: #fff;
    color: #4a3a9b;
    font: inherit;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    transition:
      transform 0.18s,
      box-shadow 0.18s;
  }
  button:hover {
    transform: translateY(-1px);
    box-shadow: 0 5px 14px rgba(73, 53, 159, 0.12);
  }
  button.primary {
    border-color: #5943c7;
    background: #5943c7;
    color: #fff;
  }
  button.guest {
    grid-column: 1 / -1;
    border-color: #cdc4f5;
    background: #f1eeff;
    color: #392985;
  }
  @media (max-width: 360px) {
    .notice-actions {
      grid-template-columns: 1fr;
    }
  }
`;

export const GuestCheckoutForm = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
  padding: 14px;
  border: 1px solid #e7ddd2;
  border-radius: 14px;
  background: #fcfaf7;
  animation: guestCheckoutIn 0.25s ease-out both;
  @keyframes guestCheckoutIn {
    from {
      opacity: 0;
      transform: translateY(4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .guest-heading,
  .full {
    grid-column: 1 / -1;
  }
  .guest-heading {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .guest-heading b {
    font-size: 13px;
    color: #2d2925;
  }
  .guest-heading span,
  small {
    color: #756e67;
    font-size: 10px;
    line-height: 1.4;
  }
  label {
    display: grid;
    gap: 5px;
    min-width: 0;
  }
  label > span {
    color: #514b44;
    font-size: 11px;
    font-weight: 750;
  }
  input {
    width: 100%;
    height: 40px;
    padding: 0 11px;
    border: 1px solid #dcd2c7;
    border-radius: 10px;
    background: #fff;
    color: #241f1b;
    font: inherit;
    font-size: 12px;
    outline: none;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }
  input:focus {
    border-color: var(--primary, #d65a38);
    box-shadow: 0 0 0 3px rgba(214, 90, 56, 0.1);
  }
  @media (max-width: 390px) {
    grid-template-columns: 1fr;
    .guest-heading,
    .full {
      grid-column: 1;
    }
  }
`;

export const AddressForm = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px;
  gap: 8px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid #e9dfd5;
  border-radius: 14px;
  background: #fcfaf7;

  .cep-field,
  .full {
    grid-column: 1 / -1;
  }
  .street {
    grid-column: 1;
  }

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
    .cep-field,
    .full,
    .street {
      grid-column: 1;
    }
  }
`;

export const AddressField = styled.label`
  display: grid;
  gap: 5px;
  min-width: 0;

  > span {
    color: #514b44;
    font-size: 11px;
    font-weight: 750;
  }
  i {
    color: #8b837a;
    font-style: normal;
    font-weight: 500;
  }
  input,
  select {
    width: 100%;
    height: 39px;
    padding: 0 12px;
    border: 1px solid #dcd2c7;
    border-radius: 10px;
    background: #fff;
    color: #191816;
    font: inherit;
    font-size: 13px;
    outline: none;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
  }
  input:focus,
  select:focus {
    border-color: var(--primary, #d64d08);
    box-shadow: 0 0 0 3px rgba(214, 77, 8, 0.1);
  }
  small {
    font-size: 10px;
  }
  small.loading {
    color: #7c5b20;
  }
  small.success {
    color: #18773a;
  }
  small.error {
    color: #b42318;
  }
`;

export const PaymentCard = styled.button<{ $active: boolean; $color: string }>`
  padding: 13px 11px;
  border-radius: 12px;
  border: 2px solid ${({ $active, $color }) => ($active ? $color : '#e4ddd5')};
  background: ${({ $active, $color }) => ($active ? `${$color}12` : '#fff')};
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition:
    background-color 0.2s,
    border-color 0.2s,
    box-shadow 0.2s,
    transform 0.2s;

  &:hover {
    border-color: ${({ $color }) => $color};
    box-shadow: 0 4px 14px ${({ $color }) => $color}22;
  }

  .pm-badge {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: ${({ $active, $color }) => ($active ? $color : '#f0ece6')};
    display: grid;
    place-items: center;
    margin-bottom: 8px;
    font-size: 18px;
    transition: background 0.2s;
  }

  .pm-name {
    display: block;
    font-weight: 800;
    font-size: 13px;
    color: #191816;
    margin-bottom: 2px;
  }

  .pm-desc {
    display: block;
    font-size: 10px;
    color: #6f6a63;
    line-height: 1.3;
  }
`;

/* ── Card payment modal */
export const CardModalBg = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(15, 12, 10, 0.65);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 20px;
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition:
    opacity 0.25s,
    visibility 0.25s;
`;

export const CardModal = styled.div<{ $open: boolean }>`
  width: min(440px, 100%);
  background: #fff;
  border-radius: 20px;
  padding: clamp(24px, 4vw, 36px);
  box-shadow: 0 28px 80px rgba(15, 12, 10, 0.3);
  transform: translateY(${({ $open }) => ($open ? '0' : '16px')});
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);

  h3 {
    margin: 0 0 20px;
    font-size: 18px;
    font-weight: 800;
    color: #191816;
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

export const CardModalClose = styled.button`
  margin-left: auto;
  width: 32px;
  height: 32px;
  border: 1px solid var(--home-border);
  border-radius: 8px;
  background: #f5f0ea;
  font-size: 18px;
  cursor: pointer;
  display: grid;
  place-items: center;
  color: var(--home-muted);
`;

export const CardPreview = styled.div`
  height: 140px;
  border-radius: 14px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 18px 20px;
  color: white;
  position: relative;
  overflow: hidden;
  margin-bottom: 20px;

  &::before {
    content: '';
    position: absolute;
    top: -40px;
    right: -40px;
    width: 160px;
    height: 160px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
  }

  .card-number {
    font-size: 16px;
    letter-spacing: 0.2em;
    font-weight: 600;
    margin-top: 28px;
    opacity: 0.9;
  }

  .card-row {
    display: flex;
    justify-content: space-between;
    margin-top: 16px;
    font-size: 11px;
    opacity: 0.7;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .card-name {
    font-size: 13px;
    font-weight: 700;
    opacity: 0.9;
  }
  .card-expiry {
    font-size: 13px;
    font-weight: 700;
    opacity: 0.9;
  }
`;

export const CardField = styled.label`
  display: grid;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  color: var(--home-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 12px;

  input {
    width: 100%;
    height: 48px;
    border: 1.5px solid var(--home-border);
    border-radius: 10px;
    padding: 0 14px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    color: #191816;
    outline: none;
    transition: border-color 0.18s;
    background: #fff;

    &:focus {
      border-color: #d64d08;
      box-shadow: 0 0 0 3px rgba(214, 77, 8, 0.08);
    }
    &::placeholder {
      font-weight: 400;
      color: #bdb4aa;
    }
  }
`;

export const CardFieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

export const CardSubmit = styled.button`
  width: 100%;
  height: 52px;
  background: #191816;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
  font-family: inherit;
  margin-top: 4px;
  transition:
    background 0.18s,
    transform 0.18s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    background: #d64d08;
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    transform: none;
  }
`;

/* ── Login nudge bar (shown when user is not authenticated) */
export const LoginNudge = styled.div`
  position: fixed;
  top: 98px;
  right: 24px;
  z-index: 52;
  width: min(500px, calc(100vw - 48px));
  min-height: 58px;
  padding: 9px 10px 9px 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: #17211d;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 11px;
  box-shadow: 0 16px 38px rgba(18, 27, 23, 0.24);

  > svg {
    width: 19px;
    height: 19px;
    flex: 0 0 auto;
    color: color-mix(in srgb, var(--home-primary) 62%, white);
  }

  > span {
    min-width: 0;
    flex: 1;
    display: grid;
    gap: 2px;
  }

  strong,
  small {
    display: block;
    line-height: 1.25;
  }

  strong {
    font-size: 12px;
    font-weight: 850;
  }

  small {
    color: rgba(255, 255, 255, 0.67);
    font-size: 10px;
  }

  button {
    flex: 0 0 auto;
    height: 36px;
    border-radius: 6px;
    font-family: inherit;
    cursor: pointer;
    transition:
      filter 0.18s,
      transform 0.18s;
    &:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
  }

  .nudge-login {
    padding: 0 15px;
    border: none;
    background: var(--home-primary);
    color: #fff;
    font-size: 12px;
    font-weight: 800;
  }

  .nudge-dismiss {
    width: 36px;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.2);
    display: grid;
    place-items: center;
    background: transparent;
    color: rgba(255, 255, 255, 0.72);

    svg {
      width: 16px;
      height: 16px;
    }
  }

  @media (max-width: 1040px) {
    top: 122px;
    right: 16px;
  }

  @media (max-width: 620px) {
    top: auto;
    right: 10px;
    bottom: 10px;
    width: calc(100vw - 20px);
    min-height: 54px;
    padding: 8px;
    gap: 8px;

    small {
      display: none;
    }

    .nudge-login {
      padding-inline: 12px;
    }
  }
`;

/* ── In-app notification banner */
export const NotifStack = styled.div`
  position: fixed;
  top: 88px;
  left: 50%;
  z-index: 45;
  width: min(520px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  gap: 7px;
  transform: translateX(-50%);
  pointer-events: none;

  @media (max-width: 1040px) {
    top: 120px;
  }

  @media (max-width: 760px) {
    top: 116px;
    width: calc(100vw - 24px);
  }

  @media (max-width: 360px) {
    top: 104px;
    width: calc(100vw - 20px);
  }
`;

export const NotifItem = styled.div<{
  $type: 'success' | 'error' | 'info' | 'warning';
  $visible: boolean;
}>`
  pointer-events: auto;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 8px 9px;
  background: #fff;
  border: 1px solid
    ${({ $type }) =>
      $type === 'success'
        ? '#b9d9bd'
        : $type === 'error'
          ? '#efb7ae'
          : $type === 'warning'
            ? '#ead3a2'
            : '#b7d2d7'};
  border-left: 4px solid
    ${({ $type }) =>
      $type === 'success'
        ? '#368044'
        : $type === 'error'
          ? '#bf4637'
          : $type === 'warning'
            ? '#b77917'
            : '#357584'};
  border-radius: 8px;
  box-shadow: 0 10px 26px rgba(31, 27, 23, 0.15);

  transform: translateY(${({ $visible }) => ($visible ? '0' : '-10px')})
    scale(${({ $visible }) => ($visible ? '1' : '0.98')});
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition:
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.2s ease;

  .notif-icon {
    width: 36px;
    height: 36px;
    border-radius: 7px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    color: ${({ $type }) =>
      $type === 'success'
        ? '#287139'
        : $type === 'error'
          ? '#ae3c30'
          : $type === 'warning'
            ? '#98600d'
            : '#2d6c79'};
    background: ${({ $type }) =>
      $type === 'success'
        ? '#edf7ee'
        : $type === 'error'
          ? '#fff0ed'
          : $type === 'warning'
            ? '#fff7e7'
            : '#edf5f7'};
  }

  .notif-icon svg {
    width: 19px;
    height: 19px;
  }

  .notif-body {
    min-width: 0;
    display: grid;
    gap: 1px;
  }

  .notif-type {
    color: ${({ $type }) =>
      $type === 'success'
        ? '#287139'
        : $type === 'error'
          ? '#ae3c30'
          : $type === 'warning'
            ? '#98600d'
            : '#2d6c79'};
    font-size: 9px;
    font-weight: 850;
    line-height: 1.15;
    text-transform: uppercase;
  }

  .notif-title {
    overflow: hidden;
    color: #191816;
    font-size: 12px;
    font-weight: 800;
    line-height: 1.2;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .notif-msg {
    display: -webkit-box;
    overflow: hidden;
    color: #6f6a63;
    font-size: 10px;
    line-height: 1.3;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .notif-actions {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .notif-action {
    min-height: 30px;
    padding: 0 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    border: 1px solid color-mix(in srgb, var(--home-primary) 32%, #e7e2dc);
    border-radius: 6px;
    background: color-mix(in srgb, var(--home-primary) 8%, #fff);
    color: color-mix(in srgb, var(--home-primary) 88%, #241e1a);
    font: inherit;
    font-size: 10px;
    font-weight: 800;
    white-space: nowrap;
    cursor: pointer;

    svg {
      width: 13px;
      height: 13px;
    }

    &:hover {
      border-color: color-mix(in srgb, var(--home-primary) 52%, #e7e2dc);
      background: color-mix(in srgb, var(--home-primary) 13%, #fff);
    }

    &:focus-visible {
      outline: 3px solid color-mix(in srgb, var(--home-primary) 20%, transparent);
      outline-offset: 1px;
    }
  }

  .notif-close {
    width: 30px;
    height: 30px;
    border: 1px solid #e7e2dc;
    background: #fff;
    border-radius: 6px;
    cursor: pointer;
    display: grid;
    place-items: center;
    color: #6f6a63;
    flex-shrink: 0;
    transition: background 0.15s;

    svg {
      width: 15px;
      height: 15px;
    }

    &:hover {
      background: #f4f2ef;
    }

    &:focus-visible {
      outline: 3px solid rgba(53, 117, 132, 0.2);
      outline-offset: 1px;
    }
  }

  @media (max-width: 420px) {
    grid-template-columns: 32px minmax(0, 1fr) auto;
    gap: 8px;
    min-height: 54px;
    padding: 7px;

    .notif-icon {
      width: 32px;
      height: 32px;
    }

    .notif-close {
      width: 28px;
      height: 28px;
    }

    .notif-action {
      width: 30px;
      min-height: 28px;
      padding: 0;

      span {
        display: none;
      }
    }
  }
`;
