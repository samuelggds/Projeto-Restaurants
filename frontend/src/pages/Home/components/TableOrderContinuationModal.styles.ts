import styled from 'styled-components';

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 720;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(25, 20, 17, 0.62);
  backdrop-filter: blur(8px);
`;

export const Dialog = styled.section`
  width: min(620px, 100%);
  max-height: min(760px, calc(100dvh - 32px));
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 26px;
  background: #fffdf9;
  box-shadow: 0 34px 90px rgba(30, 20, 14, 0.34);

  @media (max-width: 600px) {
    width: 100%;
    max-height: calc(100dvh - 12px);
    margin-top: auto;
    border-radius: 24px 24px 12px 12px;
  }
`;

export const Header = styled.header`
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) 38px;
  align-items: center;
  gap: 13px;
  padding: 22px 22px 18px;
  border-bottom: 1px solid #eee3d9;

  .icon {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 15px;
    background: color-mix(in srgb, var(--home-primary) 12%, white);
    color: var(--home-primary);
  }

  h2 {
    margin: 0;
    color: #211b17;
    font-size: clamp(19px, 3vw, 24px);
    line-height: 1.15;
  }

  p {
    margin: 5px 0 0;
    color: #746b64;
    font-size: 12px;
    line-height: 1.4;
  }

  button {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 1px solid #eadfd3;
    border-radius: 11px;
    background: #fff;
    color: #554b44;
    cursor: pointer;
  }

  @media (max-width: 480px) {
    grid-template-columns: 42px minmax(0, 1fr) 36px;
    gap: 10px;
    padding: 17px 15px 14px;

    .icon {
      width: 42px;
      height: 42px;
    }
  }
`;

export const Body = styled.div`
  display: grid;
  gap: 12px;
  padding: 18px 22px 22px;

  @media (max-width: 480px) {
    padding: 14px;
  }
`;

export const BackButton = styled.button`
  width: fit-content;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border: 0;
  background: transparent;
  color: #5e554e;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 800;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const Choice = styled.article<{ $featured?: boolean; $disabled?: boolean }>`
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 13px;
  padding: 17px;
  border: 1.5px solid ${({ $featured }) => ($featured ? 'var(--home-primary)' : '#e6dbd0')};
  border-radius: 18px;
  background: ${({ $featured }) =>
    $featured ? 'color-mix(in srgb, var(--home-primary) 5%, white)' : '#fff'};
  opacity: ${({ $disabled }) => ($disabled ? 0.58 : 1)};

  .choice-icon {
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    background: ${({ $featured }) => ($featured ? 'var(--home-primary)' : '#f4eee8')};
    color: ${({ $featured }) => ($featured ? '#fff' : '#564d46')};
  }

  h3 {
    margin: 0;
    color: #211b17;
    font-size: 15px;
  }

  p {
    margin: 5px 0 0;
    color: #746b64;
    font-size: 12px;
    line-height: 1.45;
  }

  .badge {
    display: inline-flex;
    margin-top: 9px;
    padding: 5px 8px;
    border-radius: 999px;
    background: #edf7ef;
    color: #26713b;
    font-size: 10px;
    font-weight: 800;
  }

  @media (max-width: 480px) {
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 10px;
    padding: 14px;

    .choice-icon {
      width: 38px;
      height: 38px;
    }
  }
`;

export const PaymentMethods = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  button {
    min-width: 0;
    min-height: 116px;
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    align-content: center;
    align-items: center;
    gap: 3px 9px;
    padding: 13px;
    border: 1px solid #dfd4ca;
    border-radius: 12px;
    background: #fff;
    color: #433b35;
    cursor: pointer;
    font: inherit;
    text-align: left;
  }

  button > span {
    grid-row: 1 / 3;
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: #f4eee8;
  }

  b {
    align-self: end;
    font-size: 13px;
  }

  small {
    align-self: start;
    color: #766c64;
    font-size: 10px;
    line-height: 1.35;
  }

  button[aria-pressed='true'] {
    border-color: var(--home-primary);
    background: color-mix(in srgb, var(--home-primary) 8%, white);
    color: var(--home-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--home-primary) 11%, transparent);
  }

  button[aria-pressed='true'] > span {
    background: var(--home-primary);
    color: #fff;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;

    button {
      min-height: 78px;
    }
  }
`;

export const MethodPanel = styled.section`
  display: grid;
  gap: 13px;
`;

export const PaymentNotice = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 11px 12px;
  border: 1px solid #eadab5;
  border-radius: 11px;
  background: #fff8e8;
  color: #6d5319;

  svg {
    flex: 0 0 auto;
    margin-top: 1px;
  }

  b,
  small {
    display: block;
  }

  b {
    font-size: 11px;
  }

  small {
    margin-top: 3px;
    color: #806b3d;
    font-size: 10px;
    line-height: 1.4;
  }
`;

export const Action = styled.button<{ $primary?: boolean }>`
  grid-column: 1 / -1;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 2px;
  padding: 11px 15px;
  border: 1px solid ${({ $primary }) => ($primary ? 'var(--home-primary)' : '#d9cec4')};
  border-radius: 13px;
  background: ${({ $primary }) => ($primary ? 'var(--home-primary)' : '#fff')};
  color: ${({ $primary }) => ($primary ? '#fff' : '#332c27')};
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 850;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

export const Empty = styled.div`
  padding: 13px;
  border-radius: 13px;
  background: #fff4e8;
  color: #7b4a1b;
  font-size: 12px;
  line-height: 1.45;
`;
