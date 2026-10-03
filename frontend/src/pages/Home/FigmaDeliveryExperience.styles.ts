import styled from 'styled-components';

export const Page = styled.div<{ $primary: string }>`
  --delivery-primary: ${({ $primary }) => $primary || '#FF4B4B'};
  --home-primary: var(--delivery-primary);
  --delivery-bg: #fff;
  --delivery-surface: #fff;
  --delivery-text: #1f1e1a;
  --delivery-muted: #72706b;
  --delivery-line: #ecebe8;
  min-height: 100vh;
  background: var(--delivery-bg);
  color: var(--delivery-text);
  font-family: 'Inter', system-ui, sans-serif;

  *,
  *::before,
  *::after { box-sizing: border-box; }

  button, input { font: inherit; }
  button { cursor: pointer; }

  &.product-open {
    min-height:100vh;
    height:auto;
    overflow:visible;
  }

  @media(max-width:760px){
    &.product-open > header{
      display:none;
    }
  }
`;

export const DesktopTopBar = styled.div`
  height:44px;
  border-bottom:1px solid var(--delivery-line);
  background:#fafaf9;
  color:#6f6d67;

  > div{
    width:min(1120px,calc(100% - 48px));
    height:100%;
    margin:0 auto;
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:24px;
    font-size:12px;
  }

  .location,
  .top-meta,
  .top-status{
    display:flex;
    align-items:center;
    gap:7px;
  }

  .location{min-width:0}
  .location svg{width:13px;height:13px;color:var(--delivery-primary)}
  .location{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .top-meta{gap:24px;white-space:nowrap}
  .top-status i{width:7px;height:7px;border-radius:50%;background:#d44747}
  .top-status i.open{background:#2fb665}

  @media(max-width:760px){display:none}
`;

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


export const Breadcrumb = styled.nav`
  width:min(1120px,calc(100% - 48px));
  height:24px;
  margin:0 auto;
  display:flex;
  align-items:center;
  gap:6px;
  color:#8a8880;
  font-size:14px;

  button{
    padding:0;border:0;background:transparent;
    color:var(--delivery-primary);font-weight:600;
  }

  @media(max-width:760px){
    display:none;
  }
`;

export const HeroMetrics = styled.aside`
  position:absolute;
  top:50%;
  right:max(24px,calc((100vw - 1120px) / 2));
  z-index:6;
  width:300px;
  transform:translateY(-50%);
  display:grid;
  justify-items:end;
  gap:16px;
  pointer-events:none;

  .metric-card{
    width:184px;
    min-height:96px;
    padding:18px 18px 17px;
    border:1px solid rgba(255,255,255,.16);
    border-radius:14px;
    background:rgba(24,20,17,.44);
    box-shadow:0 14px 34px rgba(8,6,5,.18);
    backdrop-filter:blur(12px) saturate(115%);
    -webkit-backdrop-filter:blur(12px) saturate(115%);
    display:flex;
    align-items:center;
  }

  .delivery-metrics{
    width:100%;
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    align-items:center;
  }

  .delivery-metrics[data-single-metric='true']{
    grid-template-columns:1fr;
  }

  .delivery-metrics span{
    min-width:0;
    display:grid;
    align-content:center;
    gap:4px;
  }

  .delivery-metrics span + span{
    margin-left:16px;
    padding-left:16px;
    border-left:1px solid rgba(255,255,255,.20);
  }

  .delivery-metrics[data-single-metric='true'] span + span{
    margin-left:0;
    padding-left:0;
    border-left:0;
  }

  .metric-card b{
    color:#fff;
    font-size:13px;
    line-height:16px;
    font-weight:850;
    white-space:nowrap;
    text-shadow:0 1px 8px rgba(0,0,0,.18);
  }

  .metric-card small{
    max-width:58px;
    color:rgba(255,255,255,.72);
    font-size:9px;
    line-height:11px;
  }

  .hero-address{
    width:300px;
    min-height:40px;
    padding:0 14px;
    border:1px solid rgba(255,255,255,.14);
    border-radius:10px;
    background:rgba(24,20,17,.40);
    color:rgba(255,255,255,.86);
    box-shadow:0 10px 26px rgba(8,6,5,.16);
    backdrop-filter:blur(10px) saturate(110%);
    -webkit-backdrop-filter:blur(10px) saturate(110%);
    display:flex;
    align-items:center;
    gap:8px;
    font-size:10px;
  }

  .hero-address svg{
    width:13px;
    height:13px;
    flex:0 0 13px;
    color:var(--delivery-primary);
  }

  .hero-address span{
    min-width:0;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
  }

  @media(max-width:900px){display:none}
`;

export const HeroCarousel = styled.div`
  position:relative;
  width:100%;
  height:520px;
  margin:0;

  > section{
    width:100%;
    height:520px;
    min-height:520px;
    border-radius:0;
  }

  @media(max-width:760px){
    width:calc(100% - 24px);
    height:166px;
    margin:4px 12px 0;

    > section{
      height:166px !important;
      min-height:166px !important;
      border-radius:12px;
    }
  }
`;

