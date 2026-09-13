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
  background: rgba(24, 16, 11, 0.62);
  backdrop-filter: blur(9px);
`;

export const Dialog = styled.div<{ $state: 'idle' | 'error' | 'success'; $shake: boolean }>`
  width: min(100%, 500px);
  border-radius: 24px;
  padding: 26px;
  background: ${(props) => props.theme.surface};
  color: ${(props) => props.theme.text};
  border: 1px solid
    ${({ $state, theme }) =>
      $state === 'error' ? '#dc2626' : $state === 'success' ? '#16a34a' : theme.border};
  box-shadow:
    0 34px 90px rgba(25, 15, 9, 0.32),
    0 0 0 4px
      ${({ $state }) =>
        $state === 'error'
          ? 'rgba(220, 38, 38, 0.10)'
          : $state === 'success'
            ? 'rgba(22, 163, 74, 0.10)'
            : 'rgba(255,255,255,0.04)'};
  transition: border-color 180ms ease, box-shadow 180ms ease;

  ${({ $shake }) =>
    $shake &&
    css`
      animation: ${shake} 420ms ease;
    `}

  @media (max-width: 520px) {
    padding: 22px 18px;
    border-radius: 20px;
  }
`;

export const Header = styled.div`
  display: grid;
  grid-template-columns: 4px 1fr auto;
  gap: 14px;
  align-items: start;
  margin-bottom: 24px;
`;

export const TitleMarker = styled.span`
  width: 4px;
  min-height: 58px;
  border-radius: 999px;
  background: ${(props) => props.theme.primary};
`;

export const HeaderText = styled.div`
  min-width: 0;

  .eyebrow {
    display: block;
    margin-bottom: 5px;
    color: ${(props) => props.theme.primaryReadable};
    font-size: 0.72rem;
    font-weight: 850;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0 0 8px;
    font-size: 1.32rem;
    line-height: 1.18;
    letter-spacing: -0.025em;
  }

  p {
    margin: 0;
    color: ${(props) => props.theme.textMuted};
    font-size: 0.9rem;
    line-height: 1.55;
  }

  strong {
    color: ${(props) => props.theme.text};
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

  &:hover:not(:disabled) {
    background: ${(props) => props.theme.background};
    color: ${(props) => props.theme.text};
  }

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
  margin-bottom: 10px;
  font-size: 0.82rem;
  font-weight: 800;
`;

export const CodeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 9px;

  @media (max-width: 390px) {
    gap: 6px;
  }
`;

export const CodeCell = styled.input<{
  $state: 'idle' | 'error' | 'success';
  $filled: boolean;
}>`
  min-width: 0;
  width: 100%;
  height: 62px;
  border-radius: 14px;
  border: 1px solid
    ${({ $state, $filled, theme }) =>
      $state === 'error'
        ? '#dc2626'
        : $state === 'success'
          ? '#16a34a'
          : $filled
            ? theme.primaryReadable
            : theme.border};
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  text-align: center;
  font-size: 1.55rem;
  font-weight: 850;
  caret-color: ${(props) => props.theme.primaryReadable};
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;

  &:focus {
    border-color: ${(props) => props.theme.primaryReadable};
    box-shadow: 0 0 0 4px color-mix(in srgb, ${(props) => props.theme.primary} 15%, transparent);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.75;
  }

  @media (max-width: 390px) {
    height: 54px;
    border-radius: 12px;
    font-size: 1.35rem;
  }
`;

export const Feedback = styled.div<{ $state: 'idle' | 'error' | 'success' }>`
  margin-top: 13px;
  display: flex;
  gap: 9px;
  align-items: flex-start;
  border-radius: 13px;
  padding: 11px 12px;
  font-size: 0.84rem;
  line-height: 1.45;
  font-weight: 650;
  color: ${({ $state, theme }) =>
    $state === 'success' ? '#166534' : $state === 'error' ? '#991b1b' : theme.textMuted};
  background: ${({ $state }) =>
    $state === 'success' ? '#ecfdf3' : $state === 'error' ? '#fff1f2' : 'rgba(0,0,0,0.025)'};
  border: 1px solid
    ${({ $state, theme }) =>
      $state === 'success' ? '#bbf7d0' : $state === 'error' ? '#fecaca' : theme.border};

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
  font-size: 0.77rem;
  line-height: 1.45;
`;

export const VerifyButton = styled.button`
  width: 100%;
  min-height: 48px;
  margin-top: 20px;
  border: 0;
  border-radius: 13px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: ${(props) => props.theme.primaryText};
  background: ${(props) => props.theme.primary};
  font-weight: 850;
  cursor: pointer;
  box-shadow: 0 12px 24px color-mix(in srgb, ${(props) => props.theme.primary} 24%, transparent);

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
    box-shadow: none;
  }

  svg {
    width: 18px;
    height: 18px;
  }

  .spinner {
    animation: ${spin} 0.8s linear infinite;
  }
`;

export const ResendRow = styled.div`
  margin-top: 14px;
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  flex-wrap: wrap;
  color: ${(props) => props.theme.textMuted};
  font-size: 0.78rem;
`;

export const ResendButton = styled.button`
  border: 0;
  padding: 4px 2px;
  background: transparent;
  color: ${(props) => props.theme.primaryReadable};
  font: inherit;
  font-weight: 850;
  cursor: pointer;

  &:disabled {
    color: ${(props) => props.theme.textMuted};
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

export const Countdown = styled.strong`
  min-width: 34px;
  color: ${(props) => props.theme.text};
  font-variant-numeric: tabular-nums;
`;
