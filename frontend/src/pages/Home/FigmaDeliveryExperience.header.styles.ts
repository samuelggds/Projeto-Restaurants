import styled from 'styled-components';

export const Header = styled.header`
  height:80px;
  padding:0 max(24px,calc((100vw - 1120px) / 2));
  border-bottom:1px solid var(--delivery-line);
  background:#fff;
  display:grid;
  grid-template-columns:minmax(390px,1fr) minmax(360px,571px) minmax(300px,1fr);
  align-items:center;
  gap:6px;
  position:sticky;
  top:0;
  z-index:30;
  box-shadow:0 2px 12px rgba(25,24,21,.03);

  .header-left{
    min-width:0;
    display:flex;
    align-items:center;
    gap:18px;
  }

  .brand{
    min-width:0;
    padding:0;
    border:0;
    background:transparent;
    color:inherit;
    display:flex;
    align-items:center;
    gap:10px;
    text-align:left;
  }

  .logo{
    width:44px;
    height:44px;
    border-radius:10px;
    overflow:hidden;
    flex:0 0 44px;
    display:grid;
    place-items:center;
    background:var(--delivery-primary);
    color:#fff;
    font-family:'Gabarito','Inter',sans-serif;
    font-size:20px;
    font-weight:850;
  }

  .logo img{width:100%;height:100%;object-fit:cover}
  .brand-copy{min-width:0;display:grid;gap:1px}
  .brand-copy > b{
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    font-family:'Gabarito','Inter',sans-serif;
    font-size:16px;
    line-height:20px;
  }
  .platform-label{
    color:#8a8883;
    font-size:11px;
    line-height:14px;
  }
  .brand-meta{display:none}
  .status{
    min-width:0;
    display:flex;
    align-items:center;
    gap:5px;
    color:var(--delivery-muted);
    font-size:10px;
  }
  .status i{width:6px;height:6px;flex:0 0 6px;border-radius:50%;background:#e5484d}
  .status i.open{background:#33b864}
  .status strong{color:#2d9e56;font:inherit;font-weight:650;white-space:nowrap}
  .status i:not(.open) + strong{color:#cf4545}
  .status em{color:#b6b3ae;font-style:normal}
  .status small{
    min-width:0;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    color:#96928c;
    font-size:inherit;
  }

  .desktop-fulfillment{
    display:flex;
    align-items:center;
    gap:4px;
    padding:3px;
    border-radius:10px;
    background:#f3f3f1;
  }
  .desktop-fulfillment button{
    min-height:34px;
    padding:0 12px;
    border:0;
    border-radius:8px;
    background:transparent;
    color:#696761;
    display:flex;
    align-items:center;
    gap:6px;
    font-size:12px;
    font-weight:700;
  }
  .desktop-fulfillment button.active{
    background:var(--delivery-primary);
    color:#fff;
    box-shadow:0 4px 12px rgba(255,75,75,.18);
  }
  .desktop-fulfillment svg{width:13px;height:13px}

  .actions{
    justify-self:end;
    display:flex;
    align-items:center;
    gap:14px;
  }
  .account{
    min-width:0;
    border:0;
    background:transparent;
    color:var(--delivery-text);
    display:flex;
    align-items:center;
    gap:9px;
    text-align:left;
  }
  .account-avatar{
    width:36px;
    height:36px;
    flex:0 0 36px;
    border-radius:50%;
    overflow:hidden;
    background:#f1f1ef;
    color:#55524d;
    display:grid;
    place-items:center;
    font-size:11px;
    font-weight:800;
  }
  .account-avatar img{
    width:100%;
    height:100%;
    display:block;
    object-fit:cover;
    object-position:center;
  }
  .account-copy{min-width:0;display:grid;gap:0}
  .account-copy small{color:#8b8882;font-size:9px;line-height:11px}
  .account-copy b{
    max-width:84px;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    font-size:12px;
    line-height:15px;
  }
  .cart{
    min-height:42px;
    padding:0 14px;
    border:0;
    border-radius:9px;
    background:var(--delivery-primary);
    color:#fff;
    display:flex;
    align-items:center;
    gap:8px;
    font-weight:750;
    font-size:12px;
  }
  .cart i{
    min-width:20px;
    height:20px;
    padding:0 5px;
    border-radius:10px;
    background:#23221f;
    display:grid;
    place-items:center;
    font-size:10px;
    font-style:normal;
  }

  .mobile-location-row,
  .mobile-fulfillment,
  .mobile-meta,
  .mobile-profile-trigger,
  .mobile-header-search,
  .mobile-back{display:none}

  @media(max-width:1100px){
    grid-template-columns:minmax(300px,1fr) minmax(300px,440px) auto;
    padding-inline:24px;
    .platform-label{display:none}
    .desktop-fulfillment button{padding-inline:9px}
    .account-copy{display:none}
  }

  @media(max-width:900px){
    grid-template-columns:minmax(0,1fr) minmax(260px,380px) auto;
    .desktop-fulfillment{display:none}
    .header-left{gap:8px}
    .cart span{display:none}
  }

  @media(max-width:760px){
    position:static;
    height:auto;
    min-height:0;
    padding:7px 12px 10px;
    gap:7px;
    grid-template-columns:minmax(0,1fr);
    align-items:center;
    border-bottom:0;
    box-shadow:none;

    .actions{display:none}

    .mobile-location-row{
      min-width:0;
      min-height:31px;
      display:grid;
      grid-template-columns:minmax(0,1fr) 32px;
      align-items:center;
      gap:8px;
    }

    .mobile-location-row > .mobile-address-trigger{
      width:100%;
      min-width:0;
      padding:0;
      border:0;
      background:transparent;
      color:var(--delivery-text);
      display:grid;
      grid-template-columns:12px minmax(0,1fr) 12px;
      align-items:center;
      gap:5px;
      text-align:left;
    }
    .mobile-location-row > .mobile-address-trigger:disabled{cursor:default;opacity:1}
    .mobile-location-row > .mobile-address-trigger > svg{width:11px;height:11px;color:#8a8781}
    .mobile-location-row > .mobile-address-trigger > span{min-width:0;display:grid;gap:0}
    .mobile-location-row > .mobile-address-trigger small{
      color:#9b9892;
      font-size:7.5px;
      line-height:9px;
      font-weight:500;
    }
    .mobile-location-row > .mobile-address-trigger strong{
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      color:#272622;
      font-size:10px;
      line-height:13px;
      font-weight:750;
    }
    .mobile-location-row > .mobile-address-trigger > svg:last-child{color:var(--delivery-primary)}

    .mobile-profile-trigger{
      width:32px;
      min-width:32px;
      max-width:32px;
      height:32px;
      min-height:32px;
      max-height:32px;
      aspect-ratio:1;
      justify-self:end;
      padding:0;
      overflow:hidden;
      box-sizing:border-box;
      border:1px solid #ffe2e2;
      border-radius:50%;
      background:#fff4f4;
      color:var(--delivery-primary);
      display:grid;
      place-items:center;
      font-size:8.5px;
      line-height:1;
      font-weight:850;
      box-shadow:0 3px 10px rgba(255,75,75,.08);
    }
    .mobile-profile-trigger img{
      width:100%;
      min-width:100%;
      max-width:none;
      height:100%;
      min-height:100%;
      display:block;
      object-fit:cover;
      object-position:50% 50%;
      border-radius:inherit;
    }
    .mobile-profile-trigger svg{width:14px;height:14px;stroke-width:2}
    .mobile-profile-trigger span{display:block}

    .header-left{
      min-width:0;
      min-height:45px;
      display:block;
    }
    .brand{
      min-width:0;
      width:100%;
      display:grid;
      grid-template-columns:42px minmax(0,1fr);
      align-items:center;
      gap:9px;
    }
    .logo{
      width:42px;
      height:42px;
      flex-basis:42px;
      border-radius:11px;
      font-size:17px;
    }
    .brand-copy{min-width:0;gap:1px}
    .brand-copy > b{
      font-size:14px;
      line-height:17px;
      font-weight:800;
    }
    .platform-label{display:none}
    .brand-meta{
      min-width:0;
      display:block;
      overflow:hidden;
    }
    .status{
      min-width:0;
      gap:4px;
      font-size:8.5px;
      line-height:11px;
    }
    .status i{width:6px;height:6px;flex-basis:6px}
    .status strong{font-weight:650}
    .status em{font-size:8px}
    .status small{font-size:8px}

    .mobile-fulfillment{
      min-height:36px;
      padding:3px;
      border-radius:10px;
      background:#f2f2f1;
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:3px;
    }
    .mobile-fulfillment button{
      min-width:0;
      min-height:30px;
      padding:0 8px;
      border:0;
      border-radius:8px;
      background:transparent;
      color:#77746f;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:5px;
      font-size:9px;
      line-height:1;
      font-weight:750;
    }
    .mobile-fulfillment button:only-child{grid-column:1 / -1}
    .mobile-fulfillment button.active{
      background:var(--delivery-primary);
      color:#fff;
      box-shadow:0 3px 9px rgba(255,75,75,.16);
    }
    .mobile-fulfillment svg{width:11px;height:11px}

    .mobile-meta{
      display:flex;
      gap:5px;
      min-width:0;
      overflow-x:auto;
      padding:0;
      scrollbar-width:none;
    }
    .mobile-meta::-webkit-scrollbar{display:none}
    .mobile-meta span{
      flex:0 0 auto;
      min-height:21px;
      padding:0 7px;
      border:1px solid #ecebe8;
      border-radius:7px;
      background:#f8f8f7;
      color:#77746f;
      display:flex;
      align-items:center;
      gap:3px;
      font-size:7.5px;
      line-height:1;
      font-weight:650;
      white-space:nowrap;
    }
    .mobile-meta span:first-child{
      border-color:#ffe1e1;
      color:var(--delivery-primary);
      background:#fff5f5;
    }
    .mobile-meta svg{width:8px;height:8px}
  }
`;