export const Main = styled.main`
  width:min(1120px,calc(100% - 48px));
  margin:0 auto;
  padding:48px 0 80px;
  display:grid;
  gap:0;

  @media(max-width:760px){
    width:100%;
    padding:12px 12px calc(112px + env(safe-area-inset-bottom,0px));

    &.no-banner{padding-top:8px}
  }
`;

export const InfoChips = styled.div`
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  margin-bottom:28px;

  span{
    min-height:36px;
    padding:0 13px;
    border:1px solid var(--delivery-line);
    border-radius:9px;
    background:#fff;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:6px;
    color:var(--delivery-muted);
    font-size:11px;
    font-weight:650;
    white-space:nowrap;
  }

  span:first-child{
    background:#fff7f7;
    color:var(--delivery-primary);
    border-color:#ffe4e4;
  }

  b{color:inherit}

  @media(max-width:760px){
    &.desktop-info{display:none}
  }
`;

export const CatalogIntro = styled.div`
  min-height:42px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:20px;

  h2{
    margin:0;
    font-family:'Gabarito','Inter',sans-serif;
    font-size:26px;
    line-height:34px;
    font-weight:850;
    letter-spacing:-.02em;
  }

  button{
    padding:0;
    border:0;
    background:transparent;
    color:var(--delivery-primary);
    font-size:12px;
    font-weight:750;
  }

  @media(max-width:760px){
    min-height:28px;
    h2{font-size:14px;line-height:18px;letter-spacing:0}
    button{display:none}
  }
`;

export const CatalogCategories = styled.nav`
  display:flex;
  align-items:flex-start;
  gap:16px;
  padding:16px 0 56px;
  overflow-x:auto;
  scrollbar-width:none;

  &::-webkit-scrollbar{display:none}

  button{
    width:146px;
    flex:0 0 146px;
    padding:0;
    border:0;
    background:transparent;
    color:var(--delivery-text);
    display:grid;
    justify-items:stretch;
    gap:0;
    text-align:left;
    transition:transform 160ms ease;
  }

  .image{
    width:146px;
    height:100px;
    border:1px solid var(--delivery-line);
    border-radius:12px;
    overflow:hidden;
    background:#f2f1ee;
    display:grid;
    place-items:center;
    color:#99958e;
  }

  .image img{width:100%;height:100%;object-fit:cover}
  .image svg{width:24px;height:24px}
  b{
    margin-top:10px;
    width:100%;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    font-size:12px;
    line-height:16px;
    font-weight:750;
  }
  small{
    margin-top:2px;
    color:#98958f;
    font-size:9px;
    line-height:12px;
  }

  button.active{color:var(--delivery-primary)}
  button.active .image{
    border:2px solid var(--delivery-primary);
    box-shadow:0 0 0 3px rgba(255,75,75,.08);
  }
  button:hover{transform:translateY(-2px)}

  @media(prefers-reduced-motion:reduce){
    button{transition:none}
    button:hover{transform:none}
  }

  @media(max-width:760px){
    gap:12px;
    margin:0 -12px 0 0;
    padding:8px 12px 18px 0;
    scroll-padding-inline:0 12px;

    .featured-catalog{display:none}

    button{
      width:58px;
      flex-basis:58px;
      justify-items:center;
      text-align:center;
      gap:5px;
    }

    .image{
      width:50px;
      height:50px;
      border-radius:50%;
    }

    b{
      width:58px;
      margin-top:0;
      font-size:9px;
      line-height:12px;
      font-weight:650;
    }

    small{display:none}
    button:hover{transform:none}
  }
`;

export const Section = styled.section`
  scroll-margin-top:96px;
  display:grid;
  gap:18px;
  padding:56px 0;
  border-top:1px solid var(--delivery-line);

  @media(max-width:760px){
    position:relative;
    gap:10px;
    padding:18px 0 20px;
    border-top:1px solid #f0efed;

    &.featured-carousel{padding-top:16px}
  }
`;

export const SectionHead = styled.div`
  min-height:58px;
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:20px;

  > div{min-width:0}

  h2{
    margin:0;
    font-family:'Gabarito','Inter',sans-serif;
    font-size:26px;
    line-height:34px;
    font-weight:850;
    letter-spacing:-.02em;
    color:var(--delivery-text);
  }

  p{
    margin:4px 0 0;
    color:var(--delivery-muted);
    font-size:12px;
    line-height:18px;
  }

  @media(max-width:760px){
    min-height:24px;
    align-items:center;
    h2{font-size:14px;line-height:18px;letter-spacing:0}
    p{display:none}
  }
`;

