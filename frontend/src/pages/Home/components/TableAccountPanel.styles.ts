import styled from 'styled-components';

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 730;
  display: flex;
  justify-content: flex-end;
  background: rgba(24, 29, 25, 0.5);
`;

export const Panel = styled.aside`
  --home-primary: #ff4b4b;
  --result-action-accent: #ff4b4b;
  --result-action-accent-hover: #f23f3f;
  width: min(560px, 100%);
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f7f7f2;
  color: #282d29;
  box-shadow: -12px 0 40px rgba(24, 29, 25, 0.14);
  button:focus-visible {
    outline: 3px solid #ff4b4b;
    outline-offset: 3px;
  }
`;

export const Header = styled.header`
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 10px;
  padding: 20px clamp(16px, 4vw, 28px);
  background: #fff;
  border-bottom: 1px solid #e3e6de;
  .icon {
    color: var(--home-primary, #bb5034);
    display: grid;
    place-items: center;
  }
  h2 {
    margin: 0;
    font-size: clamp(17px, 3vw, 21px);
    line-height: 1.3;
    letter-spacing: -0.4px;
  }
  p {
    margin: 5px 0 0;
    color: #666f65;
    font-size: 12px;
    line-height: 1.45;
  }
  button {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border: 1px solid #e3e6de;
    border-radius: 12px;
    background: #fff;
    color: #52604f;
    cursor: pointer;
  }
`;

export const Steps = styled.ol`
  flex: 0 0 auto;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 0;
  margin: 22px clamp(16px, 4vw, 28px) 4px;
  li {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-top: 10px;
    border-top: 3px solid #dfe3d8;
    color: #697163;
    font-size: 12px;
  }
  li[aria-current='step'] {
    border-color: var(--home-primary, #bb5034);
    color: var(--home-primary, #bb5034);
    font-weight: 700;
  }
  li[data-complete='true'] {
    border-color: #548363;
  }
`;

export const Scroll = styled.div`
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 24px clamp(16px, 4vw, 28px);
`;

export const Introduction = styled.div`
  margin-bottom: 22px;
  small {
    display: block;
    color: #66705f;
    font-size: 11px;
    font-weight: 650;
    letter-spacing: 0.05em;
    overflow-wrap: anywhere;
  }
  h3 {
    margin: 9px 0 7px;
    font-size: clamp(23px, 4vw, 28px);
    letter-spacing: -0.8px;
    line-height: 1.2;
  }
  p {
    color: #68705f;
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
  }
`;

export const Loading = styled.div`
  min-height: 200px;
  display: grid;
  place-items: center;
  color: #68705f;
  font-size: 14px;
  text-align: center;
`;

export const Alert = styled.div<{ $error?: boolean; $info?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin: 12px 0;
  padding: 16px;
  border: 1px solid ${({ $error, $info }) => ($error ? '#edc4bb' : $info ? '#cddbdc' : '#cddfcf')};
  border-radius: 12px;
  background: ${({ $error, $info }) => ($error ? '#fff3f0' : $info ? '#eef5f6' : '#eff7ee')};
  color: ${({ $error, $info }) => ($error ? '#9d3329' : $info ? '#355e66' : '#31623b')};
  font-size: 13px;
  line-height: 1.5;
  > span:last-child {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  button {
    min-height: 44px;
    padding: 8px 12px;
    border: 1px solid currentColor;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-weight: 650;
  }
  button:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

export const ReceiptPreview = styled.section`
  overflow: hidden;
  border: 1px solid #e1e5da;
  border-radius: 14px;
  background: #fff;
  > header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 16px 18px;
    border-bottom: 1px solid #edf0e9;
  }
  header strong {
    font-size: 14px;
  }
  header em {
    color: #68705f;
    font-size: 12px;
    font-style: normal;
  }
  > footer {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 13px 18px;
    border-top: 1px solid #edf0e9;
    color: #69715f;
    font-size: 11px;
    line-height: 1.5;
  }
  > footer svg {
    flex: 0 0 auto;
  }
`;

export const ReceiptRows = styled.div`
  padding: 0 18px;
  article {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 17px 0;
  }
  article + article {
    border-top: 1px solid #edf0e9;
  }
  b,
  small {
    display: block;
  }
  b {
    font-size: 14px;
    line-height: 1.5;
    overflow-wrap: anywhere;
    font-weight: 600;
  }
  small {
    margin-top: 4px;
    color: #69715f;
    font-size: 12px;
    line-height: 1.45;
  }
  .receipt-item-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: 4px;
    max-width: 125px;
  }
  .receipt-item-actions > strong {
    font-size: 14px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .remove-item {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: #b13e2f;
    cursor: pointer;
  }
  .remove-item:hover:not(:disabled) {
    background: #fff1eb;
  }
  .remove-item:disabled {
    opacity: 0.5;
    cursor: wait;
  }
  > p {
    padding: 16px 0;
    color: #69715f;
    font-size: 14px;
    line-height: 1.5;
  }
`;

export const ReceiptTotals = styled.div`
  display: grid;
  gap: 10px;
  padding: 18px;
  border-top: 1px solid #e7ebdf;
  > span {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  small {
    font-size: 13px;
    color: #66705f;
  }
  b {
    font-size: 14px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .remaining {
    margin-top: 3px;
    padding-top: 14px;
    border-top: 1px solid #e7ebdf;
  }
  .remaining small {
    font-size: 14px;
    color: #282d29;
  }
  .remaining b {
    font-size: 25px;
    letter-spacing: -0.6px;
  }
`;

export const Guide = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 0 8px;
  > svg {
    color: #427448;
    flex: 0 0 auto;
  }
  b {
    font-size: 13px;
  }
  p {
    margin: 5px 0 0;
    color: #66705f;
    font-size: 12px;
    line-height: 1.5;
  }
`;

export const Draft = styled.section`
  display: grid;
  gap: 10px;
  margin-bottom: 18px;
  padding: 16px;
  border: 1px solid #d9dfd0;
  border-radius: 12px;
  background: #fff;
  strong {
    font-size: 14px;
  }
  p {
    font-size: 12px;
    line-height: 1.5;
    color: #66705f;
    margin: 6px 0 0;
  }
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
    padding: 10px;
    border: 1px solid #ff4b4b;
    border-radius: 8px;
    background: #fff1f1;
    color: #ff4b4b;
    font: inherit;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const PaymentActions = styled.footer`
  flex: 0 0 auto;
  display: grid;
  gap: 9px;
  padding: 16px clamp(16px, 4vw, 28px) max(16px, env(safe-area-inset-bottom));
  border-top: 1px solid #e1e5da;
  background: #fff;
  small {
    color: #66705f;
    font-size: 12px;
    line-height: 1.45;
    text-align: center;
  }
`;

export const PayButton = styled.button`
  width: 100%;
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 16px;
  border: 0;
  border-radius: 12px;
  background: #ff4b4b;
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  font-size: 14px;
  line-height: 1.4;
  svg {
    flex: 0 0 auto;
  }
  &:hover:not(:disabled) {
    filter: brightness(0.94);
  }
  &:disabled {
    cursor: wait;
    opacity: 0.6;
  }
`;

export const DetailsToggle = styled.button`
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin: 8px 0;
  padding: 8px;
  border: 0;
  background: transparent;
  color: #5f6857;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  &:disabled {
    cursor: wait;
    opacity: 0.6;
  }
`;

export const Empty = styled.div`
  padding: 24px 18px;
  border: 1px dashed #d9dfd0;
  border-radius: 12px;
  color: #66705f;
  font-size: 14px;
  line-height: 1.5;
  text-align: center;
`;
