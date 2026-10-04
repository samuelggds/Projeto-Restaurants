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
    font-size:13px;
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

export { Header, InlineSearch, InlineSearchResults } from './FigmaDeliveryExperience.header.styles';

export const Breadcrumb = styled.nav`
  width:min(1120px,calc(100% - 48px));
  height:24px;
  margin:0 auto;
  display:flex;
  align-items:center;
  gap:6px;
  color:#8a8880;
  font-size:15px;

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
    font-size:14px;
    line-height:18px;
    font-weight:850;
    white-space:nowrap;
    text-shadow:0 1px 8px rgba(0,0,0,.18);
  }

  .metric-card small{
    max-width:58px;
    color:rgba(255,255,255,.72);
    font-size:10px;
    line-height:13px;
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
    font-size:11px;
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
    font-size:12px;
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
    font-size:28px;
    line-height:36px;
    font-weight:850;
    letter-spacing:-.02em;
  }

  button{
    padding:0;
    border:0;
    background:transparent;
    color:var(--delivery-primary);
    font-size:13px;
    font-weight:750;
  }

  @media(max-width:760px){
    min-height:28px;
    h2{font-size:16px;line-height:20px;letter-spacing:0}
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
    font-size:14px;
    line-height:18px;
    font-weight:750;
  }
  small{
    margin-top:2px;
    color:#98958f;
    font-size:10px;
    line-height:13px;
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
      font-size:10px;
      line-height:13px;
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
    font-size:28px;
    line-height:36px;
    font-weight:850;
    letter-spacing:-.02em;
    color:var(--delivery-text);
  }

  p{
    margin:4px 0 0;
    color:var(--delivery-muted);
    font-size:13px;
    line-height:19px;
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
    font-size:11px;
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
      font-size:10px;
    }
  }
`;

export const Categories = styled.div`
  display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:16px;
  button{min-width:0;border:0;background:transparent;display:grid;justify-items:center;gap:8px;color:var(--delivery-text);font-weight:650}
  .image{width:82px;height:82px;border-radius:50%;overflow:hidden;background:#f1eee8;display:grid;place-items:center}
  .image img{width:100%;height:100%;object-fit:cover}
  .image svg{color:#aaa49b}
  b{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}
  @media(max-width:900px){grid-template-columns:repeat(4,minmax(0,1fr))}
  @media(max-width:760px){display:flex;overflow-x:auto;margin-right:-20px;padding-right:20px;scrollbar-width:none;gap:16px;button{flex:0 0 72px}.image{width:64px;height:64px}b{font-size:12px}}
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
    font-size:9px;
    line-height:12px;
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
    font-size:11px;
    line-height:15px;
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

  .price del{color:var(--delivery-muted);font-size:9px}

  strong{
    color:var(--delivery-text);
    font-size:14px;
    line-height:18px;
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
    font-size:10px;
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
    .product-label{font-size:8px;line-height:10px}
    h3{font-size:11px;line-height:14px}
    p{font-size:9px;line-height:12px;-webkit-line-clamp:1}
    strong{font-size:11px;line-height:14px}
    .price del{font-size:8px}
    .add{
      min-height:22px;
      padding:0 7px;
      border-radius:6px;
      font-size:8.5px;
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

    b{color:var(--delivery-primary);font-size:10px;line-height:13px}
    span{font-size:9px;line-height:12px}
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
    font-size:16px;
    line-height:21px;
    font-weight:800;
  }

  p{
    margin:0;
    color:var(--delivery-muted);
    font-size:12px;
    line-height:19px;
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
    font-size:16px;
    line-height:20px;
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
    font-size:12px;
    line-height:18px;
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
    font-size:13px;
    line-height:17px;
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

    .info-item{font-size:10px;line-height:14px}
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

    .social-label{font-size:10px;line-height:14px}
    .social{gap:6px}
    .social a{width:27px;height:27px;border-radius:8px}
    .social a svg{width:14px;height:14px}
  }
`;

export const Footer = styled.footer`
 background:#1f1e1a;color:#fff;padding:52px max(24px,calc((100vw - 1120px)/2));
 .inner{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:40px}
 h3{margin:0 0 14px;font-size:15px}
 p,a{color:#8d8a85;font-size:14px;line-height:1.6;text-decoration:none}
 .brand{font-family:'Gabarito','Inter',sans-serif;font-size:21px;font-weight:800;margin-bottom:12px}
 .bottom{margin-top:40px;padding-top:20px;border-top:1px solid #343330;color:#77746f;font-size:13px;display:flex;justify-content:space-between}
 @media(max-width:760px){display:none}
`;

export { MenuLayout, MenuCategories, MenuProducts, MenuCategoryBar, MenuProduct, MiniCart, MobileSearch, MobileCartFab, ProfileQuickMenuBackdrop, ProfileQuickMenuSheet, AddressPickerBackdrop, AddressPickerSheet, MobileBottomNav } from './FigmaDeliveryExperience.mobile.styles';