export const SectionHeadActions = styled.div`
  display:flex;
  align-items:center;
  gap:10px;

  .view-all{
    min-height:34px;
    padding:0 12px;
    border:1px solid #ffdcdc;
    border-radius:9px;
    background:#fff7f7;
    color:var(--delivery-primary);
    font-size:10px;
    font-weight:750;
    white-space:nowrap;
  }

  @media(max-width:760px){
    gap:6px;
    .view-all{
      min-height:0;
      padding:0;
      border:0;
      border-radius:0;
      background:transparent;
      font-size:9px;
    }
  }
`;

export const Categories = styled.div`
  display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:16px;
  button{min-width:0;border:0;background:transparent;display:grid;justify-items:center;gap:8px;color:var(--delivery-text);font-weight:650}
  .image{width:82px;height:82px;border-radius:50%;overflow:hidden;background:#f1eee8;display:grid;place-items:center}
  .image img{width:100%;height:100%;object-fit:cover}
  .image svg{color:#aaa49b}
  b{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
  @media(max-width:900px){grid-template-columns:repeat(4,minmax(0,1fr))}
  @media(max-width:760px){display:flex;overflow-x:auto;margin-right:-20px;padding-right:20px;scrollbar-width:none;gap:16px;button{flex:0 0 72px}.image{width:64px;height:64px}b{font-size:11px}}
`;

export const CarouselControls = styled.div`
  display:flex;
  align-items:center;
  gap:8px;

  button{
    width:34px;
    height:34px;
    padding:0;
    border:1px solid var(--delivery-line);
    border-radius:50%;
    background:#f7f7f5;
    color:var(--delivery-text);
    display:grid;
    place-items:center;
    cursor:pointer;
    transition:opacity 160ms ease,transform 160ms ease,background 160ms ease;
  }

  button:hover:not(:disabled){
    background:#fff1f1;
    color:var(--delivery-primary);
    transform:translateY(-1px);
  }

  button:disabled{opacity:.34;cursor:default}
  button svg{width:14px;height:14px}

  @media(max-width:760px){
    button{width:24px;height:24px;border:0;background:#f4f4f2}
    button svg{width:11px;height:11px}
  }

  @media(prefers-reduced-motion:reduce){
    button{transition:none}
    button:hover:not(:disabled){transform:none}
  }
`;

export const ProductGrid = styled.div`
  display:flex;
  flex-wrap:nowrap;
  gap:20px;
  overflow-x:auto;
  overflow-y:hidden;
  padding:0 0 4px;
  scroll-snap-type:x proximity;
  scroll-behavior:smooth;
  scrollbar-width:none;
  -webkit-overflow-scrolling:touch;

  &::-webkit-scrollbar{display:none}

  > *{
    flex:0 0 265px;
    min-width:265px;
    scroll-snap-align:start;
  }

  @media(max-width:760px){
    gap:8px;
    margin-right:-12px;
    padding-right:12px;

    > *{
      flex-basis:154px;
      min-width:154px;
    }
  }

  @media(prefers-reduced-motion:reduce){scroll-behavior:auto}
`;

export const ProductCard = styled.article`
  position:relative;
  isolation:isolate;
  width:265px;
  height:297px;
  min-height:297px;
  overflow:hidden;
  border:1px solid var(--delivery-line);
  border-radius:12px;
  background:#fff;
  display:flex;
  flex-direction:column;
  transition:transform 170ms ease,box-shadow 170ms ease,border-color 170ms ease;

  &:hover{
    transform:translateY(-2px);
    border-color:#ffdada;
    box-shadow:0 10px 28px rgba(31,30,26,.07);
  }

  .image{
    position:relative;
    flex:0 0 160px;
    height:160px;
    min-height:160px;
    overflow:hidden;
    background:#f3f1ec;
    display:grid;
    place-items:center;
    color:#aaa49b;
  }

  .image img{
    position:absolute;
    inset:0;
    width:100%;
    height:100%;
    max-width:none;
    object-fit:cover;
    object-position:center;
    display:block;
  }

  .image svg{width:28px;height:28px}

  .copy{
    position:relative;
    z-index:2;
    flex:1 1 auto;
    min-height:137px;
    padding:13px 14px;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
    gap:9px;
    background:#fff;
  }

  .product-copy{min-width:0;display:grid;gap:4px}

  .product-label{
    width:max-content;
    max-width:100%;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    color:var(--delivery-primary);
    font-size:8px;
    line-height:11px;
    font-weight:800;
    text-transform:uppercase;
  }

  h3{
    margin:0;
    overflow:hidden;
    color:var(--delivery-text);
    font-size:13px;
    line-height:17px;
    font-weight:750;
    text-overflow:ellipsis;
    white-space:nowrap;
  }

  p{
    margin:0;
    overflow:hidden;
    display:-webkit-box;
    color:var(--delivery-muted);
    font-size:10px;
    line-height:14px;
    -webkit-box-orient:vertical;
    -webkit-line-clamp:2;
  }

  .foot{
    display:flex;
    align-items:flex-end;
    justify-content:space-between;
    gap:8px;
  }

  .price{
    min-width:0;
    display:flex;
    align-items:baseline;
    gap:4px;
    flex-wrap:wrap;
  }

  .price del{color:var(--delivery-muted);font-size:8px}

  strong{
    color:var(--delivery-text);
    font-size:13px;
    line-height:17px;
    font-weight:850;
    white-space:nowrap;
  }

  .add{
    flex:0 0 auto;
    min-height:28px;
    padding:0 10px;
    border:0;
    border-radius:7px;
    background:var(--delivery-primary);
    color:#fff;
    font-size:9px;
    line-height:1;
    font-weight:800;
    white-space:nowrap;
  }

  .open{
    position:absolute;
    inset:0;
    z-index:1;
    border:0;
    background:transparent;
  }

  .open:focus-visible{
    outline:3px solid rgba(255,75,75,.28);
    outline-offset:-3px;
    border-radius:inherit;
  }

  .add{position:relative;z-index:2}

  @media(max-width:760px){
    width:154px;
    height:214px;
    min-height:214px;
    border-radius:9px;

    &:hover{transform:none;box-shadow:none}

    .image{
      flex-basis:108px;
      height:108px;
      min-height:108px;
    }

    .copy{
      min-height:106px;
      padding:8px;
      gap:5px;
    }

    .product-copy{gap:2px}
    .product-label{font-size:7px;line-height:9px}
    h3{font-size:9.5px;line-height:12px}
    p{font-size:8px;line-height:10px;-webkit-line-clamp:1}
    strong{font-size:10px;line-height:13px}
    .price del{font-size:7px}
    .add{
      min-height:22px;
      padding:0 7px;
      border-radius:6px;
      font-size:7.5px;
    }
  }

  @media(prefers-reduced-motion:reduce){
    transition:none;
    &:hover{transform:none}
  }
`;

