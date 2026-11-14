import styled from 'styled-components';

export const SettingsSidebar = styled.aside<{ $visible: boolean }>`
  grid-column: 2;
  grid-row: 1;
  height: 100dvh;
  position: sticky;
  top: 0;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  padding: 24px 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: #d5dae1 transparent;
  display: ${({ $visible }) => ($visible ? 'block' : 'none')};
  &::before {
    content: 'Configurações'; display: block; margin: 0 8px 20px;
    color: #252a31; font: inherit; font-size: 18px; font-weight: 650;
  }
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { border-radius: 999px; background: #d5dae1; }
  &::-webkit-scrollbar-track { background: transparent; }
  @media (max-width: 1080px) { display: none; }
`;

export const Search = styled.label`
  min-height: 44px;
  border: 1px solid #e5e7eb;
  border-radius: 9px;
  background: #f8f9fb;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 24px;
  &:hover { border-color: #ccd3dc; }
  &:focus-within { outline: 2px solid #b94a17; outline-offset: 2px; background: #fff; }
  input { min-width: 0; width: 100%; min-height: 42px; border: 0; outline: 0; background: transparent; color: #303740; font-size: 13px; }
  input::placeholder { color: #7c8590; }
  svg { width: 17px; height: 17px; flex: 0 0 auto; color: #7c8590; }
`;

export const SettingsNav = styled.nav`
  display: grid;
  gap: 22px;
  .settings-group { display: grid; gap: 3px; min-width: 0; }
  .settings-group > small { padding: 0 10px 8px; color: #7c8590; font-size: 12px; font-weight: 650; letter-spacing: .06em; line-height: 1.4; text-transform: uppercase; }
  .settings-empty { padding: 20px 14px; border: 1px dashed #d5dae1; border-radius: 9px; color: #68717d; background: #f8f9fb; font-size: 13px; line-height: 1.6; text-align: center; }
  button {
    width: 100%; min-width: 0; min-height: 44px;
    border: 1px solid transparent; border-radius: 8px; background: transparent;
    color: #555f6b; display: flex; align-items: center; gap: 10px;
    padding: 10px; text-align: left; font-size: 13px; font-weight: 500; line-height: 1.4;
    transition: background 160ms ease, color 160ms ease;
  }
  button:hover { background: #f5f6f8; color: #252a31; }
  button:focus-visible { outline: 3px solid #b94a17; outline-offset: 2px; }
  button.active { border-color: #f0d7c7; background: #fff7f0; color: #a34214; font-weight: 650; }
  svg { width: 18px; height: 18px; flex: 0 0 auto; color: #7c8590; }
  button.active svg { color: #b94a17; }
  @media (prefers-reduced-motion: reduce) { button { transition: none; } }
`;

export const MobileSettingsNav = styled.nav`
  display: none;
  width: 100%; min-width: 0; gap: 8px;
  overflow-x: auto; padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb; background: #fff;
  scrollbar-width: thin; overscroll-behavior-inline: contain;
  scroll-snap-type: inline proximity;
  button {
    flex: 0 0 auto; min-height: 42px; display: inline-flex; align-items: center; gap: 7px;
    scroll-snap-align: start; border: 1px solid #e5e7eb; border-radius: 8px;
    padding: 0 12px; color: #555f6b; background: #fff;
    font-size: 13px; font-weight: 500; white-space: nowrap;
  }
  button:hover { background: #f8f9fb; }
  button svg { width: 16px; height: 16px; }
  button:focus-visible { outline: 3px solid #b94a17; outline-offset: 2px; }
  button.active { border-color: #edc4aa; color: #a34214; background: #fff7f0; font-weight: 650; }
  @media (max-width: 1080px) { display: flex; }
  @media (max-width: 760px) {
    position: sticky; top: 0; z-index: 30; padding: 10px;
    body:has([aria-modal='true']) & { z-index: 0; }
  }
`;
