import styled from 'styled-components';

export const Page = styled.div<{ $primary: string }>`
  --delivery-primary: ${({ $primary }) => $primary || '#e85a2b'};
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

  .brand { min-width: 0; display:flex; align-items:center; gap:12px; }
  .logo {
    width:40px;height:40px;border-radius:12px;overflow:hidden;flex:0 0 40px;
    display:grid;place-items:center;background:var(--delivery-primary);color:#fff;
    font-family:'Gabarito','Inter',sans-serif;font-size:20px;font-weight:800;
  }
  .logo img { width:100%;height:100%;object-fit:cover; }
  .brand-copy { min-width:0; display:grid; gap:2px; }
  .brand-copy b { overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'Gabarito','Inter',sans-serif;font-size:18px; }
  .status { display:flex;align-items:center;gap:6px;color:var(--delivery-muted);font-size:13px; }
  .status i { width:8px;height:8px;border-radius:50%;background:#33b864; }


  .actions { justify-self:end;display:flex;align-items:center;gap:18px; }
  .account { border:0;background:transparent;color:var(--delivery-text);display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px; }
  .cart {
    min-height:42px;padding:0 16px;border:0;border-radius:999px;background:var(--delivery-primary);
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

  @media(max-width:760px){
    position:static;height:64px;padding:12px 20px;gap:10px;
    grid-template-columns:minmax(0,1fr) 36px;
    .actions{display:none}
    .mobile-header-search{
      width:36px;height:36px;border:0;border-radius:18px;background:#f7f5f0;color:var(--delivery-text);
      display:grid;place-items:center;
    }
    .mobile-header-search svg{width:18px;height:18px}
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
  border-radius:999px;
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
    &.mobile-open{
      display:flex;
      position:absolute;
      inset:10px 20px auto 20px;
      z-index:3;
      width:auto;
      min-height:44px;
      background:#fff;
      border-radius:22px;
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
  }
`;


export const Hero = styled.section`
  position:relative;width:100%;height:360px;overflow:hidden;background:#28221e;
  img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .overlay{position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.18) 68%,rgba(0,0,0,.08))}
  .copy{position:relative;z-index:1;width:min(1120px,calc(100% - 48px));height:100%;margin:0 auto;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;color:#fff}
  small{font-size:15px;font-weight:700}
  h1{margin:6px 0 0;font-family:'Gabarito','Inter',sans-serif;font-size:48px;line-height:1;font-weight:800}
  h1 em{display:block;color:var(--delivery-primary);font-style:normal}
  p{margin:12px 0 22px;font-size:16px}
  button{min-height:44px;padding:0 22px;border:0;border-radius:999px;background:var(--delivery-primary);color:#fff;font-weight:700}

  @media(max-width:760px){
    height:235px;
    .copy{width:calc(100% - 40px)}
    h1{font-size:31px}
    p{font-size:13px;margin:8px 0 16px}
    button{min-height:38px;font-size:13px}
  }
`;

export const Main = styled.main`
  width:min(1120px,calc(100% - 48px));margin:0 auto;padding:28px 0 72px;display:grid;gap:34px;
  @media(max-width:760px){width:100%;padding:18px 20px 120px;gap:26px}
`;

export const InfoChips = styled.div`
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;
  span{min-height:46px;padding:0 14px;border:1px solid var(--delivery-line);border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;gap:7px;color:var(--delivery-muted);font-size:13px}
  b{color:var(--delivery-text)}
  @media(max-width:760px){display:flex;overflow-x:auto;gap:8px;scrollbar-width:none;margin-right:-20px;padding-right:20px;span{flex:0 0 auto;min-height:38px;font-size:11px}}
`;

export const Section = styled.section`display:grid;gap:18px;`;
export const SectionHead = styled.div`
 display:flex;align-items:end;justify-content:space-between;gap:16px;
 h2{margin:0;font-family:'Gabarito','Inter',sans-serif;font-size:28px;line-height:1.15}
 p{margin:5px 0 0;color:var(--delivery-muted);font-size:13px}
 button{border:0;background:transparent;color:var(--delivery-primary);font-weight:700}
 @media(max-width:760px){h2{font-size:22px}p{font-size:12px}}
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

export const ProductGrid = styled.div`
 display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;
 @media(max-width:980px){grid-template-columns:repeat(3,minmax(0,1fr))}
 @media(max-width:760px){grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
`;

export const ProductCard = styled.article`
 position:relative;overflow:hidden;border:1px solid var(--delivery-line);border-radius:16px;background:#fff;
 .image{height:150px;background:#f3f1ec;display:grid;place-items:center;color:#aaa49b}
 .image img{width:100%;height:100%;object-fit:cover}
 .copy{padding:14px;display:grid;gap:5px}
 .badge{position:absolute;top:10px;left:10px;max-width:calc(100% - 20px);padding:5px 8px;border-radius:7px;background:var(--delivery-primary);color:#fff;font-size:10px;font-weight:800;white-space:normal;overflow-wrap:anywhere}
 h3{margin:0;font-size:15px}
 p{height:32px;margin:0;color:var(--delivery-muted);font-size:11px;line-height:16px;overflow:hidden}
 .foot{display:flex;align-items:center;justify-content:space-between;gap:8px}
 .price{min-width:0;display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}
 .price del{color:var(--delivery-muted);font-size:11px}
 strong{color:var(--delivery-primary);font-size:15px}
 .add{min-height:30px;padding:0 10px;border:0;border-radius:999px;background:var(--delivery-primary);color:#fff;font-size:11px;font-weight:700}
 .open{position:absolute;inset:0;border:0;background:transparent}
 .add{position:relative;z-index:2}
 @media(max-width:760px){.image{height:104px}.copy{padding:10px}h3{font-size:13px}p{height:28px;font-size:10px}.add{width:28px;padding:0;font-size:0}.add::after{content:'+';font-size:18px}}
`;

export const RestaurantInfo = styled.section`
 padding:24px;border:1px solid var(--delivery-line);border-radius:16px;background:#fff;display:grid;grid-template-columns:1.2fr .8fr;gap:28px;
 h2{margin:0 0 14px;font-family:'Gabarito','Inter',sans-serif;font-size:22px}
 .rows{display:grid;gap:10px;color:var(--delivery-muted);font-size:13px}
 .row{display:flex;align-items:flex-start;gap:9px}
 .social{display:flex;gap:9px;flex-wrap:wrap}
 .social a{width:38px;height:38px;border:1px solid var(--delivery-line);border-radius:19px;color:var(--delivery-text);display:grid;place-items:center}
 @media(max-width:760px){grid-template-columns:1fr;padding:18px}
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
 @media(max-width:760px){position:static;border:0;border-radius:0;background:transparent;display:flex;overflow-x:auto;margin:0 -20px;padding:0 20px 14px;gap:8px;scrollbar-width:none;h2{display:none}button{width:auto;flex:0 0 auto;height:36px;min-height:36px;padding:0 14px;border-radius:20px;background:#f5f5f5}}
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
    position:fixed;right:20px;bottom:84px;z-index:28;
    width:56px;height:56px;border:0;border-radius:28px;
    background:var(--delivery-primary);color:#fff;
    box-shadow:0 10px 24px color-mix(in srgb,var(--delivery-primary) 28%, transparent);
    display:grid;place-items:center;
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