export const MobileBenefit = styled.aside`
  display:none;

  @media(max-width:760px){
    margin:4px 0 2px;
    padding:10px 12px;
    border:1px solid #ffe4e4;
    border-radius:9px;
    background:#fff2f2;
    color:#6f625f;
    display:grid;
    gap:2px;

    b{color:var(--delivery-primary);font-size:9px;line-height:12px}
    span{font-size:8px;line-height:11px}
  }
`;

export const WhyOrderHere = styled.section`
  padding:56px 0;
  border-top:1px solid var(--delivery-line);

  > h2{
    margin:0 0 24px;
    font-family:'Gabarito','Inter',sans-serif;
    font-size:26px;
    line-height:34px;
    font-weight:850;
    letter-spacing:-.02em;
  }

  .benefit-grid{
    display:grid;
    grid-template-columns:repeat(4,minmax(0,1fr));
    gap:20px;
    align-items:start;
  }

  article{
    min-height:230px;
    padding:20px;
    border:1px solid var(--delivery-line);
    border-radius:14px;
    background:#fff;
    display:grid;
    align-content:start;
    gap:10px;
  }

  .benefit-icon{
    width:48px;
    height:48px;
    border-radius:12px;
    background:#fff0f0;
    color:var(--delivery-primary);
    display:grid;
    place-items:center;
    font-size:21px;
  }
  .benefit-icon svg{width:22px;height:22px}

  h3{
    margin:6px 0 0;
    font-size:15px;
    line-height:20px;
    font-weight:800;
  }

  p{
    margin:0;
    color:var(--delivery-muted);
    font-size:11px;
    line-height:18px;
  }

  @media(max-width:900px){
    .benefit-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    article{min-height:180px}
  }

  @media(max-width:760px){display:none}
`;

export const RestaurantInfoTitle = styled.h2`
  margin:56px 0 20px;
  padding-top:56px;
  border-top:1px solid var(--delivery-line);
  font-family:'Gabarito','Inter',sans-serif;
  font-size:26px;
  line-height:34px;
  font-weight:850;
  letter-spacing:-.02em;

  @media(max-width:760px){
    margin:22px 0 10px;
    padding-top:20px;
    font-size:14px;
    line-height:18px;
    letter-spacing:0;
  }
`;

