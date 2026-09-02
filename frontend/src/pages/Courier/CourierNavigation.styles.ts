import styled from 'styled-components';
import * as L from '../kitchen/Kitchen.styles';

export const Sidebar = styled.aside`
  position: sticky;
  top: 0;
  z-index: 80;
  height: 100dvh;
  padding: 18px 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: #f7faf8;
  background: linear-gradient(180deg, #1d2823 0%, #111915 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.07);

  @media (max-width: 820px) {
    display: none;
  }
`;

export const Brand = styled.div`
  display: grid;
  grid-template-columns: 44px 1fr;
  align-items: center;
  gap: 12px;
  padding: 6px 8px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);

  span {
    grid-row: 1 / span 2;
    width: 44px;
    height: 44px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    color: #fff;
    background: var(--courier-primary);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.24);
    font:
      800 16px/1 'Plus Jakarta Sans',
      sans-serif;
  }

  b {
    align-self: end;
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    align-self: start;
    color: #91a097;
    font-size: 8px;
    text-transform: uppercase;
  }
`;

export const Nav = styled.nav`
  display: grid;
  gap: 5px;
  margin-top: 18px;

  button {
    width: 100%;
    min-height: 44px;
    padding: 0 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 0;
    border-radius: 7px;
    color: #abb7b0;
    background: transparent;
    font: inherit;
    font-size: 12px;
    font-weight: 650;
    text-align: left;
    transition: 0.18s ease;
  }

  button:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.06);
  }

  button.active {
    color: #fff;
    background: var(--courier-primary);
    box-shadow: 0 7px 18px color-mix(in srgb, var(--courier-primary) 28%, transparent);
  }

  svg {
    width: 19px;
    flex-shrink: 0;
  }
`;

export const NavBadge = styled.span`
  min-width: 20px;
  margin-left: auto;
  padding: 1px 7px;
  border-radius: 999px;
  color: #fff;
  background: rgba(255, 255, 255, 0.24);
  font-size: 10px;
  font-weight: 800;
  text-align: center;
`;

export const SupportNav = styled(Nav)`
  margin-top: auto;
  padding: 16px 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
`;

export const UserBlock = styled.div`
  margin-top: 8px;
  padding: 10px 8px 2px;
  display: grid;
  grid-template-columns: 38px 1fr 34px;
  align-items: center;
  gap: 10px;

  .avatar {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    border: 1px solid color-mix(in srgb, var(--courier-primary) 60%, transparent);
    border-radius: 8px;
    color: #fff;
    background: color-mix(in srgb, var(--courier-primary) 34%, #1d2823);
    font-weight: 800;
  }

  span:not(.avatar) {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  b {
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: #7f929e;
    font-size: 10px;
  }

  button {
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 7px;
    display: grid;
    place-items: center;
    color: #aab6bd;
    background: rgba(255, 255, 255, 0.06);
  }

  button:hover {
    color: #fff;
    background: rgba(229, 62, 62, 0.22);
  }

  svg {
    width: 17px;
  }
`;

export const SidebarOpenControl = styled(L.SidebarOpenTab)`
  @media (max-width: 820px) {
    display: none;
  }
`;

export const MobileNav = styled.nav`
  display: none;

  @media (max-width: 820px) {
    position: fixed;
    inset: auto 0 0;
    z-index: 80;
    height: calc(74px + env(safe-area-inset-bottom));
    padding: 6px 6px max(6px, env(safe-area-inset-bottom));
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    border-top: 1px solid var(--courier-line);
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 -8px 24px rgba(24, 32, 29, 0.08);

    button {
      min-width: 0;
      border: 0;
      border-radius: 7px;
      display: grid;
      place-items: center;
      align-content: center;
      gap: 3px;
      color: #737f79;
      background: transparent;
      font: inherit;
      font-size: 9px;
      font-weight: 700;
    }

    button.active {
      color: color-mix(in srgb, var(--courier-primary) 80%, #1d2823);
      background: color-mix(in srgb, var(--courier-primary) 10%, #fff);
    }

    button > span {
      position: relative;
      display: grid;
      place-items: center;
    }

    svg {
      width: 19px;
    }

    i {
      position: absolute;
      top: -7px;
      right: -10px;
      min-width: 15px;
      height: 15px;
      padding: 0 3px;
      border: 2px solid #fff;
      border-radius: 999px;
      display: grid;
      place-items: center;
      color: #fff;
      background: #cf3f2f;
      font-size: 8px;
      font-style: normal;
    }
  }
`;

export const MoreBackdrop = styled.button`
  display: none;

  @media (max-width: 820px) {
    position: fixed;
    inset: 0 0 calc(74px + env(safe-area-inset-bottom));
    z-index: 71;
    display: block;
    width: 100%;
    border: 0;
    background: rgba(14, 20, 17, 0.48);
    backdrop-filter: blur(2px);
  }
`;

export const MoreSheet = styled.section`
  display: none;

  @media (max-width: 820px) {
    position: fixed;
    right: 8px;
    bottom: calc(82px + env(safe-area-inset-bottom));
    left: 8px;
    z-index: 75;
    padding: 14px;
    display: grid;
    gap: 7px;
    border: 1px solid var(--courier-line);
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 18px 50px rgba(14, 20, 17, 0.24);

    header {
      min-height: 38px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    h2 {
      margin: 0;
      color: var(--courier-ink);
      font-size: 15px;
    }

    header button {
      width: 36px;
      height: 36px;
      padding: 0;
      justify-content: center;
    }

    & > button,
    header button {
      min-height: 44px;
      padding: 0 12px;
      border: 1px solid var(--courier-line);
      border-radius: 7px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #445049;
      background: #f8faf8;
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      text-align: left;
    }

    & > button.active {
      color: color-mix(in srgb, var(--courier-primary) 80%, #1d2823);
      border-color: color-mix(in srgb, var(--courier-primary) 35%, var(--courier-line));
      background: color-mix(in srgb, var(--courier-primary) 8%, #fff);
    }

    & > button.logout {
      color: #9d352e;
      border-color: #efd0cc;
      background: #fff5f4;
    }

    svg {
      width: 18px;
    }
  }
`;
