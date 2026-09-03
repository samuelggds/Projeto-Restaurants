import styled from 'styled-components';

export const PageStack = styled.div`
  display: grid;
  gap: 18px;
`;

export const SectionHeading = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  h2 {
    margin: 0;
    font-size: 18px;
  }
  p {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.5;
  }
`;

export const Button = styled.button<{ $variant?: 'primary' | 'danger' | 'quiet' }>`
  min-height: 40px;
  border: 1px solid ${(p) => (p.$variant === 'danger' ? '#e6b8b2' : 'var(--border)')};
  border-radius: 9px;
  background: ${(p) => (p.$variant === 'primary' ? 'var(--brand)' : p.$variant === 'danger' ? '#fff5f3' : '#fff')};
  color: ${(p) => (p.$variant === 'primary' ? '#fff' : p.$variant === 'danger' ? '#ae2c20' : '#2f3539')};
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-weight: 750;
  font-size: 12px;
  cursor: pointer;
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 3px solid #e9530b35;
    outline-offset: 2px;
  }
`;

export const EmptyState = styled.div`
  min-height: 180px;
  display: grid;
  place-content: center;
  justify-items: center;
  text-align: center;
  padding: 28px;
  color: var(--muted);
  svg {
    width: 34px;
    height: 34px;
    color: #b1a79f;
    margin-bottom: 9px;
  }
  h3 {
    margin: 0;
    color: var(--ink);
    font-size: 14px;
  }
  p {
    max-width: 420px;
    margin: 6px 0 0;
    font-size: 12px;
    line-height: 1.5;
  }
`;

export const StatePage = styled.div`
  min-height: 100dvh;
  display: grid;
  place-content: center;
  justify-items: center;
  text-align: center;
  gap: 12px;
  padding: 30px;
  background: #fbfaf8;
  color: #202428;
  svg {
    width: 44px;
    height: 44px;
    color: #e9530b;
  }
  h1 {
    margin: 0;
    font-size: 23px;
  }
  p {
    margin: 0;
    color: #687078;
    max-width: 510px;
  }
`;

export const SkeletonGrid = styled.div`
  width: min(900px, 86vw);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  span {
    height: 100px;
    border-radius: 13px;
    background: linear-gradient(90deg, #eee9e3, #faf7f3, #eee9e3);
    background-size: 220% 100%;
    animation: pulse 1.4s infinite;
  }
  @keyframes pulse {
    to {
      background-position: -220% 0;
    }
  }
`;

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 140;
  background: rgba(8, 13, 16, 0.68);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 18px;

  @media (max-width: 480px) {
    padding: 10px;
  }
`;

export const ModalPanel = styled.div<{ $drawer?: boolean }>`
  width: ${(p) => (p.$drawer ? 'min(590px, 100%)' : 'min(690px, 100%)')};
  max-height: calc(100dvh - 36px);
  overflow: auto;
  border-radius: 18px;
  background: #fffdfb;
  box-shadow: 0 28px 90px #0006;
  padding: 24px;
  ${(p) => (p.$drawer ? 'margin-left:auto;height:calc(100dvh - 36px);' : '')}
  > header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border, #e7e2dc);
  }
  > header h2 {
    margin: 0;
    font-size: 23px;
  }
  > header p {
    margin: 5px 0 0;
    color: #687078;
    font-size: 12px;
    line-height: 1.5;
  }
  .close {
    width: 39px;
    height: 39px;
    flex: 0 0 auto;
    border: 1px solid #e7e2dc;
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
  }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 9px;
    padding-top: 17px;
    border-top: 1px solid #e7e2dc;
  }

  @media (max-width: 480px) {
    max-height: calc(100dvh - 20px);
    padding: 18px 14px;
    border-radius: 14px;

    > header h2 {
      font-size: 20px;
    }

    footer {
      display: grid;
      grid-template-columns: 1fr;

      > button {
        width: 100%;
      }
    }

    ${(p) =>
      p.$drawer ? 'width:100%;height:calc(100dvh - 20px);margin-left:0;border-radius:14px;' : ''}
  }
`;

export const Fields = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 13px;
  padding: 18px 0;
  label {
    display: grid;
    gap: 6px;
    font-size: 11px;
    font-weight: 750;
    color: #34393d;
  }
  .wide {
    grid-column: 1 / -1;
  }
  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid #e1dbd4;
    border-radius: 9px;
    background: #fff;
    padding: 0 12px;
    outline: none;
  }
  input,
  select {
    height: 44px;
  }
  textarea {
    min-height: 92px;
    resize: vertical;
    padding-block: 11px;
  }
  input:focus,
  select:focus,
  textarea:focus {
    border-color: #e9530b;
    box-shadow: 0 0 0 3px #e9530b16;
  }
  input[readonly] {
    background: #f6f4f1;
    color: #687078;
  }
  small {
    color: #687078;
    font-size: 10px;
    font-weight: 500;
    line-height: 1.45;
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    .wide {
      grid-column: auto;
    }
  }