export const RestaurantInfo = styled.section`
  min-height:188px;
  padding:22px 24px;
  border:1px solid var(--delivery-line);
  border-radius:14px;
  background:#fff;
  display:grid;
  grid-template-columns:minmax(0,1.8fr) minmax(260px,1fr);
  grid-template-areas:
    'address social'
    'phone social'
    'hours social';
  column-gap:28px;
  row-gap:8px;
  align-items:center;

  .address{grid-area:address}
  .phone{grid-area:phone}
  .hours{grid-area:hours}
  .social-row{grid-area:social}

  .info-item{
    min-width:0;
    min-height:42px;
    display:flex;
    align-items:center;
    gap:11px;
    color:var(--delivery-text);
    font-size:11px;
    line-height:17px;
  }

  .info-icon{
    width:34px;
    height:34px;
    flex:0 0 34px;
    border-radius:10px;
    background:#fff2f2;
    display:grid;
    place-items:center;
    color:var(--delivery-primary);
  }

  .info-icon svg{width:16px;height:16px;stroke-width:2}

  .social-row{
    min-width:0;
    align-self:stretch;
    padding:18px;
    border:1px solid var(--delivery-line);
    border-radius:12px;
    background:#fafaf9;
    display:grid;
    align-content:center;
    gap:12px;
  }

  .social-label{
    color:var(--delivery-text);
    font-size:12px;
    line-height:16px;
    font-weight:800;
  }

  .social{display:flex;align-items:center;gap:8px}

  .social a{
    width:32px;
    height:32px;
    border:1px solid var(--delivery-line);
    border-radius:9px;
    background:#fff;
    color:var(--delivery-primary);
    display:grid;
    place-items:center;
  }

  .social a svg{width:15px;height:15px}

  @media(max-width:760px){
    min-height:0;
    padding:12px;
    grid-template-columns:1fr;
    grid-template-areas:
      'address'
      'hours'
      'phone'
      'social';
    gap:0;
    border-radius:10px;

    .info-item,
    .social-row{
      min-height:44px;
      padding:8px 0;
      align-items:center;
      gap:9px;
    }

    .info-item + .info-item,
    .social-row{
      border-top:1px solid color-mix(in srgb,var(--delivery-line) 82%,transparent);
    }

    .info-item{font-size:9px;line-height:13px}
    .info-item > span:last-child{min-width:0;overflow-wrap:anywhere}
    .info-icon{
      width:28px;
      height:28px;
      flex:0 0 28px;
      border-radius:8px;
    }
    .info-icon svg{width:14px;height:14px}

    .social-row{
      align-self:auto;
      border-right:0;
      border-bottom:0;
      border-left:0;
      border-radius:0;
      background:transparent;
      display:flex;
      justify-content:space-between;
    }

    .social-label{font-size:9px;line-height:13px}
    .social{gap:6px}
    .social a{width:27px;height:27px;border-radius:8px}
    .social a svg{width:14px;height:14px}
  }
`;

export const Footer = styled.footer`
 background:#1f1e1a;color:#fff;padding:52px max(24px,calc((100vw - 1120px)/2));
 .inner{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:40px}
 h3{margin:0 0 14px;font-size:14px}
 p,a{color:#8d8a85;font-size:13px;line-height:1.6;text-decoration:none}
 .brand{font-family:'Gabarito','Inter',sans-serif;font-size:20px;font-weight:800;margin-bottom:12px}
 .bottom{margin-top:40px;padding-top:20px;border-top:1px solid #343330;color:#77746f;font-size:12px;display:flex;justify-content:space-between}
 @media(max-width:760px){display:none}
`;

export const MenuLayout = styled.main`
 width:min(1120px,calc(100% - 48px));margin:0 auto;padding:40px 0 80px;display:grid;grid-template-columns:240px 540px 280px;gap:32px;align-items:start;min-height:708px;
 @media(max-width:1180px){grid-template-columns:220px minmax(0,1fr) 260px;gap:24px}
 @media(max-width:1000px){grid-template-columns:200px minmax(0,1fr)}
 @media(max-width:760px){width:100%;min-height:0;padding:0 20px 120px;display:block}
`;

export const MenuCategories = styled.aside`
 position:sticky;top:104px;padding:16px;border:1px solid var(--delivery-line);border-radius:16px;background:#fff;display:grid;gap:8px;
 h2{margin:0 0 2px;font-family:'Gabarito','Inter',sans-serif;font-size:16px;line-height:19px}
 button{width:100%;min-height:37px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:var(--delivery-muted);display:flex;align-items:center;text-align:left;font-size:14px;font-weight:500}
 button.active{background:color-mix(in srgb,var(--delivery-primary) 10%,#fff);color:var(--delivery-primary);font-weight:700}
 @media(max-width:760px){position:static;border:0;border-radius:0;background:transparent;display:flex;overflow-x:auto;margin:14px -20px 0;padding:0 20px 14px;gap:8px;scrollbar-width:none;h2{display:none}button{width:auto;flex:0 0 auto;height:36px;min-height:36px;padding:0 14px;border-radius:20px;background:#f5f5f5}}
`;

export const MenuProducts = styled.section`
 min-width:0;display:grid;gap:24px;
 header h1{margin:0;font-family:'Gabarito','Inter',sans-serif;font-size:28px}
 header p{margin:5px 0 0;color:var(--delivery-muted);font-size:13px}
 .list{display:grid;gap:16px}
 @media(max-width:760px){padding-top:20px;gap:18px;header h1{font-size:24px}}
`;

