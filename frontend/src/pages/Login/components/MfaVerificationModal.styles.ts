import styled, { css, keyframes } from 'styled-components';

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  18% { transform: translateX(-8px); }
  36% { transform: translateX(7px); }
  54% { transform: translateX(-5px); }
  72% { transform: translateX(4px); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(17, 12, 9, 0.58);
  backdrop-filter: blur(7px);
`;

export const Dialog = styled.div<{ $state: 'idle' | 'error' | 'success'; $shake: boolean }>`
  width: min(100%, 470px);
  border-radius: 24px;
  padding: 24px;
  background: ${(props) => props.theme.surface};
  color: ${(props) => props.theme.text};
  border: 2px solid
    ${({ $state, theme }) =>
      $state === 'error' ? '#dc2626' : $state === 'success' ? '#16a34a' : theme.border};
  box-shadow:
    0 28px 80px rgba(30, 16, 8, 0.28),
    0 0 0 5px
      ${({ $state }) =>
        $state === 'error'
          ? 'rgba(220, 38, 38, 0.10)'
          : $state === 'success'
            ? 'rgba(22, 163, 74, 0.10)'
            : 'rgba(255,255,255,0.04)'};
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease;

  ${({ $shake }) =>
    $shake &&
    css`
      animation: ${shake} 420ms ease;
    `}
`;

export const Header = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 14px;
  align-items: start;
  margin-bottom: 22px;
`;

export const Icon = styled.div<{ $state: 'idle' | 'error' | 'success' }>`
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: ${({ $state, theme }) =>
    $state === 'error' ? '#b91c1c' : $state === 'success' ? '#15803d' : theme.primaryReadable};
  background: ${({ $state }) =>
    $state === 'error' ? '#fee2e2' : $state === 'success' ? '#dcfce7' : 'rgba(230, 92, 0, 0.10)'};

  svg {
    width: 22px;
    height: 22px;
  }
`;

export const HeaderText = styled.div`
  min-width: 0;

  h2 {
    margin: 0 0 6px;
    font-size: 1.22rem;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    color: ${(props) => props.theme.textMuted};
    font-size: 0.9rem;
    line-height: 1.55;
  }
`;

export const CloseButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 11px;
  border: 1px solid ${(props) => props.theme.border};
  display: grid;
  place-items: center;
  background: transparent;
  color: ${(props) => props.theme.textMuted};
  cursor: pointer;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

export const CodeLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 0.82rem;
  font-weight: 800;
`;

export const CodeInput = styled.input`
  width: 100%;
  height: 58px;
  border-radius: 15px;
  border: 1px solid ${(props) => props.theme.border};
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  text-align: center;
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: 0.38em;
  padding-left: 0.38em;
  outline: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;

  &:focus {
    border-color: ${(props) => props.theme.primaryReadable};
    box-shadow: 0 0 0 4px color-mix(in srgb, ${(props) => props.theme.primary} 16%, transparent);
  }

  &[aria-invalid='true'] {
    border-color: #dc2626;
    box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.10);
  }

  &:disabled {
    opacity: 0.72;
  }
`;

export const Feedback = styled.div<{ $state: 'idle' | 'error' | 'success' }>`
  margin-top: 12px;
  display: flex;
  gap: 9px;
  align-items: flex-start;
  border-radius: 13px;
  padding: 11px 12px;
  font-size: 0.84rem;
  line-height: 1.45;
  font-weight: 650;
  color: ${({ $state }) => ($state === 'success' ? '#166534' : '#991b1b')};
  background: ${({ $state }) => ($state === 'success' ? '#ecfdf3' : '#fff1f2')};
  border: 1px solid ${({ $state }) => ($state === 'success' ? '#bbf7d0' : '#fecaca')};

  svg {
    flex: 0 0 auto;
    width: 18px;
    height: 18px;
    margin-top: 1px;
  }
`;

export const Hint = styled.p`
  margin: 10px 2px 0;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.78rem;
  line-height: 1.45;
`;

export const Actions = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  margin-top: 22px;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

const ActionButton = styled.button`
  min-height: 46px;
  border-radius: 13px;
  padding: 0 16px;
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
`;

export const CancelButton = styled(ActionButton)`
  border: 1px solid ${(props) => props.theme.border};
  background: transparent;
  color: ${(props) => props.theme.text};
`;

export const VerifyButton = styled(ActionButton)`
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: ${(props) => props.theme.primaryText};
  background: ${(props) => props.theme.primary};

  svg {
    width: 18px;
    height: 18px;
  }

  .spinner {
    animation: ${spin} 0.8s linear infinite;
  }
`;
