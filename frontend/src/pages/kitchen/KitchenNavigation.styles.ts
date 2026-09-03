import styled from 'styled-components';

export const Sidebar = styled.aside`
  position: sticky;
  top: 0;
  z-index: 80;
  height: 100dvh;
  min-width: 0;
  padding: 16px 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: #f4fbf8;
  background: linear-gradient(180deg, #203432 0%, #122220 100%);
  border-right: 1px solid rgba(255, 255, 255, 0.07);

  @media (max-width: 820px) {
    display: none;
  }
`;

export const CollapseButton = styled.button`
  align-self: flex-end;
  width: 30px;
  height: 30px;
  margin-bottom: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: #b8cbc5;
  background: rgba(255, 255, 255, 0.05);

  svg {
    width: 17px;
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
    border-radius: 7px;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--brand);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.24);
    font-family: 'Sora', sans-serif;
    font-size: 15px;
    font-weight: 800;
  }

  b {
    align-self: end;
    overflow: hidden;
    color: #f4fbf8;
    display: -webkit-box;
    font-size: 11px;
    line-height: 1.25;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  small {
    align-self: start;
    color: #8eaaa2;
    font-size: 8px;
    font-weight: 750;
    text-transform: uppercase;
  }
`;

export const Nav = styled.nav`
  margin-top: 18px;
  display: grid;
  gap: 5px;

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
    color: #a9beb8;
    background: transparent;
    font: inherit;
    font-size: 12px;
    font-weight: 650;
    text-align: left;
    transition: 180ms ease;
  }

  button:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.06);
  }

  button.active {
    color: #fff;
    background: var(--brand);
    box-shadow: 0 7px 18px color-mix(in srgb, var(--brand) 30%, transparent);
  }

  svg {
    width: 19px;
    flex-shrink: 0;
  }
`;

export const NavBadge = styled.span`
  min-width: 20px;
  margin-left: auto;
  padding: 2px 6px;
  border-radius: 999px;
  color: #fff;
  background: rgba(255, 255, 255, 0.22);
  font-size: 9px;
  font-weight: 850;
  text-align: center;
`;

export const SupportNav = styled(Nav)`
  margin-top: auto;
  padding-top: 13px;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
`;

export const User = styled.div`
  margin-top: 8px;
  padding: 9px 8px 2px;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 9px;

  .avatar {
    width: 38px;
    height: 38px;
    border: 1px solid color-mix(in srgb, var(--brand) 60%, transparent);
    border-radius: 7px;
    display: grid;
    place-items: center;
    color: #fff;
    background: color-mix(in srgb, var(--brand) 27%, #28211d);
    font-size: 12px;
    font-weight: 850;
  }

  span:not(.avatar) {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  b {
    overflow: hidden;
    color: #edf8f4;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: #8ba49d;
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
    color: #a7bbb5;
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
  color: #c8d8d3;
  background: #203432;
  box-shadow: 4px 0 15px rgba(18, 34, 32, 0.26);
  transform: translateY(-50%);

  svg {
    width: 15px;
  }

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
    height: calc(72px + env(safe-area-inset-bottom));
    padding: 6px 7px max(6px, env(safe-area-inset-bottom));
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
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
      font: inherit;
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
      background: #c83f31;
      font-size: 8px;
      font-style: normal;
    }
  }
`;

export const MobileMoreButton = styled.button`
  display: none;

  @media (max-width: 820px) {
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 7px;
    display: grid;
    place-items: center;
    color: #655850;
    background: #fff;

    svg {
      width: 19px;
    }
  }
`;

export const MoreBackdrop = styled.button`
  display: none;

  @media (max-width: 820px) {
    position: fixed;
    inset: 0 0 calc(72px + env(safe-area-inset-bottom));
    z-index: 71;
    width: 100%;
    border: 0;
    display: block;
    background: rgba(24, 19, 16, 0.5);
    backdrop-filter: blur(2px);
  }
`;

export const MoreSheet = styled.section`
  display: none;

  @media (max-width: 820px) {
    position: fixed;
    right: 8px;
    bottom: calc(80px + env(safe-area-inset-bottom));
    left: 8px;
    z-index: 75;
    padding: 14px;
    display: grid;
    gap: 7px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 18px 50px rgba(24, 19, 16, 0.26);

    header {
      min-height: 42px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    header span {
      min-width: 0;
      display: grid;
      gap: 2px;
    }

    header b {
      overflow: hidden;
      color: var(--ink);
      font-size: 14px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    header small {
      color: var(--muted);
      font-size: 10px;
    }

    > button {
      min-height: 44px;
      padding: 0 12px;
      border: 1px solid var(--border);
      border-radius: 7px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #51453e;
      background: #fbf9f7;
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      text-align: left;
    }

    > button.active {
      color: var(--brand);
      border-color: color-mix(in srgb, var(--brand) 32%, var(--border));
      background: color-mix(in srgb, var(--brand) 7%, #fff);
    }

    > button.logout {
      color: #9d352e;
      border-color: #efd0cc;
      background: #fff5f4;
    }

    svg {
      width: 18px;
    }
  }
`;
