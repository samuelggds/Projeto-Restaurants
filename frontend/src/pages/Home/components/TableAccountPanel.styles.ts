import styled from 'styled-components';

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 730;
  display: flex;
  justify-content: flex-end;
  background: rgba(24, 19, 16, 0.58);
  backdrop-filter: blur(6px);
`;

export const Panel = styled.aside`
  width: min(640px, 100%);
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid rgba(255, 255, 255, 0.45);
  background: #fffdf9;
  box-shadow: -24px 0 70px rgba(31, 21, 15, 0.25);

  @media (max-width: 700px) {
    width: 100%;
    border-left: 0;
  }
`;

export const Header = styled.header`
  flex: 0 0 auto;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 40px;
  align-items: center;
  gap: 13px;
  padding: 20px clamp(15px, 4vw, 26px);
  border-bottom: 1px solid #eadfd4;
  background: linear-gradient(120deg, #1a2c35, #64443a);
  color: #fff;

  .icon {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 15px;
    background: rgba(255, 255, 255, 0.12);
  }

  h2 {
    margin: 0;
    font-size: clamp(19px, 3vw, 25px);
  }

  p {
    margin: 4px 0 0;
    color: rgba(255, 255, 255, 0.72);
    font-size: 11px;
  }

  button {
    width: 40px;
    height: 40px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    cursor: pointer;
  }
`;

export const Scroll = styled.div`
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 18px clamp(13px, 4vw, 25px) calc(56px + env(safe-area-inset-bottom));
`;

export const Loading = styled.div`
  min-height: 320px;
  display: grid;
  place-items: center;
  color: #746b64;
  font-size: 13px;
  text-align: center;
`;

export const Alert = styled.div<{ $error?: boolean; $info?: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border: 1px solid ${({ $error, $info }) => ($error ? '#f0c4bd' : $info ? '#cbdceb' : '#cce3d2')};
  border-radius: 13px;
  background: ${({ $error, $info }) => ($error ? '#fff3f0' : $info ? '#f1f7fc' : '#eff9f1')};
  color: ${({ $error, $info }) => ($error ? '#9d3329' : $info ? '#315f82' : '#286b39')};
  font-size: 12px;
  line-height: 1.45;

  > span:last-child {
    display: inline-flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }

  button {
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
    font-weight: 850;
  }
`;

export const ReceiptPreview = styled.section`
  overflow: hidden;
  margin-bottom: 10px;
  border: 1px solid #dfd7ce;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 16px 34px rgba(42, 31, 23, 0.08);

  > header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 18px;
    border-bottom: 1px dashed #ded4cb;
    background: linear-gradient(180deg, #faf7f3, #fff);
  }

  header span,
  header small,
  header strong {
    display: block;
  }

  header small {
    color: #8b8178;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  header strong {
    margin-top: 4px;
    color: #241f1b;
    font-size: 17px;
  }

  header em {
    flex: 0 0 auto;
    padding: 6px 9px;
    border-radius: 999px;
    background: #f4eee8;
    color: #6d6157;
    font-size: 9px;
    font-style: normal;
    font-weight: 800;
  }

  > footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 14px;
    border-top: 1px dashed #e2d8cf;
    background: #fcfaf7;
    color: #867b72;
    font-size: 9px;
    text-align: center;
  }

  > footer svg {
    flex: 0 0 auto;
    color: var(--home-primary);
  }
`;

export const ReceiptRows = styled.div`
  display: grid;
  padding: 7px 18px;

  article {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid #f0eae4;
  }

  article:last-child {
    border-bottom: 0;
  }

  b,
  small {
    display: block;
  }

  b {
    color: #332c27;
    font-size: 11px;
    line-height: 1.4;
  }

  small {
    margin-top: 3px;
    color: #8a8077;
    font-size: 9px;
    line-height: 1.4;
  }

  .receipt-item-actions {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 9px;
  }

  .receipt-item-actions > strong {
    color: #342d28;
    font-size: 11px;
    white-space: nowrap;
  }

  .remove-item {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: #c94f38;
    cursor: pointer;
    transition: transform 140ms ease, color 140ms ease, background 140ms ease;
  }

  .remove-item:hover:not(:disabled) {
    transform: scale(1.06);
    background: #fff0ec;
    color: #a83624;
  }

  .remove-item:focus-visible {
    outline: 3px solid rgba(201, 79, 56, 0.2);
    outline-offset: 2px;
  }

  .remove-item:disabled {
    cursor: not-allowed;
    opacity: 0.42;
  }

  > p {
    margin: 0;
    padding: 26px 0;
    color: #8a8077;
    font-size: 11px;
    text-align: center;
  }
`;

export const ReceiptTotals = styled.div`
  padding: 14px 18px 16px;
  border-top: 1px dashed #ddd3ca;
  background: #fffdfb;

  > span {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .remaining small {
    color: #3f3731;
    font-size: 11px;
    font-weight: 800;
  }

  .remaining b {
    color: var(--home-primary);
    font-size: 20px;
  }
`;

export const DetailsToggle = styled.button`
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  background: transparent;
  color: #5f554e;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 800;

  &:disabled {
    cursor: wait;
    opacity: 0.6;
  }
`;

export const Empty = styled.div`
  padding: 28px 18px;
  border: 1px dashed #dfd5cc;
  border-radius: 16px;
  color: #81766e;
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
`;
