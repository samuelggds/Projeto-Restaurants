import styled from 'styled-components';

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
