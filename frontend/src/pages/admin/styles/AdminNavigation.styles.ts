import styled from 'styled-components';

export const MainSidebar = styled.aside`
  height: 100dvh;
  position: sticky;
  top: 0;
  overflow: hidden;
  background: linear-gradient(180deg, #282320 0%, #17191a 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.07);
  color: #f7f3ef;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  z-index: 80;
  @media (max-width: 820px) {
    display: none;
  }
`;
export const Brand = styled.div`
  min-width: 0;
  padding: 5px 8px 18px;
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  align-items: center;
  gap: 11px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  > span {
    grid-row: 1 / span 2;
    width: 44px;
    height: 44px;
    border-radius: 8px;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--brand);
    box-shadow: 0 8px 18px color-mix(in srgb, var(--brand) 24%, rgba(0, 0, 0, 0.22));
    font-family: 'Sora', sans-serif;
    font-size: 15px;
    font-weight: 800;
  }
  > b {
    align-self: end;
    overflow: hidden;
    color: #fff;
    font-size: 13px;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  > small {
    align-self: start;
    color: #9b918b;
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
  }
`;
export const MainNav = styled.nav`
  min-height: 0;
  display: grid;
  gap: 5px;
  margin-top: 17px;
  overflow-y: auto;
  button {
    width: 100%;
    min-width: 0;
    min-height: 46px;
    padding: 0 12px;
    border: 0;
    border-radius: 7px;
    display: flex;
    align-items: center;
    gap: 11px;
    color: #bfb6b0;
    background: transparent;
    font-size: 12px;
    font-weight: 650;
    text-align: left;
    transition:
      color 180ms ease,
      background 180ms ease,
      box-shadow 180ms ease;
  }
  button:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.06);
  }
  button.active {
    color: #fff;
    background: var(--brand);
    box-shadow: 0 7px 18px color-mix(in srgb, var(--brand) 28%, transparent);
  }
  svg {
    width: 19px;
    flex: 0 0 auto;
  }
`;
export const SideFooter = styled.div`
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  padding: 13px 0 0;
  display: grid;
  gap: 5px;
  > button {
    width: 100%;
    min-height: 44px;
    padding: 0 12px;
    border: 0;
    border-radius: 7px;
    display: flex;
    align-items: center;
    gap: 11px;
    color: #bfb6b0;
    background: transparent;
    font-size: 12px;
    font-weight: 650;
    text-align: left;
  }
  > button:hover,
  > button.active {
    color: #fff;
    background: rgba(255, 255, 255, 0.06);
  }
  > button > svg {
    width: 19px;
  }
  .unread-badge {
    min-width: 19px;
    height: 19px;
    margin-left: auto;
    padding: 0 5px;
    border-radius: 999px;
    color: #fff;
    background: #e64a19;
    display: grid;
    place-items: center;
    font-size: 10px;
    font-weight: 800;
    line-height: 1;
  }
`;

export const CollapseButton = styled.button`
  align-self: flex-end;
  width: 30px;
  height: 30px;
  margin-bottom: 10px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 7px;
  display: grid;
  place-items: center;
  color: #c8beb8;
  background: rgba(255, 255, 255, 0.05);
  svg {
    width: 17px;
  }
`;

export const SidebarOpenButton = styled.button`
  position: fixed;
  top: 50%;
  left: 0;
  z-index: 81;
  width: 24px;
  height: 58px;
  padding: 0;
  border: 0;
  border-radius: 0 7px 7px 0;
  display: grid;
  place-items: center;
  color: #ddd3cd;
  background: #282320;
  box-shadow: 4px 0 15px rgba(31, 25, 21, 0.24);
  transform: translateY(-50%);
  svg {
    width: 15px;
  }
  @media (max-width: 820px) {
    display: none;
  }
`;

export const SidebarUser = styled.div`
  margin-top: 5px;
  padding: 8px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 9px;
  .avatar {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--brand) 55%, transparent);
    border-radius: 8px;
    color: #fff;
    background: color-mix(in srgb, var(--brand) 26%, #282320);
    font-size: 11px;
    font-weight: 800;
  }
  > span:not(.avatar) {
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  b {
    overflow: hidden;
    color: #f8f3ef;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    color: #908680;
    font-size: 9px;
  }
  button {
    width: 34px;
    height: 34px;
    padding: 0;
    border: 0;
    border-radius: 7px;
    display: grid;
    place-items: center;
    color: #bfb5ae;
    background: rgba(255, 255, 255, 0.06);
  }
  button:hover {
    color: #fff;
    background: rgba(207, 73, 61, 0.24);
  }
  svg {
    width: 17px;
  }
`;