export const InlineSearch = styled.div`
  position:relative;
  width:100%;
  min-height:38px;
  padding:0 12px;
  border:1px solid var(--delivery-line);
  border-radius:9px;
  background:#f7f7f6;
  color:var(--delivery-muted);
  display:flex;
  align-items:center;
  gap:9px;

  > svg{width:15px;flex:0 0 15px}
  .mobile-search-placeholder{display:none}
  input{
    width:100%;
    min-width:0;
    height:36px;
    border:0;
    outline:0;
    background:transparent;
    color:var(--delivery-text);
    font-size:12px;
  }
  input::placeholder{color:#a4a19b}
  .clear{
    width:24px;
    height:24px;
    flex:0 0 24px;
    border:0;
    border-radius:12px;
    background:transparent;
    color:var(--delivery-muted);
    font-size:18px;
    line-height:1;
  }

  &:focus-within{
    border-color:color-mix(in srgb,var(--delivery-primary) 48%,var(--delivery-line));
    box-shadow:0 0 0 3px color-mix(in srgb,var(--delivery-primary) 9%,transparent);
  }

  @media(max-width:760px){
    min-height:35px;
    padding:0 10px;
    border:0;
    border-radius:10px;
    background:#f4f4f3;
    gap:7px;

    > svg{
      width:13px;
      height:13px;
      flex-basis:13px;
      color:#a5a29d;
      z-index:1;
    }

    .mobile-search-placeholder{
      position:absolute;
      left:30px;
      right:34px;
      top:50%;
      transform:translateY(-50%);
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      color:#aaa7a2;
      display:block;
      pointer-events:none;
      font-size:8.5px;
      line-height:11px;
    }

    &:has(input:not(:placeholder-shown)) .mobile-search-placeholder{
      display:none;
    }

    input{
      height:35px;
      font-size:9px;
      z-index:1;
    }

    input::placeholder{color:transparent}

    .clear{
      width:20px;
      height:20px;
      flex-basis:20px;
      font-size:16px;
      z-index:2;
    }
  }
`;

