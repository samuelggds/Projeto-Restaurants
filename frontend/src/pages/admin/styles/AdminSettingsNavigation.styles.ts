import styled from 'styled-components';

export const SettingsSidebar = styled.aside<{ $visible: boolean }>`
  height: 100dvh;
  position: sticky;
  top: 0;
  background: linear-gradient(180deg, #fffdfb 0%, #f8f5f1 100%);
  border-right: 1px solid #e7e0d8;
  padding: 20px 14px 22px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: #d8cec4 transparent;
  display: ${({ $visible }) => ($visible ? 'block' : 'none')};

  &::before {
    content: 'Configurações';
    display: block;
    margin: 2px 8px 14px;
    color: #29231f;
    font-family: 'Sora', sans-serif;
    font-size: 17px;
    font-weight: 750;
    letter-spacing: -0.02em;
  }

  &::-webkit-scrollbar {
    width: 7px;
  }
  &::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: #d8cec4;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }

  @media (max-width: 1080px) {
    display: none;
  }
`;

export const Search = styled.label`
  min-height: 46px;
  border: 1px solid #e2dad2;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.94);
  padding: 0 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  box-shadow: 0 5px 16px rgba(54, 42, 32, 0.035);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    background 180ms ease,
    transform 180ms ease;
  &:hover {
    border-color: #d5ccc3;
    transform: translateY(-1px);
  }
  &:focus-within {
    border-color: color-mix(in srgb, var(--a) 60%, #fff);
    background: #fff;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--a) 10%, transparent);
    transform: translateY(0);
  }
  input {
    min-width: 0;
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: #2d2824;
    font-size: 12px;
  }
  input::placeholder {
    color: #958b83;
  }
  svg {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
    color: #766d66;
  }
`;

export const SettingsNav = styled.nav`
  display: grid;
  gap: 12px;

  .settings-group {
    display: grid;
    gap: 3px;
    padding: 8px;
    border: 1px solid rgba(226, 218, 210, 0.9);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.72);
    box-shadow: 0 7px 22px rgba(58, 44, 34, 0.035);
    animation: settings-group-enter 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .settings-group:nth-child(2) {
    animation-delay: 45ms;
  }
  .settings-group:nth-child(3) {
    animation-delay: 90ms;
  }

  .settings-group > small {
    padding: 4px 8px 7px;
    color: #8c827a;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.12em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .settings-empty {
    padding: 18px 14px;
    border: 1px dashed #ddd2c8;
    border-radius: 12px;
    color: var(--muted);
    background: rgba(255, 255, 255, 0.65);
    font-size: 11px;
    line-height: 1.5;
    text-align: center;
    animation: settings-group-enter 260ms ease both;
  }

  button {
    position: relative;
    width: 100%;
    min-height: 48px;
    border: 1px solid transparent;
    border-radius: 10px;
    background: transparent;
    color: #5a524c;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.25;
    transition:
      border-color 210ms cubic-bezier(0.22, 1, 0.36, 1),
      background 210ms cubic-bezier(0.22, 1, 0.36, 1),
      color 210ms cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 240ms cubic-bezier(0.22, 1, 0.36, 1),
      transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  button::after {
    content: '›';
    margin-left: auto;
    color: #a79d95;
    font-size: 19px;
    font-weight: 500;
    opacity: 0;
    transform: translateX(-4px);
    transition:
      opacity 180ms ease,
      transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
      color 180ms ease;
  }

  button:hover {
    border-color: #ece4dd;
    background: #fbf8f5;
    color: #2c2723;
    transform: translateX(2px);
  }

  button:hover::after,
  button.active::after {
    opacity: 1;
    transform: translateX(0);
  }

  button:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a) 18%, transparent);
    outline-offset: 2px;
  }

  button.active {
    border-color: color-mix(in srgb, var(--a) 24%, #eadfd6);
    background: color-mix(in srgb, var(--a) 8%, #fff);
    color: #2a2521;
    font-weight: 750;
    box-shadow:
      inset 3px 0 var(--a),
      0 7px 17px color-mix(in srgb, var(--a) 7%, transparent);
    transform: translateX(0);
  }

  button.active::after {
    color: var(--a);
  }

  svg {
    width: 32px;
    height: 32px;
    flex: 0 0 auto;
    padding: 7px;
    border-radius: 9px;
    color: #71675f;
    background: #f3efea;
    transition:
      color 180ms ease,
      background 180ms ease,
      box-shadow 220ms ease,
      transform 240ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  button:hover svg {
    color: var(--a);
    background: #fff;
    box-shadow: 0 3px 10px rgba(55, 41, 31, 0.07);
    transform: scale(1.04);
  }

  button.active svg {
    color: #fff;
    background: var(--a);
    box-shadow: 0 5px 12px color-mix(in srgb, var(--a) 24%, transparent);
    animation: settings-active-icon 300ms cubic-bezier(0.22, 1.35, 0.36, 1) both;
  }

  @keyframes settings-group-enter {
    from {
      opacity: 0;
      transform: translateY(7px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes settings-active-icon {
    0% {
      transform: scale(0.92);
    }
    70% {
      transform: scale(1.06);
    }
    100% {
      transform: scale(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .settings-group,
    .settings-empty,
    button.active svg {
      animation: none;
    }
    button,
    button::after,
    svg {
      transition: none;
    }
  }
`;

export const MobileSettingsNav = styled.nav`
  display: none;
  width: 100%;
  min-width: 0;
  gap: 8px;
  overflow-x: auto;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: rgba(255, 253, 249, 0.97);
  box-shadow: 0 5px 16px rgba(48, 36, 28, 0.035);
  scrollbar-width: thin;
  overscroll-behavior-inline: contain;
  scroll-snap-type: inline proximity;

  button {
    flex: 0 0 auto;
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    scroll-snap-align: start;
    border: 1px solid #e4ddd5;
    border-radius: 10px;
    padding: 0 12px;
    color: #625a53;
    background: #fff;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    box-shadow: 0 3px 10px rgba(48, 36, 28, 0.025);
    transition:
      border-color 180ms ease,
      color 180ms ease,
      background 180ms ease,
      box-shadow 220ms ease,
      transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  button:hover {
    transform: translateY(-1px);
  }

  button svg {
    width: 15px;
    height: 15px;
    transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  button:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--a) 16%, transparent);
    outline-offset: 2px;
  }

  button.active {
    border-color: color-mix(in srgb, var(--a) 34%, #e3d7cd);
    color: color-mix(in srgb, var(--a) 88%, #2d2722);
    background: color-mix(in srgb, var(--a) 8%, white);
    box-shadow: 0 6px 15px color-mix(in srgb, var(--a) 9%, transparent);
    transform: translateY(-1px);
  }

  button.active svg {
    transform: scale(1.08);
  }

  @media (max-width: 1080px) {
    display: flex;
  }

  @media (max-width: 760px) {
    position: sticky;
    top: 0;
    z-index: 30;
    padding: 9px 10px;

    body:has([aria-modal='true']) & {
      z-index: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    button,
    button svg {
      transition: none;
    }
  }
`;