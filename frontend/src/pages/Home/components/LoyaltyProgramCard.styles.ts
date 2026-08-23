import styled, { keyframes } from 'styled-components';

const glow = keyframes`
  0%, 100% { box-shadow: 0 12px 30px rgba(55, 38, 26, 0.18); }
  50% { box-shadow: 0 14px 34px color-mix(in srgb, var(--home-primary, #d64d08) 28%, transparent); }
`;

export const CompactNotice = styled.button`
  position: relative;
  width: min(350px, calc(100vw - 32px));
  min-width: 0;
  min-height: 64px;
  padding: 9px 12px 9px 9px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid color-mix(in srgb, var(--home-primary, #d64d08) 30%, #eadfd3);
  border-radius: 17px;
  color: #211d19;
  background: linear-gradient(
    112deg,
    #fffdf9 35%,
    color-mix(in srgb, var(--home-primary, #d64d08) 8%, #fff)
  );
  text-align: left;
  cursor: pointer;
  animation: ${glow} 2.8s ease-in-out infinite;
  transition:
    transform 180ms ease,
    border-color 180ms ease;

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--home-primary, #d64d08) 48%, #eadfd3);
  }

  .icon {
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 14px;
    color: #fff;
    background: var(--home-primary, #d64d08);
    box-shadow: 0 8px 18px color-mix(in srgb, var(--home-primary, #d64d08) 28%, transparent);
  }

  .icon svg {
    width: 21px;
  }

  > span {
    min-width: 0;
    flex: 1;
    display: grid;
    gap: 2px;
  }

  strong {
    overflow: hidden;
    font-size: 13px;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    overflow: hidden;
    color: #6f665e;
    font-size: 11px;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .notice-badge {
    min-width: 42px;
    max-width: 72px;
    padding: 6px 8px;
    overflow: hidden;
    border-radius: 999px;
    color: var(--home-primary, #d64d08);
    background: color-mix(in srgb, var(--home-primary, #d64d08) 11%, #fff);
    font-size: 10px;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chevron {
    flex: 0 0 auto;
    color: #8d8279;
  }

  @media (max-width: 420px) {
    width: min(310px, 100%);
    min-height: 58px;
    padding: 7px 9px 7px 7px;
    gap: 8px;

    .icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
    }

    .notice-badge {
      max-width: 59px;
      padding-inline: 7px;
    }

    .chevron {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
  }
`;

export const Backdrop = styled.div<{ $primary: string }>`
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(25, 24, 22, 0.5);
  backdrop-filter: blur(3px);
  --home-primary: ${({ $primary }) => $primary};
  --primary: ${({ $primary }) => $primary};

  @media (max-width: 520px) {
    align-items: end;
    padding: 10px;
  }
`;

export const Dialog = styled.section`
  width: min(560px, 100%);
  max-height: min(760px, calc(100dvh - 36px));
  overflow: auto;
  overscroll-behavior: contain;
  border: 1px solid #eadfd3;
  border-radius: 24px;
  color: #211d19;
  background: #fffdf9;
  box-shadow: 0 28px 70px rgba(25, 24, 22, 0.34);

  @media (max-width: 520px) {
    max-height: calc(100dvh - 20px);
    border-radius: 22px 22px 16px 16px;
  }
`;

export const DialogHeader = styled.header`
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 13px;
  border-bottom: 1px solid #eee4db;
  background: rgba(255, 253, 249, 0.96);
  backdrop-filter: blur(12px);

  > i {
    width: 46px;
    height: 46px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 14px;
    color: #fff;
    background: var(--home-primary, #d64d08);
  }

  > i svg {
    width: 22px;
  }

  > div {
    min-width: 0;
    flex: 1;
  }

  small {
    color: var(--home-primary, #d64d08);
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  h2 {
    margin: 2px 0 3px;
    font-size: 20px;
    line-height: 1.18;
    letter-spacing: -0.025em;
  }

  p {
    margin: 0;
    color: #746b63;
    font-size: 11px;
  }

  > button {
    width: 34px;
    height: 34px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 50%;
    color: #4d4640;
    background: #f4eee8;
    cursor: pointer;
  }

  > button svg {
    width: 17px;
  }

  @media (max-width: 420px) {
    padding: 16px;
    align-items: flex-start;

    > i {
      width: 40px;
      height: 40px;
    }

    h2 {
      font-size: 17px;
    }
  }
`;