export const MenuCategoryBar = styled.div`
 display:flex;gap:10px;overflow-x:auto;scrollbar-width:none;
 button{height:40px;padding:0 14px;border:0;border-radius:24px;background:#f5f5f5;color:var(--delivery-text);font-size:14px;font-weight:600;white-space:nowrap}
 button.active{background:var(--delivery-primary);color:#fff}
 @media(max-width:760px){display:none}
`;

export const MenuProduct = styled.article`
 position:relative;display:grid;grid-template-columns:100px minmax(0,1fr);gap:16px;padding:16px;border:1px solid var(--delivery-line);border-radius:16px;background:#fff;
 .image{width:100px;height:100px;border-radius:12px;overflow:hidden;background:#f3f1ec;display:grid;place-items:center;color:#aaa49b}
 .image img{width:100%;height:100%;object-fit:cover}
 .copy{min-width:0;display:grid;gap:4px;align-content:center}
 h3{margin:0;font-size:16px}
 p{margin:0;color:var(--delivery-muted);font-size:13px;line-height:1.35}
 .foot{padding-top:8px;display:flex;justify-content:space-between;align-items:center;gap:10px}
 strong{color:var(--delivery-primary);font-size:15px}
 .add{width:auto;height:28px;padding:0 12px;border:0;border-radius:8px;background:var(--delivery-primary);color:#fff;font-size:0;font-weight:700}
 .add::after{content:'Adicionar +';font-size:11px}
 .open{position:absolute;inset:0;border:0;background:transparent}
 .add{position:relative;z-index:2}
 @media(max-width:760px){grid-template-columns:80px minmax(0,1fr);gap:12px;padding:14px 0;border-width:0 0 1px;border-radius:0;.image{width:80px;height:80px}.add{width:32px;height:32px;padding:0;border-radius:16px}.add::after{content:'+';font-size:20px}}
`;

export const MiniCart = styled.aside`
 position:sticky;top:104px;border:1px solid var(--delivery-line);border-radius:16px;background:#fff;padding:20px;display:grid;gap:16px;
 h3{margin:0;font-family:'Gabarito','Inter',sans-serif;font-size:16px}
 p{margin:0;color:var(--delivery-muted);font-size:12px}
 .items{padding:16px 0;border-top:1px solid var(--delivery-line);border-bottom:1px solid var(--delivery-line);display:grid;gap:12px}
 .item{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:start;font-size:12px}
 .item span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .item strong{font-size:12px;color:var(--delivery-text);white-space:nowrap}
 .subtotal{display:flex;align-items:center;justify-content:space-between;color:var(--delivery-muted);font-size:12px}
 .subtotal strong{color:var(--delivery-text);font-size:13px}
 button{width:120px;min-height:46px;border:0;border-radius:12px;background:var(--delivery-primary);color:#fff;font-weight:700}
 button:disabled{opacity:.45;cursor:not-allowed}
 @media(max-width:1000px){display:none}
`;

export const MobileSearch = styled.button`
  display:none;
`;

export const MobileCartFab = styled.button`
  display:none;
  @media(max-width:760px){
    position:fixed;right:14px;bottom:70px;z-index:28;
    width:48px;height:48px;border:0;border-radius:24px;
    background:var(--delivery-primary);color:#fff;
    box-shadow:0 10px 24px color-mix(in srgb,var(--delivery-primary) 28%, transparent);
    display:grid;place-items:center;
    touch-action:none;
    user-select:none;
    cursor:grab;
  }
  @media(max-width:760px){
    &:active{cursor:grabbing}
  }
  svg{width:24px;height:24px}
  span{
    position:absolute;top:-2px;right:-2px;min-width:20px;height:20px;padding:0 5px;
    border-radius:10px;background:var(--delivery-text);color:#fff;
    display:grid;place-items:center;font-size:11px;font-weight:800;
  }
`;



export const ProfileQuickMenuBackdrop = styled.div`
  display:none;

  @media(max-width:760px){
    position:fixed;
    inset:0;
    z-index:94;
    background:rgba(20,19,17,.34);
    display:flex;
    align-items:flex-start;
    justify-content:center;
    backdrop-filter:blur(2px);
    animation:profile-quick-backdrop-in 150ms ease both;
  }

  @keyframes profile-quick-backdrop-in{
    from{opacity:0}
    to{opacity:1}
  }

  @media(prefers-reduced-motion:reduce){animation:none}
`;

