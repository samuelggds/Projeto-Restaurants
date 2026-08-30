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
  width: min(480px, 100%);
  height: 100dvh;
  background: #fffdf9;
  display: flex;
  flex-direction: column;
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
  box-shadow: ${({ $open }) => ($open ? '-24px 0 80px rgba(70, 45, 20, 0.22)' : 'none')};
  will-change: ${({ $open }) => ($open ? 'transform, opacity' : 'auto')};
  contain: layout paint;
`;

export const CartHead = styled.div`
  position: sticky;
  top: 0;
  z-index: 4;
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 22px 24px 18px;
  background: #191816;
  color: #fff;

  .cart-title {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
  }

  small {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
    font-weight: 400;
  }

  button {
    width: 36px;
    height: 36px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font-size: 20px;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 0.18s;
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
`;

export const CartItems = styled.div`
  flex: 0 1 auto;
  width: 100%;
  max-height: 32dvh;
  overflow-y: auto;
  padding: 14px 20px 10px;
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
  padding: 14px;
  background: #fff;
  border: 1px solid var(--home-border);
  border-radius: 14px;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 4px 16px rgba(70, 45, 20, 0.08);
  }

  img {
    width: 76px;
    height: 76px;
    border-radius: 10px;
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
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    display: grid;
    place-items: center;
    color: #191816;
    transition: background 0.15s;
    &:hover {
      background: var(--home-border);
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
  min-height: 300px;
  gap: 12px;
  color: var(--home-muted);
  text-align: center;

  .icon {
    width: 72px;
    height: 72px;
    background: #f5f0ea;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: 32px;
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
`;

export const CartFoot = styled.div`
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px;
  border-top: 1px solid var(--home-border);
  background: #fff;
  overflow: hidden;

  > * {
    flex: 0 0 auto;
    width: 100%;
  }

  .cart-checkout-area {
    flex: 0 0 auto;
    width: 100%;
    margin-top: auto;
    padding-top: 14px;
    background: #fff;
    border-top: 1px solid var(--home-border);
  }
`;

export const CartOptions = styled.div`
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  padding-top: 14px;
  overflow-y: auto;
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
  color: #191816;
  margin: 12px 0 16px;
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
  background: #191816;
  color: #fff;
  border: 0;
  border-radius: 14px;
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
  font-family: inherit;
  letter-spacing: 0.01em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
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
    background: #d64d08;
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
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  background: #191816;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 12px 20px;
  font-size: 13px;
  font-weight: 500;
  flex-wrap: wrap;

  span {
    color: rgba(255, 255, 255, 0.7);
  }

  a,
  button {
    height: 34px;
    padding: 0 16px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    transition: filter 0.18s;
    &:hover {
      filter: brightness(1.1);
    }
  }

  .nudge-login {
    background: #d64d08;
    color: #fff;
    border: none;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }

  .nudge-dismiss {
    background: transparent;
    color: rgba(255, 255, 255, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
`;

/* ── In-app notification banner */
export const NotifStack = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  pointer-events: none;
  width: min(380px, calc(100vw - 40px));

  @media (max-width: 600px) {
    top: 12px;
    right: 12px;
    left: 12px;
    width: auto;
  }
`;

export const NotifItem = styled.div<{
  $type: 'success' | 'error' | 'info' | 'warning';
  $visible: boolean;
}>`
  pointer-events: auto;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border-radius: 14px;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.04),
    0 10px 30px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(0, 0, 0, 0.05);
  border-left: 4px solid
    ${({ $type }) =>
      $type === 'success'
        ? '#4f8b40'
        : $type === 'error'
          ? '#c94040'
          : $type === 'warning'
            ? '#d97706'
            : '#d64d08'};

  transform: translateX(${({ $visible }) => ($visible ? '0' : 'calc(100% + 40px)')});
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transition:
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.28s ease;

  .notif-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    font-size: 16px;
    flex-shrink: 0;
    background: ${({ $type }) =>
      $type === 'success'
        ? '#edfaeb'
        : $type === 'error'
          ? '#fdf0f0'
          : $type === 'warning'
            ? '#fef9ec'
            : '#fdeee7'};
  }

  .notif-body {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .notif-title {
    font-size: 14px;
    font-weight: 700;
    color: #191816;
    line-height: 1.25;
  }

  .notif-msg {
    font-size: 13px;
    color: #6f6a63;
    line-height: 1.35;
  }

  .notif-close {
    width: 24px;
    height: 24px;
    border: none;
    background: #f5f0ea;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    display: grid;
    place-items: center;
    color: #6f6a63;
    flex-shrink: 0;
    transition: background 0.15s;
    &:hover {
      background: #eadfd3;
    }
  }
`;