export const PurchaseCount = styled.div`
  margin: 16px 18px 0;
  padding: 11px 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #eadfd6;
  border-radius: 14px;
  color: #62574e;
  background: #fbf7f2;

  > svg {
    width: 19px;
    color: var(--home-primary, #d64d08);
  }

  span {
    display: flex;
    align-items: baseline;
    gap: 6px;
    font-size: 11px;
  }

  b {
    color: #2a241f;
    font-size: 18px;
  }
`;

export const RewardList = styled.div`
  padding: 12px 18px 18px;
  display: grid;
  gap: 11px;
`;

export const Reward = styled.article<{ $status: 'available' | 'earned' | 'locked' }>`
  min-width: 0;
  padding: 16px;
  border: 1px solid
    ${({ $status }) =>
      $status === 'locked'
        ? '#e8ddd4'
        : 'color-mix(in srgb, var(--home-primary, #d64d08) 35%, #eadfd3)'};
  border-radius: 17px;
  background: ${({ $status }) =>
    $status === 'locked'
      ? '#fff'
      : 'linear-gradient(135deg, #fff, color-mix(in srgb, var(--home-primary, #d64d08) 6%, #fff))'};

  .reward-heading {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .reward-heading > span {
    width: 37px;
    height: 37px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border-radius: 12px;
    color: ${({ $status }) => ($status === 'locked' ? '#8d8178' : '#fff')};
    background: ${({ $status }) =>
      $status === 'locked' ? '#f2ede8' : 'var(--home-primary, #d64d08)'};
  }

  .reward-heading svg {
    width: 18px;
  }

  small {
    color: #8a7e75;
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
  }

  h3 {
    margin: 2px 0 0;
    font-size: 15px;
  }

  > strong {
    display: block;
    margin: 13px 0 3px;
    color: var(--home-primary, #d64d08);
    font-size: 21px;
  }

  > p {
    margin: 0;
    color: #766b63;
    font-size: 12px;
    line-height: 1.45;
  }

  .cycle-copy {
    margin-top: 13px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: #786e66;
    font-size: 10px;
  }

  .cycle-copy b {
    color: #3f3832;
  }

  .reward-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    color: #6f655d;
    font-size: 11px;
  }

  .reward-status {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .reward-status span {
    font-weight: 700;
  }

  .reward-status em {
    color: #91867d;
    font-size: 10px;
    font-style: normal;
  }

  .reward-footer button {
    min-height: 36px;
    padding: 0 13px;
    border: 0;
    border-radius: 10px;
    color: #fff;
    background: var(--home-primary, #d64d08);
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
  }

  .reward-footer button:disabled {
    opacity: 0.65;
    cursor: wait;
  }

  @media (max-width: 420px) {
    padding: 14px;

    .reward-footer {
      align-items: stretch;
      flex-direction: column;
    }

    .reward-footer button {
      width: 100%;
    }
  }
`;

export const Progress = styled.div<{ $value: number }>`
  height: 7px;
  margin: 6px 0 11px;
  overflow: hidden;
  border-radius: 999px;
  background: #ece5df;

  i {
    display: block;
    width: ${({ $value }) => `${Math.max(0, Math.min(100, $value))}%`};
    height: 100%;
    border-radius: inherit;
    background: var(--home-primary, #d64d08);
    transition: width 220ms ease;
  }
`;

export const LoginState = styled.div`
  padding: 18px;
  display: grid;
  gap: 14px;

  > div {
    padding: 15px;
    display: flex;
    align-items: center;
    gap: 11px;
    border-radius: 15px;
    background: #f8f3ed;
  }

  > div > svg {
    flex: 0 0 auto;
    color: var(--home-primary, #d64d08);
  }

  span {
    display: grid;
    gap: 3px;
  }

  small {
    color: #766d65;
    line-height: 1.4;
  }
`;

export const LoginButton = styled.button`
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 13px;
  color: #fff;
  background: var(--home-primary, #d64d08);
  font-weight: 800;
  cursor: pointer;

  svg {
    width: 17px;
  }
`;

export const LoadingState = styled.div`
  margin: 18px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 13px;
  border-radius: 15px;
  background: #f8f3ed;

  > i {
    width: 25px;
    height: 25px;
    flex: 0 0 auto;
    border: 3px solid #eadfd6;
    border-top-color: var(--home-primary, #d64d08);
    border-radius: 50%;
    animation: spin 700ms linear infinite;
  }

  span {
    display: grid;
    gap: 3px;
  }

  small {
    color: #766d65;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    > i {
      animation: none;
    }
  }
`;
