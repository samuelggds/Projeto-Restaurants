import styled from 'styled-components';

export const Page = styled.div<{ $primary: string }>`
  --delivery-primary: ${({ $primary }) => $primary || '#e85a2b'};
  --home-primary: var(--delivery-primary);
  --delivery-bg: #fdfcf9;
  --delivery-surface: #fff;
  --delivery-text: #1f1e1a;
  --delivery-muted: #72706b;
  --delivery-line: #efece6;
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

export const Header = styled.header`
  height: 80px;
  padding: 0 max(24px, calc((100vw - 1120px) / 2));
  border-bottom: 1px solid var(--delivery-line);
  background: #fff;
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(300px, 380px) minmax(240px, 1fr);
  align-items: center;
  gap: 28px;
  position: sticky;
  top: 0;
  z-index: 30;

  .header-left{min-width:0;display:flex;align-items:center;gap:8px}
  .brand {
    min-width:0;padding:0;border:0;background:transparent;color:inherit;
    display:flex;align-items:center;gap:12px;text-align:left;
  }
  .logo {
    width:40px;height:40px;border-radius:12px;overflow:hidden;flex:0 0 40px;
    display:grid;place-items:center;background:var(--delivery-primary);color:#fff;
    font-family:'Gabarito','Inter',sans-serif;font-size:20px;font-weight:800;
  }
  .logo img { width:100%;height:100%;object-fit:cover; }
  .brand-copy { min-width:0; display:grid; gap:2px; }
  .brand-copy b { overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'Gabarito','Inter',sans-serif;font-size:18px; }
  .status { display:flex;align-items:center;gap:6px;color:var(--delivery-muted);font-size:13px; }
  .status i { width:8px;height:8px;border-radius:50%;background:#e5484d; }
  .status i.open { background:#33b864; }


  .actions { justify-self:end;display:flex;align-items:center;gap:18px; }
  .account { border:0;background:transparent;color:var(--delivery-text);display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px; }
  .cart {
    min-height:42px;padding:0 16px;border:0;border-radius: 10px;background:var(--delivery-primary);
    color:#fff;display:flex;align-items:center;gap:9px;font-weight:700;
  }
  .cart i {
    min-width:20px;height:20px;padding:0 5px;border-radius:8px;background:var(--delivery-text);
    display:grid;place-items:center;font-size:11px;font-style:normal;
  }

  @media(max-width:900px){
    padding:0 24px;
    grid-template-columns:minmax(0,1fr) auto;
    gap:12px;
    .account{display:none}
    .actions{gap:8px}
    .cart span{display:none}
  }

  .mobile-header-search{display:none}
  .mobile-back{display:none}

  @media(max-width:760px){
    position:static;
    min-height:64px;
    height:auto;
    padding:12px 20px;
    gap:10px;
    grid-template-columns:minmax(0,1fr) 36px;
    align-items:center;
    .actions{display:none}
    .header-left{min-width:0;gap:8px}
    .mobile-back{
      width:36px;height:36px;flex:0 0 36px;border:0;border-radius:18px;
      background:#f7f5f0;color:var(--delivery-text);display:grid;place-items:center;
    }
    .mobile-back svg{width:18px;height:18px}
    .brand{min-width:0}
    .mobile-header-search{
      width:36px;height:36px;border:0;border-radius:18px;background:#f7f5f0;color:var(--delivery-text);
      display:grid;place-items:center;
      transition:
        transform 200ms cubic-bezier(.22,1,.36,1),
        background-color 200ms ease,
        color 200ms ease,
        box-shadow 200ms ease;
    }
    .mobile-header-search.active{
      background:color-mix(in srgb,var(--delivery-primary) 10%,#fff);
      color:var(--delivery-primary);
      box-shadow:0 0 0 3px color-mix(in srgb,var(--delivery-primary) 8%,transparent);
      transform:rotate(-8deg) scale(.96);
    }
    .mobile-header-search svg{width:18px;height:18px}
    @media(prefers-reduced-motion:reduce){
      .mobile-header-search{transition:none}
      .mobile-header-search.active{transform:none}
    }
    .brand-copy b{font-size:17px}
    .status{font-size:11px}
  }
`;

export const InlineSearch = styled.div`
  position:relative;
  width:100%;
  min-height:42px;
  padding:0 14px;
  border:1px solid var(--delivery-line);
  border-radius:14px;
  background:#fafaf8;
  color:var(--delivery-muted);
  display:flex;
  align-items:center;
  gap:10px;

  > svg{width:16px;flex:0 0 16px}
  input{
    width:100%;
    min-width:0;
    height:40px;
    border:0;
    outline:0;
    background:transparent;
    color:var(--delivery-text);
    font-size:14px;
  }
  input::placeholder{color:var(--delivery-muted)}
  .clear{
    width:24px;height:24px;flex:0 0 24px;border:0;border-radius:12px;
    background:transparent;color:var(--delivery-muted);font-size:20px;line-height:1;
  }

  &:focus-within{
    border-color:color-mix(in srgb,var(--delivery-primary) 55%,var(--delivery-line));
    box-shadow:0 0 0 3px color-mix(in srgb,var(--delivery-primary) 10%,transparent);
  }

  @media(max-width:900px){
    display:none;
  }

  @media(max-width:760px){
    display:flex;
    position:relative;
    inset:auto;
    grid-column:1 / -1;
    grid-row:2;
    z-index:3;
    width:100%;
    max-height:0;
    min-height:0;
    margin-top:0;
    padding-top:0;
    padding-bottom:0;
    overflow:hidden;
    border-color:transparent;
    border-radius:10px;
    background:#fff;
    opacity:0;
    visibility:hidden;
    pointer-events:none;
    transform:translateY(-8px) scale(.985);
    transform-origin:top center;
    transition:
      max-height 240ms cubic-bezier(.22,1,.36,1),
      min-height 240ms cubic-bezier(.22,1,.36,1),
      margin-top 240ms cubic-bezier(.22,1,.36,1),
      opacity 180ms ease,
      transform 240ms cubic-bezier(.22,1,.36,1),
      border-color 180ms ease,
      visibility 0s linear 240ms;

    &.mobile-open{
      max-height:44px;
      min-height:40px;
      margin-top:4px;
      padding-top:0;
      padding-bottom:0;
      overflow:visible;
      border-color:var(--delivery-line);
      opacity:1;
      visibility:visible;
      pointer-events:auto;
      transform:translateY(0) scale(1);
      transition-delay:0s;
    }

    input{
      height:38px;
      font-size:13px;
    }
  }

  @media(prefers-reduced-motion:reduce){
    transition:none;
    transform:none;
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

export const HeroCarousel = styled.div`
  width:min(1120px,calc(100% - 48px));
  margin:40px auto 0;

  > section{
    width:100%;
    height:280px;
    min-height:280px;
    border-radius:20px;
  }

  @media(max-width:760px){
    width:calc(100% - 40px);
    margin:12px 20px 0;

    > section{
      height:160px !important;
      min-height:160px !important;
      border-radius:16px;
    }
  }
`;

export const Main = styled.main`
  width:min(1120px,calc(100% - 48px));
  margin:0 auto;
  padding:40px 0 80px;
  display:grid;
  gap:40px;

  @media(max-width:760px){
    width:100%;
    padding:20px 20px calc(148px + env(safe-area-inset-bottom, 0px));
    gap:0;
  }
`;

export const InfoChips = styled.div`
  display:flex;
  flex-wrap:wrap;
  gap:16px;

  span{
    min-height:41px;
    padding:0 16px;
    border:1px solid var(--delivery-line);
    border-radius:100px;
    background:#fff;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:7px;
    color:var(--delivery-muted);
    font-size:14px;
    font-weight:600;
    white-space:nowrap;
  }

  span:first-child{
    background:color-mix(in srgb,var(--delivery-primary) 9%,#fff);
    border-color:transparent;
  }

  b{color:var(--delivery-text)}

  @media(max-width:760px){
    flex-wrap:nowrap;
    overflow-x:auto;
    gap:8px;
    margin-right:-20px;
    padding:0 20px 4px 0;
    scrollbar-width:none;
    scroll-padding-inline:0 20px;

    &::-webkit-scrollbar{display:none}

    span{
      flex:0 0 auto;
      min-height:31px;
      padding:0 12px;
      border:0;
      background:#f0f0ee;
      font-size:12px;
    }

    span:first-child{
      background:color-mix(in srgb,var(--delivery-primary) 9%,#fff);
    }
  }
`;

export const CatalogCategories = styled.nav`
  display:flex;
  align-items:flex-start;
  gap:24px;
  padding-top:40px;
  border-top:1px solid var(--delivery-line);
  overflow-x:auto;
  scrollbar-width:none;

  &::-webkit-scrollbar{display:none}

  button{
    width:72px;
    flex:0 0 72px;
    padding:0;
    border:0;
    background:transparent;
    color:var(--delivery-text);
    display:grid;
    justify-items:center;
    gap:6px;
    text-align:center;
  }

  .image{
    width:80px;
    height:80px;
    border:1px solid var(--delivery-line);
    border-radius:50%;
    overflow:hidden;
    background:#f3f1ec;
    display:grid;
    place-items:center;
    color:#9d9991;
  }

  .image img{
    width:100%;
    height:100%;
    object-fit:cover;
  }

  .image svg{
    width:24px;
    height:24px;
  }

  button.active{
    color:var(--delivery-primary);
  }

  button.active .image{
    border:2px solid var(--delivery-primary);
    color:var(--delivery-primary);
    background:#fff;
  }

  button{
    transition:color 180ms ease,transform 180ms ease;
  }

  .image{
    transition:
      border-color 180ms ease,
      background-color 180ms ease,
      color 180ms ease,
      transform 180ms ease,
      box-shadow 180ms ease;
  }

  button.active .image{
    box-shadow:0 0 0 2px color-mix(in srgb,var(--delivery-primary) 8%,transparent);
  }

  button:active{
    transform:scale(.97);
  }

  @media(prefers-reduced-motion:reduce){
    button,.image{transition:none}
  }

  b{
    width:80px;
    font-size:14px;
    line-height:17px;
    font-weight:500;
    overflow-wrap:anywhere;
  }

  @media(max-width:760px){
    position:relative;
    gap:16px;
    margin-top:24px;
    margin-right:-20px;
    padding:25px 20px 24px 0;
    border-top:0;
    scroll-padding-inline:0 20px;

    &::before{
      content:'';
      position:absolute;
      top:0;
      left:0;
      right:20px;
      height:1px;
      background:var(--delivery-line);
    }

    button{
      width:72px;
      flex-basis:72px;
    }

    .image{
      width:60px;
      height:60px;
    }

    b{
      width:72px;
      font-size:13px;
      line-height:16px;
    }
  }
`;

export const Section = styled.section`
  scroll-margin-top:110px;
  display:grid;
  gap:16px;
  padding-top:40px;
  border-top:1px solid var(--delivery-line);

  @media(max-width:760px){
    position:relative;
    padding-top:28px;
    padding-bottom:24px;
    border-top:0;

    &::before{
      content:'';
      position:absolute;
      top:0;
      left:0;
      right:0;
      height:1px;
      background:var(--delivery-line);
    }
  }
`;

export const SectionHead = styled.div`
  min-height:36px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;

  h2{
    margin:0;
    font-family:'Gabarito','Inter',sans-serif;
    font-size:28px;
    line-height:1.15;
    font-weight:800;
    color:var(--delivery-text);
  }

  p{display:none}

  @media(max-width:760px){
    h2{font-size:20px;line-height:24px}
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
  gap:12px;

  button{
    width:36px;
    height:36px;
    padding:0;
    border:0;
    border-radius:50%;
    background:#f5f5f0;
    color:var(--delivery-text);
    display:grid;
    place-items:center;
    cursor:pointer;
    transition:opacity 160ms ease,transform 160ms ease,background 160ms ease;
  }

  button:hover:not(:disabled){
    background:color-mix(in srgb,var(--delivery-primary) 8%,#f5f5f0);
    transform:translateY(-1px);
  }

  button:disabled{
    opacity:.34;
    cursor:default;
  }

  button svg{
    width:16px;
    height:16px;
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
  padding:0;
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
    gap:12px;
    margin-right:-20px;
    padding-right:20px;

    > *{
      flex-basis:170px;
      min-width:170px;
    }
  }

  @media(prefers-reduced-motion:reduce){
    scroll-behavior:auto;
  }
`;

export const ProductCard = styled.article`
  position:relative;
  isolation:isolate;
  width:265px;
  height:294px;
  min-height:294px;
  overflow:hidden;
  border:1px solid var(--delivery-line);
  border-radius:16px;
  background:#fff;
  display:flex;
  flex-direction:column;

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

  .image svg{
    width:28px;
    height:28px;
  }

  .copy{
    position:relative;
    z-index:2;
    flex:1 1 auto;
    min-height:134px;
    padding:16px;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
    gap:12px;
    background:#fff;
  }

  .product-copy{
    min-width:0;
    display:grid;
    gap:4px;
  }

  .product-label{
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
    color:var(--delivery-primary);
    font-size:12px;
    line-height:15px;
    font-weight:700;
    text-transform:uppercase;
  }

  h3{
    margin:0;
    overflow:hidden;
    color:var(--delivery-text);
    font-size:16px;
    line-height:19px;
    font-weight:700;
    text-overflow:ellipsis;
    white-space:nowrap;
  }

  p{
    margin:0;
    overflow:hidden;
    color:var(--delivery-muted);
    font-size:13px;
    line-height:16px;
    text-overflow:ellipsis;
    white-space:nowrap;
  }

  .foot{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:8px;
  }

  .price{
    min-width:0;
    display:flex;
    align-items:baseline;
    gap:5px;
    flex-wrap:wrap;
  }

  .price del{
    color:var(--delivery-muted);
    font-size:10px;
  }

  strong{
    color:var(--delivery-text);
    font-size:16px;
    line-height:19px;
    font-weight:800;
    white-space:nowrap;
  }

  .add{
    flex:0 0 auto;
    min-height:28px;
    padding:0 10px;
    border:0;
    border-radius:8px;
    background:color-mix(in srgb,var(--delivery-primary) 9%,#fff);
    color:var(--delivery-primary);
    font-size:11px;
    line-height:1;
    font-weight:700;
    white-space:nowrap;
  }

  .open{
    position:absolute;
    inset:0;
    z-index:1;
    border:0;
    background:transparent;
  }

  .add{
    position:relative;
    z-index:2;
  }

  @media(max-width:760px){
    width:170px;
    height:215px;
    min-height:215px;

    .image{
      flex-basis:110px;
      height:110px;
      min-height:110px;
    }

    .copy{
      min-height:105px;
      padding:12px;
      gap:8px;
      background:#fff;
    }

    .product-copy{gap:2px}

    .product-label{
      font-family:'Gabarito','Inter',sans-serif;
      font-size:10px;
      line-height:12px;
    }

    h3{
      font-family:'Gabarito','Inter',sans-serif;
      font-size:15px;
      line-height:18px;
    }

    p{
      font-family:'Gabarito','Inter',sans-serif;
      font-size:11px;
      line-height:13px;
    }

    strong{
      font-family:'Gabarito','Inter',sans-serif;
      font-size:15px;
      line-height:18px;
    }

    .add{
      min-height:24px;
      padding:0 8px;
      border-radius:7px;
      font-family:'Gabarito','Inter',sans-serif;
      font-size:10px;
    }
  }
`;

export const RestaurantInfo = styled.section`
  min-height:120px;
  padding:24px;
  border:1px solid var(--delivery-line);
  border-radius:16px;
  background:#fff;
  display:grid;
  grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  grid-template-areas:
    'address phone'
    'hours social';
  column-gap:24px;
  row-gap:24px;
  align-items:center;

  .address{grid-area:address}
  .phone{grid-area:phone}
  .hours{grid-area:hours}
  .social-row{grid-area:social}

  .info-item{
    min-width:0;
    min-height:24px;
    display:flex;
    align-items:center;
    gap:12px;
    color:var(--delivery-text);
    font-size:13px;
    line-height:21px;
  }

  .info-icon{
    width:24px;
    height:24px;
    flex:0 0 24px;
    display:grid;
    place-items:center;
    color:var(--delivery-primary);
  }

  .info-icon svg{
    width:16px;
    height:16px;
    stroke-width:2;
  }

  .social-row{
    min-width:0;
    min-height:24px;
    display:flex;
    align-items:center;
    gap:12px;
  }

  .social-label{
    color:var(--delivery-text);
    font-size:13px;
    line-height:17px;
    white-space:nowrap;
  }

  .social{
    display:flex;
    align-items:center;
    gap:8px;
  }

  .social a{
    width:24px;
    height:24px;
    border:0;
    border-radius:0;
    color:var(--delivery-primary);
    display:grid;
    place-items:center;
  }

  .social a svg{
    width:16px;
    height:16px;
  }

  @media(max-width:760px){
    min-height:0;
    padding:18px 16px;
    grid-template-columns:1fr;
    grid-template-areas:
      'address'
      'hours'
      'phone'
      'social';
    gap:0;
    border-radius:16px;

    .info-item,
    .social-row{
      min-height:48px;
      padding:10px 0;
      align-items:center;
      gap:12px;
    }

    .info-item + .info-item,
    .social-row{
      border-top:1px solid color-mix(in srgb,var(--delivery-line) 82%,transparent);
    }

    .info-item{
      font-size:13px;
      line-height:19px;
    }

    .info-item > span:last-child{
      min-width:0;
      overflow-wrap:anywhere;
    }

    .info-icon{
      width:22px;
      height:22px;
      flex:0 0 22px;
      margin-top:0;
    }

    .info-icon svg{
      width:18px;
      height:18px;
    }

    .social-row{
      justify-content:space-between;
    }

    .social-label{
      display:block;
      color:var(--delivery-text);
      font-size:13px;
      font-weight:600;
      line-height:19px;
    }

    .social{
      gap:12px;
    }

    .social a{
      width:28px;
      height:28px;
      border-radius:8px;
      transition:background 160ms ease,transform 160ms ease;
    }

    .social a:active{
      transform:scale(.94);
    }

    .social a svg{
      width:18px;
      height:18px;
    }

    @media(prefers-reduced-motion:reduce){
      .social a{
        transition:none;
      }

      .social a:active{
        transform:none;
      }
    }
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
    position:fixed;right:20px;bottom:76px;z-index:28;
    width:56px;height:56px;border:0;border-radius:28px;
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