`;

export const InlineAlert = styled.div<{ $tone?: 'error' | 'info' | 'success' }>`
  border: 1px solid
    ${(p) => (p.$tone === 'error' ? '#f0c7c2' : p.$tone === 'success' ? '#bfe1c7' : '#d8dfe7')};
  border-radius: 10px;
  padding: 11px 13px;
  background: ${(p) => (p.$tone === 'error' ? '#fff3f1' : p.$tone === 'success' ? '#effaf2' : '#f5f8fb')};
  color: ${(p) => (p.$tone === 'error' ? '#a92e22' : p.$tone === 'success' ? '#216d32' : '#405162')};
  font-size: 11px;
  line-height: 1.5;
`;

export const DetailGrid = styled.dl`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 18px 0;
  div {
    border: 1px solid #e7e2dc;
    border-radius: 10px;
    padding: 12px;
    min-width: 0;
  }
  dt {
    color: #687078;
    font-size: 10px;
    margin-bottom: 5px;
  }
  dd {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const ActionGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
`;

export const Switch = styled.button<{ $on: boolean }>`
  width: 46px;
  height: 25px;
  border: 0;
  border-radius: 99px;
  background: ${(p) => (p.$on ? 'var(--brand)' : '#c7c9cb')};
  position: relative;
  cursor: pointer;
  &::after {
    content: '';
    position: absolute;
    top: 3px;
    left: ${(p) => (p.$on ? '24px' : '3px')};
    width: 19px;
    height: 19px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px #0003;
    transition: 0.18s;
  }
  &:focus-visible {
    outline: 3px solid #e9530b35;
    outline-offset: 2px;
  }
`;

export const Notice = styled.div<{ $error?: boolean }>`
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 180;
  width: min(390px, calc(100vw - 40px));
  padding: 13px 15px;
  border-radius: 11px;
  color: #fff;
  background: ${(p) => (p.$error ? '#a82e23' : '#185d2a')};
  box-shadow: 0 12px 35px #0004;
  font-size: 12px;
  font-weight: 700;
`;

export const PolicyList = styled.div`
  display: grid;
  gap: 9px;
  .policy {
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px 14px;
  }
  .policy b {
    font-size: 12px;
  }
  .policy small {
    color: var(--muted);
    font-size: 10px;
    line-height: 1.45;
  }
  .policy output {
    grid-row: 1 / span 2;
    grid-column: 2;
    align-self: center;
    max-width: 230px;
    color: #3f474d;
    font-size: 11px;
    overflow-wrap: anywhere;
  }
`;

export const Chat = styled.div`
  display: grid;
  gap: 10px;
  padding: 17px 0;
  max-height: 48vh;
  overflow: auto;
  .message {
    max-width: 82%;
    border-radius: 13px 13px 13px 3px;
    padding: 11px 13px;
    background: #f0eeeb;
  }
  .message.super {
    justify-self: end;
    border-radius: 13px 13px 3px 13px;
    background: #fff0e7;
  }
  .message b {
    display: block;
    font-size: 10px;
    margin-bottom: 4px;
  }
  .message p {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
  }
  .message time {
    display: block;
    margin-top: 5px;
    color: #747b80;
    font-size: 9px;
  }
`;
