import styled from 'styled-components';

export const Sidebar = styled.aside`
  position: sticky;
  top: 0;
  z-index: 80;
  height: 100dvh;
  min-width: 0;
  padding: 16px 12px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  color: #f4f8f5;
  background: #1c1c1c;
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
  border-radius: 7px;
  display: grid;
  place-items: center;
  color: #aebbb5;
  background: rgba(255, 255, 255, 0.05);

  svg {
    width: 17px;
  }
`;

export const Brand = styled.div`
  min-width: 0;
  padding: 5px 4px 18px;
  display: flex;
  min-height: 66px;
  align-items: center;
  gap: 11px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);

  > img { width:36px;height:36px;object-fit:contain;flex-shrink:0; }
  b {font-size:19px;color:#fff;font-weight:800;white-space:nowrap;}
  b span {color:#ff4d24;}

`;

export const Nav = styled.nav`
  margin-top: 17px;
  display: grid;
  gap: 5px;

  button {
    width: 100%;
    min-height: 46px;
    min-width: 0;
    padding: 0 12px;
    border: 0;
    border-radius: 7px;
    display: flex;
    align-items: center;
    gap: 11px;
    color: #a5aaa7;
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
    background: rgba(255,255,255,.09);
    box-shadow: inset 3px 0 0 #ff6b35;
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
  background: #bd4708;
  font-size: 9px;
  font-weight: 800;
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
    border: 1px solid color-mix(in srgb, var(--brand) 55%, transparent);
    border-radius: 8px;
    display: grid;
    place-items: center;
    color: #fff;
    background: color-mix(in srgb, var(--brand) 28%, #20332d);
    font-size: 12px;
    font-weight: 800;
  }

  span:not(.avatar) {
    min-width: 0;
    display: grid;
    gap: 2px;
  }

  b {
    overflow: hidden;
    color: #edf4ef;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    color: #84978e;
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
    color: #aab9b2;
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
  border-radius: 0 8px 8px 0;
  display: grid;
  place-items: center;
  color: #c4d0ca;
  background: #1b2c26;
  box-shadow: 4px 0 15px rgba(17, 29, 25, 0.24);
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
    padding: 6px max(5px, env(safe-area-inset-right, 0px))
      max(6px, env(safe-area-inset-bottom, 0px))
      max(5px, env(safe-area-inset-left, 0px));
    display: grid;
    /* Cinco destinos oficiais do garçom, sem Reservas ou uma aba genérica Pedidos. */
    grid-template-columns: repeat(5, minmax(0, 1fr));
    grid-template-rows: minmax(0, 1fr);
    align-items: stretch;
    box-sizing: border-box;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: #1c1c1c;
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.18);

    button {
      min-width: 0;
      min-height: 48px;
      padding: 5px 1px;
      border: 0;
      border-radius: 9px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      overflow: hidden;
      color: #a5aaa7;
      background: transparent;
      font: inherit;
      font-size: clamp(8px, 2.4vw, 10px);
      font-weight: 750;
      line-height: 1.2;
    }

    button:hover { color: #fff; background: rgba(255, 255, 255, 0.06); }

    button.active {
      color: #fff;
      background: rgba(255, 255, 255, 0.09);
      box-shadow: inset 0 3px 0 #ff6b35;
    }
    button:focus-visible { outline: 2px solid #ff9a68; outline-offset: -2px; }

    .mobile-nav-icon {
      position: relative;
      flex: 0 0 auto;
      display: grid;
      place-items: center;
    }

    .mobile-nav-label {
      display: block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    svg {
      width: 19px;
      height: 19px;
    }

    i {
      position: absolute;
      top: -7px;
      right: -10px;
      min-width: 15px;
      height: 15px;
      padding: 0 3px;
      border: 2px solid #1c1c1c;
      border-radius: 999px;
      display: grid;
      place-items: center;
      color: #fff;
      background: #bd4708;
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
    color: #52625b;
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
    inset: 0;
    z-index: 90;
    width: 100%;
    border: 0;
    display: block;
    background: rgba(14, 25, 21, 0.48);
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
    z-index: 95;
    max-height: calc(100dvh - 100px - env(safe-area-inset-bottom));
    overflow-y: auto;
    padding: 14px;
    display: grid;
    gap: 7px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    background: #242424;
    color: #f4f8f5;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35);

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
      color: #fff;
      font-size: 14px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    header small {
      color: #a5aaa7;
      font-size: 10px;
    }

    header button {
      width: 44px;
      height: 44px;
      flex-shrink: 0;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 7px;
      display: grid;
      place-items: center;
      color: #fff;
      background: #323232;
    }

    > button {
      min-height: 44px;
      padding: 0 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 7px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #ccd4d0;
      background: #303030;
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      text-align: left;
    }

    > button.active {
      color: #fff;
      border-color: rgba(255, 255, 255, 0.12);
      background: #383838;
      box-shadow: inset 3px 0 0 #ff6b35;
    }

    > button.logout {
      color: #ffd6cd;
      border-color: rgba(255, 138, 110, 0.22);
      background: #452a27;
    }
    > button:focus-visible, header button:focus-visible {
      outline: 2px solid #ff9a68;
      outline-offset: 2px;
    }

    svg {
      width: 18px;
    }
  }
`;

export const RestaurantIdentity = styled.div`
  display:grid;gap:5px;background:#292929;padding:12px;border-radius:10px;margin:7px 2px 18px;
  b{color:#fff;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  small{color:#a5aaa7;font-size:11px}
`;
export const SectionLabel = styled.p`
  font-size:10px;font-weight:800;color:#8c918e;margin:0 10px 5px;letter-spacing:.04em;
`;
export const ShiftStatus = styled.div<{ $tone:'open'|'closed'|'unknown' }>`
  border:1px solid rgba(255,255,255,.1);border-radius:10px;
  display:grid;gap:7px;padding:13px 12px;margin:20px 2px 8px;
  small{color:#a5aaa7;font-size:11px;}
  b{color:#fff;font-size:13px;}
  span{color:${p=>p.$tone==='open'?'#a8c8b7':p.$tone==='closed'?'#ff6b66':'#a5aaa7'};font-size:11px;}
  span:before{content:'';display:inline-block;background:currentColor;border-radius:50%;
    width:7px;height:7px;margin-right:8px;}
`;
