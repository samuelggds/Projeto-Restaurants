import styled from 'styled-components';

export const PageStack = styled.div`
  display: grid;
  gap: 24px;
  min-width: 0;
`;

export const SectionHeading = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px 24px;
  min-width: 0;
  > div {
    min-width: 0;
  }
  h2 {
    margin: 0;
    color: var(--ink, #1c3028);
    font-size: 20px;
    font-weight: 750;
    line-height: 1.35;
    letter-spacing: -0.035em;
    overflow-wrap: anywhere;
  }
  p {
    max-width: 680px;
    margin: 7px 0 0;
    color: var(--muted, #637169);
    font-size: 13px;
    line-height: 1.7;
  }
`;

export const Button = styled.button<{ $variant?: 'primary' | 'danger' | 'quiet' }>`
  min-height: 44px;
  min-width: 0;
  max-width: 100%;
  border: 1px solid
    ${(p) => (p.$variant === 'danger' ? '#eccac5' : p.$variant === 'primary' ? 'var(--brand, #233f32)' : 'var(--border, #dfe5dd)')};
  border-radius: 12px;
  background: ${(p) => (p.$variant === 'primary' ? 'var(--brand-ink, #233f32)' : p.$variant === 'danger' ? '#fff5f3' : 'var(--surface, #fff)')};
  color: ${(p) => (p.$variant === 'primary' ? '#fff' : p.$variant === 'danger' ? '#a4382a' : 'var(--ink, #1c3028)')};
  padding: 11px 17px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
  font-weight: 750;
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
  overflow-wrap: anywhere;
  box-shadow: ${(p) => (p.$variant === 'primary' ? '0 4px 10px #233f3214' : '0 1px 2px #1c302804')};
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease;
  cursor: pointer;
  svg {
    flex-shrink: 0;
  }
  @media (hover: hover) {
    &:hover:not(:disabled) {
      background: ${(p) => (p.$variant === 'primary' ? '#304f40' : p.$variant === 'danger' ? '#fceae6' : '#f2f5ed')};
      border-color: ${(p) => (p.$variant === 'danger' ? '#d9a39a' : '#99aa9e')};
      box-shadow: 0 4px 12px #233f320c;
    }
  }
  &:disabled {
    opacity: 0.5;
    box-shadow: none;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 3px solid var(--focus, #63836b);
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const EmptyState = styled.div`
  min-height: 210px;
  min-width: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  text-align: center;
  padding: 36px 24px;
  border: 1px dashed var(--border, #dfe5dd);
  border-radius: 18px;
  background: #f8faf6;
  color: var(--muted, #637169);
  svg {
    box-sizing: content-box;
    width: 28px;
    height: 28px;
    color: #52715c;
    background: #e8eee1;
    border-radius: 16px;
    padding: 14px;
    margin-bottom: 16px;
  }
  h3 {
    margin: 0;
    color: var(--ink, #1c3028);
    font-size: 16px;
    line-height: 1.45;
    letter-spacing: -0.025em;
  }
  p {
    max-width: 420px;
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.7;
  }
`;

export const StatePage = styled.div`
  box-sizing: border-box;
  min-height: 100dvh;
  min-width: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  text-align: center;
  gap: 16px;
  padding: 36px 20px;
  background: radial-gradient(ellipse at 50% 30%, #e8eee1 0, transparent 55%), #f5f6f2;
  color: var(--ink, #1c3028);
  font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
  svg {
    width: 44px;
    height: 44px;
    color: var(--brand, #233f32);
  }
  h1 {
    margin: 0;
    font-size: clamp(23px, 4vw, 32px);
    line-height: 1.25;
    letter-spacing: -0.045em;
  }
  p {
    margin: 0;
    color: var(--muted, #637169);
    font-size: 14px;
    line-height: 1.7;
    max-width: 510px;
  }
`;

export const SkeletonGrid = styled.div`
  width: min(900px, 86vw);
  max-width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  span {
    height: 120px;
    border: 1px solid #dfe5dd;
    border-radius: 18px;
    background: linear-gradient(90deg, #e8eee1, #fafbf8, #e8eee1);
    background-size: 220% 100%;
    animation: pulse 1.8s infinite;
  }
  @keyframes pulse {
    to {
      background-position: -220% 0;
    }
  }
  @media (max-width: 520px) {
    grid-template-columns: 1fr;
    span {
      height: 88px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    span {
      animation: none;
    }
  }
`;

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 140;
  box-sizing: border-box;
  background: #12231bd1;
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 24px;
  font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
  @media (max-width: 480px) {
    padding: 10px;
  }
`;

export const ModalPanel = styled.div<{ $drawer?: boolean }>`
  box-sizing: border-box;
  width: ${(p) => (p.$drawer ? 'min(620px, 100%)' : 'min(720px, 100%)')};
  min-width: 0;
  max-height: calc(100dvh - 48px);
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  border: 1px solid var(--border, #dfe5dd);
  border-radius: 20px;
  background: var(--surface, #fff);
  color: var(--ink, #1c3028);
  box-shadow: 0 28px 80px #10211940;
  padding: 28px;
  font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  ${(p) => (p.$drawer ? 'margin-left:auto;height:calc(100dvh - 48px);' : '')}
  > header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    padding-bottom: 22px;
    border-bottom: 1px solid var(--border, #dfe5dd);
  }
  > header > div {
    min-width: 0;
  }
  > header h2 {
    margin: 0;
    font-family: inherit;
    font-size: 25px;
    font-weight: 750;
    line-height: 1.3;
    letter-spacing: -0.045em;
    overflow-wrap: anywhere;
  }
  > header p {
    margin: 7px 0 0;
    color: var(--muted, #637169);
    font-size: 13px;
    line-height: 1.65;
    overflow-wrap: anywhere;
  }
  .close {
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border: 1px solid var(--border, #dfe5dd);
    border-radius: 12px;
    background: #f5f6f2;
    color: var(--ink, #1c3028);
    cursor: pointer;
  }
  .close:hover {
    background: #e8eee1;
  }
  .close:focus-visible {
    outline: 3px solid var(--focus, #63836b);
    outline-offset: 3px;
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 22px;
    border-top: 1px solid var(--border, #dfe5dd);
  }
  @media (max-width: 480px) {
    max-height: calc(100dvh - 20px);
    padding: 20px 16px;
    border-radius: 18px;
    > header h2 {
      font-size: 22px;
    }
    footer {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      > button {
        width: 100%;
      }
    }
    ${(p) => (p.$drawer ? 'width:100%;height:calc(100dvh - 20px);margin-left:0;' : '')}
  }
`;

export const Fields = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 18px;
  padding: 24px 0;
  min-width: 0;
  label {
    display: grid;
    gap: 8px;
    min-width: 0;
    font-size: 12px;
    font-weight: 750;
    line-height: 1.5;
    color: var(--ink, #1c3028);
  }
  .wide {
    grid-column: 1 / -1;
  }
  input,
  select,
  textarea {
    box-sizing: border-box;
    min-width: 0;
    max-width: 100%;
    width: 100%;
    border: 1px solid var(--border, #dfe5dd);
    border-radius: 12px;
    background: var(--surface, #fff);
    color: var(--ink, #1c3028);
    padding: 0 13px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    outline: none;
  }
  input,
  select {
    min-height: 46px;
  }
  textarea {
    min-height: 112px;
    resize: vertical;
    padding-block: 12px;
  }
  input::placeholder,
  textarea::placeholder {
    color: #738075;
    opacity: 1;
  }
  input:focus,
  select:focus,
  textarea:focus {
    border-color: var(--brand, #233f32);
    box-shadow: 0 0 0 3px #63836b24;
  }
  input[readonly],
  input:disabled,
  select:disabled,
  textarea:disabled {
    background: #f5f6f2;
    color: var(--muted, #637169);
  }
  small {
    color: var(--muted, #637169);
    font-size: 11px;
    font-weight: 500;
    line-height: 1.6;
  }
  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1fr);
    .wide {
      grid-column: auto;
    }
    input,
    select,
    textarea {
      font-size: 16px;
    }
  }
`;

export const InlineAlert = styled.div<{ $tone?: 'error' | 'info' | 'success' | 'warning' }>`
  min-width: 0;
  border: 1px solid
    ${(p) => (p.$tone === 'error' ? '#eccac5' : p.$tone === 'warning' ? '#e6d9ad' : p.$tone === 'success' ? '#cbdcc6' : '#d5e1dd')};
  border-radius: 14px;
  padding: 15px 17px;
  background: ${(p) => (p.$tone === 'error' ? '#fff5f3' : p.$tone === 'warning' ? '#fbf7e8' : p.$tone === 'success' ? '#f0f6ec' : '#f0f5f2')};
  color: ${(p) => (p.$tone === 'error' ? '#a4382a' : p.$tone === 'warning' ? '#775b16' : p.$tone === 'success' ? '#345c3c' : '#37574b')};
  font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
  font-size: 12px;
  line-height: 1.7;
  overflow-wrap: anywhere;
  button {
    min-height: 44px;
    max-width: 100%;
    border: 1px solid currentColor;
    border-radius: 10px;
    padding: 8px 12px;
    margin: 6px 0;
    background: #ffffffb3;
    color: inherit;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  button:focus-visible {
    outline: 3px solid var(--focus, #63836b);
    outline-offset: 3px;
  }
`;

export const DetailGrid = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin: 24px 0;
  div {
    border: 1px solid var(--border, #dfe5dd);
    border-radius: 14px;
    background: #f8faf6;
    padding: 16px;
    min-width: 0;
  }
  dt {
    color: var(--muted, #637169);
    font-size: 11px;
    line-height: 1.5;
    margin-bottom: 7px;
  }
  dd {
    margin: 0;
    color: var(--ink, #1c3028);
    font-size: 13px;
    font-weight: 700;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }
  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const ActionGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
  min-width: 0;
  @media (max-width: 480px) {
    > button {
      flex: 1 1 100%;
    }
  }
`;

export const Switch = styled.button<{ $on: boolean }>`
  width: 52px;
  min-width: 52px;
  height: 44px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 14px;
  background: transparent;
  position: relative;
  cursor: pointer;
  &::before {
    content: '';
    position: absolute;
    inset: 8px 0;
    border-radius: 99px;
    background: ${(p) => (p.$on ? 'var(--brand, #233f32)' : '#a7b3a7')};
    transition: background 0.18s ease;
  }
  &::after {
    content: '';
    position: absolute;
    top: 12px;
    left: ${(p) => (p.$on ? '28px' : '4px')};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px #14281b33;
    transition: left 0.18s ease;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  &:focus-visible {
    outline: 3px solid var(--focus, #63836b);
    outline-offset: 3px;
  }
  @media (prefers-reduced-motion: reduce) {
    &::before,
    &::after {
      transition: none;
    }
  }
`;

export const Notice = styled.div<{ $error?: boolean }>`
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 180;
  box-sizing: border-box;
  width: min(410px, calc(100vw - 48px));
  padding: 17px 20px;
  border: 1px solid #ffffff21;
  border-radius: 16px;
  color: #fff;
  background: ${(p) => (p.$error ? '#9a352b' : '#233f32')};
  box-shadow: 0 12px 36px #14281b26;
  font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.6;
  font-weight: 650;
  overflow-wrap: anywhere;
  @media (max-width: 480px) {
    right: 16px;
    bottom: 16px;
    width: calc(100vw - 32px);
  }
`;

export const PolicyList = styled.div`
  display: grid;
  gap: 12px;
  min-width: 0;
  .policy {
    border: 1px solid var(--border, #dfe5dd);
    border-radius: 14px;
    background: #f8faf6;
    padding: 17px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 7px 18px;
  }
  .policy b {
    color: var(--ink, #1c3028);
    font-size: 13px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .policy small {
    color: var(--muted, #637169);
    font-size: 11px;
    line-height: 1.65;
  }
  .policy output {
    grid-row: 1 / span 2;
    grid-column: 2;
    align-self: center;
    max-width: 230px;
    color: #3d5849;
    background: #e8eee1;
    border-radius: 9px;
    padding: 7px 10px;
    font-size: 11px;
    line-height: 1.5;
    font-weight: 650;
    overflow-wrap: anywhere;
  }
  @media (max-width: 520px) {
    .policy {
      grid-template-columns: minmax(0, 1fr);
    }
    .policy output {
      grid-column: 1;
      grid-row: auto;
      justify-self: start;
      max-width: 100%;
    }
  }
`;

export const Chat = styled.div`
  display: grid;
  gap: 16px;
  padding: 24px 2px;
  max-height: 48vh;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  min-width: 0;
  .message {
    max-width: 86%;
    min-width: 0;
    border: 1px solid var(--border, #dfe5dd);
    border-radius: 16px 16px 16px 4px;
    padding: 15px 17px;
    background: #f5f6f2;
  }
  .message.super {
    justify-self: end;
    border-color: #d5dfcd;
    border-radius: 16px 16px 4px 16px;
    background: #e8eee1;
  }
  .message b {
    display: block;
    color: var(--ink, #1c3028);
    font-size: 11px;
    margin-bottom: 7px;
  }
  .message p {
    margin: 0;
    color: var(--ink, #1c3028);
    font-size: 13px;
    line-height: 1.7;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .message time {
    display: block;
    margin-top: 8px;
    color: var(--muted, #637169);
    font-size: 10px;
    line-height: 1.5;
  }
  @media (max-width: 480px) {
    .message {
      max-width: 94%;
      padding: 13px 14px;
    }
  }
`;