export const MobileBottomNav = styled.nav`
  display: none;
  @media (max-width: 820px) {
    position: fixed;
    inset: auto 0 0;
    z-index: 80;
    height: calc(72px + env(safe-area-inset-bottom));
    padding: 6px 7px max(6px, env(safe-area-inset-bottom));
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    border-top: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 -8px 24px rgba(38, 28, 22, 0.09);
    button {
      min-width: 0;
      padding: 0 3px;
      border: 0;
      border-radius: 7px;
      display: grid;
      place-items: center;
      align-content: center;
      gap: 3px;
      color: #7d7068;
      background: transparent;
      font-size: 9px;
      font-weight: 750;
    }
    button.active {
      color: color-mix(in srgb, var(--brand) 82%, #2a211c);
      background: color-mix(in srgb, var(--brand) 9%, #fff);
    }
    button > span {
      position: relative;
      display: grid;
      place-items: center;
    }
    button > span i {
      position: absolute;
      top: -4px;
      right: -6px;
      width: 8px;
      height: 8px;
      border: 2px solid #fff;
      border-radius: 50%;
      background: var(--brand);
    }
    svg {
      width: 19px;
    }
    body:has([aria-modal='true']) & {
      z-index: 0;
    }
  }
`;

export const MobileBackdrop = styled.button`
  display: none;
  @media (max-width: 820px) {
    position: fixed;
    inset: 0 0 calc(72px + env(safe-area-inset-bottom));
    z-index: 71;
    width: 100%;
    padding: 0;
    border: 0;
    display: block;
    background: rgba(24, 19, 16, 0.5);
    backdrop-filter: blur(2px);
  }
`;

export const MobileMoreSheet = styled.section`
  display: none;
  @media (max-width: 820px) {
    position: fixed;
    right: 8px;
    bottom: calc(80px + env(safe-area-inset-bottom));
    left: 8px;
    z-index: 75;
    max-height: calc(100dvh - 168px - env(safe-area-inset-bottom));
    padding: 14px;
    overflow-y: auto;
    display: grid;
    gap: 7px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 18px 50px rgba(24, 19, 16, 0.26);
    header {
      min-height: 48px;
      padding-bottom: 7px;
      display: grid;
      grid-template-columns: 40px minmax(0, 1fr);
      align-items: center;
      gap: 10px;
      border-bottom: 1px solid var(--border);
    }
    header .avatar {
      width: 40px;
      height: 40px;
      display: grid;
      place-items: center;
      border-radius: 8px;
      color: #fff;
      background: var(--brand);
      font-size: 11px;
      font-weight: 800;
    }
    header > span:not(.avatar),
    > button > span {
      min-width: 0;
      display: grid;
      gap: 2px;
    }
    header b,
    > button b {
      overflow: hidden;
      color: #2b2521;
      font-size: 12px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    header small,
    > button small {
      color: var(--muted);
      font-size: 9px;
    }
    > button {
      min-height: 49px;
      padding: 0 12px;
      border: 1px solid var(--border);
      border-radius: 7px;
      display: grid;
      grid-template-columns: 20px minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      color: #51453e;
      background: #fbf9f7;
      text-align: left;
    }
    > button.active {
      color: var(--brand);
      border-color: color-mix(in srgb, var(--brand) 32%, var(--border));
      background: color-mix(in srgb, var(--brand) 7%, #fff);
    }
    > button.active b {
      color: var(--brand);
    }
    > button.logout {
      color: #9d352e;
      border-color: #efd0cc;
      background: #fff5f4;
    }
    > button > svg {
      width: 18px;
    }
    > button > svg:last-child {
      width: 15px;
      color: #a89e97;
    }
    .unread-badge {
      min-width: 20px;
      padding: 3px 6px;
      border-radius: 999px;
      color: #fff;
      background: #c83f31;
      font-size: 8px;
      font-weight: 800;
      text-align: center;
    }
  }
`;