export const ProfileQuickMenuSheet = styled.section`
  display:none;

  @media(max-width:760px){
    width:100%;
    max-height:min(86dvh,700px);
    padding:max(12px,env(safe-area-inset-top)) 12px 14px;
    border-radius:0 0 22px 22px;
    background:#fff;
    box-shadow:0 18px 48px rgba(22,20,18,.18);
    display:grid;
    gap:10px;
    overflow-y:auto;
    overscroll-behavior:contain;
    animation:profile-quick-sheet-in 220ms cubic-bezier(.22,1,.36,1) both;
    scrollbar-width:none;
  }

  &::-webkit-scrollbar{display:none}

  .quick-profile-head{
    min-width:0;
    display:grid;
    grid-template-columns:42px minmax(0,1fr) 34px;
    align-items:center;
    gap:10px;
  }

  .quick-avatar{
    width:42px;
    height:42px;
    overflow:hidden;
    border-radius:50%;
    background:#fff0f0;
    color:#FF4B4B;
    display:grid;
    place-items:center;
    font-size:10px;
    font-weight:850;
  }

  .quick-avatar img{
    width:100%;
    height:100%;
    display:block;
    object-fit:cover;
    object-position:center;
  }

  .quick-avatar svg{width:18px;height:18px}

  .quick-profile-copy{
    min-width:0;
    display:grid;
    gap:2px;
  }

  .quick-profile-copy small{
    color:#FF4B4B;
    font-size:7px;
    line-height:9px;
    font-weight:850;
    letter-spacing:.06em;
  }

  .quick-profile-copy b{
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    color:#24231f;
    font-size:13px;
    line-height:17px;
    font-weight:850;
  }

  .quick-close{
    width:34px;
    height:34px;
    padding:0;
    border:0;
    border-radius:50%;
    background:#f4f4f2;
    color:#5f5c57;
    display:grid;
    place-items:center;
  }

  .quick-close svg{width:14px;height:14px}

  .open-full-profile{
    width:100%;
    min-height:34px;
    padding:0 11px;
    border:1px solid #ffe0e0;
    border-radius:9px;
    background:#fff6f6;
    color:#FF4B4B;
    display:flex;
    align-items:center;
    justify-content:space-between;
    font-size:9px;
    font-weight:800;
  }

  .open-full-profile svg{width:12px;height:12px}

  .quick-profile-links{
    overflow:hidden;
    border:1px solid #eceae6;
    border-radius:13px;
    background:#fff;
  }

  .quick-profile-links button{
    width:100%;
    min-height:46px;
    padding:0 11px;
    border:0;
    border-bottom:1px solid #efeeeb;
    background:#fff;
    color:#252420;
    display:grid;
    grid-template-columns:24px minmax(0,1fr) auto 14px;
    align-items:center;
    gap:8px;
    text-align:left;
  }

  .quick-profile-links button:last-child{border-bottom:0}

  .quick-profile-links button > svg:first-child{
    width:16px;
    height:16px;
    color:#44413c;
    stroke-width:1.8;
  }

  .quick-profile-links button > span{
    min-width:0;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    font-size:10px;
    line-height:13px;
    font-weight:750;
  }

  .quick-profile-links button > em{
    min-width:22px;
    height:18px;
    padding:0 6px;
    border-radius:9px;
    background:#fff0eb;
    color:#db6b48;
    display:grid;
    place-items:center;
    font-size:7px;
    line-height:1;
    font-style:normal;
    font-weight:800;
  }

  .quick-profile-links button > svg:last-child{
    width:12px;
    height:12px;
    color:#aaa6a0;
  }

  @keyframes profile-quick-sheet-in{
    from{transform:translateY(-28px);opacity:.7}
    to{transform:translateY(0);opacity:1}
  }

  @media(prefers-reduced-motion:reduce){
    animation:none;
  }
`;

export const AddressPickerBackdrop = styled.div`
  display:none;

  @media(max-width:760px){
    position:fixed;
    inset:0;
    z-index:90;
    padding:48px 0 0;
    background:rgba(18,18,18,.42);
    display:flex;
    align-items:flex-end;
    justify-content:center;
    animation:address-backdrop-in 160ms ease both;
    backdrop-filter:blur(2px);
  }

  @keyframes address-backdrop-in{
    from{opacity:0}
    to{opacity:1}
  }

  @media(prefers-reduced-motion:reduce){
    animation:none;
  }
`;