export const InlineSearchResults = styled.div`
  position:absolute;
  top:calc(100% + 8px);
  left:0;
  right:0;
  z-index:50;
  padding:8px;
  border:1px solid var(--delivery-line);
  border-radius:16px;
  background:#fff;
  box-shadow:0 18px 40px rgba(24,22,19,.16);
  display:grid;
  gap:6px;
  max-height:420px;
  overflow:auto;

  > button{
    width:100%;
    min-height:66px;
    padding:8px;
    border:0;
    border-radius:12px;
    background:#fff;
    color:var(--delivery-text);
    display:grid;
    grid-template-columns:52px minmax(0,1fr);
    gap:10px;
    text-align:left;
  }
  > button:hover,
  > button:focus-visible{
    background:color-mix(in srgb,var(--delivery-primary) 6%,#fff);
    outline:none;
  }
  .thumb{
    width:52px;height:52px;border-radius:10px;overflow:hidden;
    background:#f3f1ec;display:grid;place-items:center;
  }
  .thumb img{width:100%;height:100%;object-fit:cover}
  .thumb svg{width:18px;height:18px;color:#aaa49b}
  .copy{min-width:0;display:grid;gap:2px;align-content:center}
  .copy b{font-size:13px}
  .copy small{
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
    color:var(--delivery-muted);font-size:11px;
  }
  .copy strong{color:var(--delivery-primary);font-size:12px}
  .empty{padding:12px;color:var(--delivery-muted);font-size:12px}

  @media(max-width:760px){
    top:calc(100% + 6px);
    max-height:min(60dvh,420px);
    animation:mobile-search-results-in 180ms cubic-bezier(.22,1,.36,1) both;

    @keyframes mobile-search-results-in{
      from{opacity:0;transform:translateY(-6px) scale(.99)}
      to{opacity:1;transform:translateY(0) scale(1)}
    }

    @media(prefers-reduced-motion:reduce){
      animation:none;
    }
  }
`;