export const AddressPickerSheet = styled.section`
  display:none;

  @media(max-width:760px){
    width:100%;
    max-height:min(72dvh,620px);
    padding:8px 14px calc(16px + env(safe-area-inset-bottom,0px));
    border-radius:22px 22px 0 0;
    background:#fff;
    box-shadow:0 -18px 50px rgba(20,20,20,.18);
    display:grid;
    grid-template-rows:auto auto minmax(0,1fr) auto;
    gap:12px;
    overflow:hidden;
    animation:address-sheet-in 220ms cubic-bezier(.22,1,.36,1) both;
  }

  .sheet-handle{
    width:38px;
    height:4px;
    margin:0 auto 1px;
    border-radius:999px;
    background:#deddda;
  }

  header{
    min-width:0;
    display:grid;
    grid-template-columns:minmax(0,1fr) 34px;
    align-items:start;
    gap:12px;
    padding:0 2px 2px;
  }

  header > div{
    min-width:0;
    display:grid;
    gap:3px;
  }

  header small{
    color:#FF4B4B;
    font-size:8px;
    line-height:10px;
    font-weight:850;
    letter-spacing:.06em;
  }

  header h2{
    margin:0;
    color:#22211e;
    font-family:'Gabarito','Inter',sans-serif;
    font-size:18px;
    line-height:22px;
    font-weight:850;
    letter-spacing:-.01em;
  }

  header p{
    margin:0;
    color:#8c8983;
    font-size:9px;
    line-height:13px;
  }

  .sheet-close{
    width:34px;
    height:34px;
    padding:0;
    border:0;
    border-radius:50%;
    background:#f4f4f2;
    color:#57544f;
    display:grid;
    place-items:center;
  }

  .sheet-close svg{
    width:15px;
    height:15px;
  }

  .address-list{
    min-height:0;
    display:grid;
    align-content:start;
    gap:8px;
    overflow-y:auto;
    overscroll-behavior:contain;
    padding:1px 1px 4px;
    scrollbar-width:none;
  }

  .address-list::-webkit-scrollbar{display:none}

  .address-option{
    width:100%;
    min-height:76px;
    padding:11px;
    border:1px solid #eceae6;
    border-radius:13px;
    background:#fff;
    color:#2b2926;
    display:grid;
    grid-template-columns:36px minmax(0,1fr) 25px;
    align-items:center;
    gap:10px;
    text-align:left;
    transition:border-color 150ms ease,background 150ms ease,box-shadow 150ms ease;
  }

  .address-option.selected{
    border-color:#FF4B4B;
    background:#fff8f8;
    box-shadow:0 0 0 3px rgba(255,75,75,.07);
  }

  .address-icon{
    width:36px;
    height:36px;
    border-radius:10px;
    background:#f6f5f3;
    color:#78746e;
    display:grid;
    place-items:center;
  }

  .address-option.selected .address-icon{
    background:#fff0f0;
    color:#FF4B4B;
  }

  .address-icon svg{
    width:16px;
    height:16px;
  }

  .address-copy{
    min-width:0;
    display:grid;
    gap:2px;
  }

  .address-title-row{
    min-width:0;
    display:flex;
    align-items:center;
    gap:6px;
  }

  .address-title-row b{
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    font-size:11px;
    line-height:14px;
    font-weight:800;
  }

  .address-title-row em{
    flex:0 0 auto;
    padding:2px 5px;
    border-radius:5px;
    background:#f2f2f0;
    color:#817d77;
    font-size:7px;
    line-height:9px;
    font-style:normal;
    font-weight:800;
    text-transform:uppercase;
  }

  .address-copy strong{
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    color:#4b4843;
    font-size:9px;
    line-height:12px;
    font-weight:650;
  }

  .address-copy small{
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    color:#99958f;
    font-size:8px;
    line-height:11px;
  }

  .address-check{
    width:23px;
    height:23px;
    border:1px solid #dfddd9;
    border-radius:50%;
    display:grid;
    place-items:center;
    color:#fff;
  }

  .address-option.selected .address-check{
    border-color:#FF4B4B;
    background:#FF4B4B;
  }

  .address-check svg{
    width:12px;
    height:12px;
    stroke-width:3;
  }

  .add-address{
    width:100%;
    min-height:52px;
    padding:9px 10px;
    border:1px dashed #ffc9c9;
    border-radius:12px;
    background:#fff8f8;
    color:#2c2926;
    display:grid;
    grid-template-columns:32px minmax(0,1fr);
    align-items:center;
    gap:9px;
    text-align:left;
  }

  .add-address > span:first-child{
    width:32px;
    height:32px;
    border-radius:9px;
    background:#FF4B4B;
    color:#fff;
    display:grid;
    place-items:center;
  }

  .add-address > span:first-child svg{
    width:14px;
    height:14px;
  }

  .add-address > span:last-child{
    min-width:0;
    display:grid;
    gap:1px;
  }

  .add-address b{
    font-size:10px;
    line-height:13px;
    font-weight:800;
  }

  .add-address small{
    color:#8e8a84;
    font-size:8px;
    line-height:11px;
  }

  @keyframes address-sheet-in{
    from{transform:translateY(28px);opacity:.7}
    to{transform:translateY(0);opacity:1}
  }

  @media(prefers-reduced-motion:reduce){
    animation:none;
    .address-option{transition:none}
  }
`;

export const MobileBottomNav = styled.nav`
  display:none;
  @media(max-width:760px){
    position:fixed;left:0;right:0;bottom:0;z-index:27;
    height:56px;padding-bottom:env(safe-area-inset-bottom);
    border-top:1px solid var(--delivery-line);background:#fff;
    display:grid;grid-template-columns:repeat(3,1fr);
  }
  button{
    border:0;background:transparent;color:var(--delivery-muted);
    display:grid;place-items:center;align-content:center;gap:2px;font-size:10px;font-weight:600;
  }
  button svg{width:20px;height:20px}
  button.active{color:var(--delivery-primary)}
`;
