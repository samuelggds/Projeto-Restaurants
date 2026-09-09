import styled from 'styled-components';

export const Root = styled.div`
  --demo-primary: #d64d08;
  --demo-primary-dark: #a83a06;
  --demo-bg: #f6f7f4;
  --demo-surface: #fff;
  --demo-border: #e4ddd5;
  --demo-text: #191816;
  --demo-muted: #716d68;
  min-height: 100vh;
  min-height: 100dvh;
  color: var(--demo-text);
  background:
    linear-gradient(rgba(60, 48, 40, 0.026) 1px, transparent 1px),
    linear-gradient(90deg, rgba(60, 48, 40, 0.026) 1px, transparent 1px),
    var(--demo-bg);
  background-size: 32px 32px;
  font-family: 'DM Sans', Inter, system-ui, sans-serif;
  *, *::before, *::after { box-sizing: border-box; }
  button, input, select { font: inherit; }
`;

export const DemoTopbar = styled.header`
  position: sticky;
  top: 0;
  z-index: 90;
  min-height: 64px;
  border-bottom: 1px solid rgba(228, 221, 213, .9);
  display: flex;
  align-items: center;
  background: rgba(255,255,255,.95);
  backdrop-filter: blur(16px);
`;

export const DemoTopbarInner = styled.div`
  width: min(1240px, calc(100% - 28px));
  margin: 0 auto;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
`;

export const BrandButton = styled.button`
  border:0;
  padding:0;
  display:flex;
  align-items:center;
  gap:10px;
  color:#191816;
  background:transparent;
  cursor:pointer;
  .g{width:30px;display:grid;place-items:center;font-family:'Sora',sans-serif;font-size:31px;font-weight:900;letter-spacing:-.1em;line-height:1;}
  b{display:block;font-family:'Sora',sans-serif;font-size:14px;}
  small{display:block;margin-top:1px;color:#8b837c;font-size:9px;text-align:left;text-transform:uppercase;letter-spacing:.05em;}
`;

export const TopActions = styled.div`
  display:flex;
  align-items:center;
  gap:8px;
  @media(max-width:580px){.wide-label{display:none;}}
`;

export const SoftButton = styled.button`
  min-height:38px;
  padding:0 13px;
  border:1px solid var(--demo-border);
  border-radius:7px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  color:#39332f;
  background:#fff;
  cursor:pointer;
  font-size:11px;
  font-weight:800;
  &:hover{border-color:#cfc5bc;background:#fbf9f7;}
`;

export const PrimaryButton = styled.button`
  min-height:42px;
  padding:0 16px;
  border:0;
  border-radius:7px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  color:#fff;
  background:var(--demo-primary);
  box-shadow:0 8px 18px rgba(214,77,8,.18);
  cursor:pointer;
  font-size:12px;
  font-weight:850;
  &:hover{background:var(--demo-primary-dark);}
  &:disabled{opacity:.45;cursor:not-allowed;}
`;

export const PortalPage = styled.main`
  width:min(1180px,calc(100% - 28px));
  margin:0 auto;
  padding:48px 0 72px;
`;

export const PortalHero = styled.section`
  max-width:850px;
  margin:0 auto 34px;
  text-align:center;
  .eyebrow{display:inline-flex;align-items:center;gap:7px;color:#9b3c0e;font-size:10px;font-weight:850;text-transform:uppercase;letter-spacing:.09em;}
  h1{margin:13px 0 0;font-family:'Sora',sans-serif;font-size:clamp(34px,6vw,58px);line-height:1.04;letter-spacing:-.055em;}
  h1 span{color:var(--demo-primary);}
  p{max-width:720px;margin:17px auto 0;color:var(--demo-muted);font-size:15px;line-height:1.65;}
`;

export const PortalGrid = styled.div`
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:14px;
  @media(max-width:850px){grid-template-columns:1fr;max-width:620px;margin:0 auto;}
`;

export const PortalCard = styled.article`
  position:relative;
  min-height:310px;
  padding:25px;
  border:1px solid var(--demo-border);
  border-radius:10px;
  display:flex;
  flex-direction:column;
  background:#fff;
  box-shadow:0 10px 28px rgba(51,35,22,.05);
  .icon{width:46px;height:46px;border-radius:8px;display:grid;place-items:center;color:var(--demo-primary);background:#fff0e8;}
  h2{margin:20px 0 7px;font-family:'Sora',sans-serif;font-size:22px;letter-spacing:-.035em;}
  p{margin:0;color:var(--demo-muted);font-size:13px;line-height:1.55;}
  ul{margin:18px 0 22px;padding:0;list-style:none;display:grid;gap:8px;color:#514a45;font-size:11px;}
  li{display:flex;align-items:center;gap:7px;}
  li svg{color:#287139;}
  button{margin-top:auto;}
`;

export const CredentialAside = styled.aside`
  margin:18px 0 0;
  padding:14px;
  border:1px solid #e5ddd5;
  border-radius:8px;
  background:#fff8f3;
  > strong{display:block;color:#322a25;font-size:12px;}
  > small{display:block;margin-top:3px;color:#8d7768;font-size:10px;line-height:1.4;}
`;

export const CredentialList = styled.div`
  display:grid;
  gap:6px;
  margin-top:10px;
`;

export const CredentialButton = styled.button<{ $active?: boolean }>`
  width:100%;
  min-height:49px;
  padding:8px 10px;
  border:1px solid ${({$active})=>$active?'#d64d08':'#e2d8cf'};
  border-radius:7px;
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:8px;
  align-items:center;
  text-align:left;
  color:#342e2a;
  background:${({$active})=>$active?'#fff3ec':'#fff'};
  cursor:pointer;
  b,small{display:block;}
  b{font-size:10px;}
  small{margin-top:2px;color:#7f756e;font-size:9px;}
  code{padding:4px 6px;border-radius:5px;background:#f2ece7;color:#6c5141;font-size:9px;}
`;

export const DemoRibbon = styled.div`
  position:fixed;
  left:50%;
  bottom:16px;
  z-index:100;
  transform:translateX(-50%);
  min-width:min(560px,calc(100% - 24px));
  padding:9px 12px;
  border:1px solid rgba(255,255,255,.12);
  border-radius:8px;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  color:#fff;
  background:rgba(24,22,20,.93);
  box-shadow:0 12px 30px rgba(0,0,0,.18);
  backdrop-filter:blur(10px);
  font-size:10px;
  font-weight:750;
  pointer-events:none;
`;

export const OpsShell = styled.div`
  min-height:calc(100dvh - 64px);
  display:grid;
  grid-template-columns:236px minmax(0,1fr);
  background-color:#f6f7f4;
  background-image:
    linear-gradient(rgba(60,48,40,.026) 1px,transparent 1px),
    linear-gradient(90deg,rgba(60,48,40,.026) 1px,transparent 1px);
  background-size:32px 32px;
  @media(max-width:820px){grid-template-columns:1fr;}
`;

export const Sidebar = styled.aside`
  height:calc(100dvh - 64px);
  position:sticky;
  top:64px;
  padding:16px 12px;
  display:flex;
  flex-direction:column;
  color:#f7f3ef;
  background:linear-gradient(180deg,#282320 0%,#17191a 100%);
  border-right:1px solid rgba(255,255,255,.07);
  z-index:40;
  @media(max-width:820px){position:static;height:auto;min-height:0;padding:11px;}
`;

export const SidebarBrand = styled.div`
  padding:5px 8px 18px;
  display:grid;
  grid-template-columns:44px minmax(0,1fr);
  align-items:center;
  gap:10px;
  border-bottom:1px solid rgba(255,255,255,.09);
  .mark{grid-row:1/span 2;width:44px;height:44px;border-radius:8px;display:grid;place-items:center;color:#fff;background:var(--demo-primary);font-family:'Sora',sans-serif;font-size:14px;font-weight:850;}
  b{overflow:hidden;color:#fff;font-size:12px;text-overflow:ellipsis;white-space:nowrap;}
  small{color:#9b918b;font-size:8px;font-weight:700;text-transform:uppercase;}
`;

export const SideNav = styled.nav`
  margin-top:17px;
  display:grid;
  gap:5px;
  button{width:100%;min-height:44px;padding:0 12px;border:0;border-radius:7px;display:flex;align-items:center;gap:10px;color:#bfb6b0;background:transparent;font-size:11px;font-weight:650;text-align:left;cursor:pointer;}
  button:hover{color:#fff;background:rgba(255,255,255,.06);}
  button.active{color:#fff;background:var(--demo-primary);box-shadow:0 7px 18px rgba(214,77,8,.22);}
  svg{width:18px;}
  @media(max-width:820px){grid-template-columns:repeat(3,minmax(0,1fr));margin-top:10px;button{justify-content:center;padding:0 8px;font-size:10px;}}
`;

export const SideFooter = styled.div`
  margin-top:auto;
  padding-top:12px;
  border-top:1px solid rgba(255,255,255,.09);
  display:grid;
  gap:8px;
  .user{display:grid;grid-template-columns:36px minmax(0,1fr);gap:8px;align-items:center;padding:6px;}
  .avatar{width:36px;height:36px;border-radius:7px;display:grid;place-items:center;color:#fff;background:rgba(214,77,8,.24);font-size:10px;font-weight:850;}
  b,small{display:block;}
  b{color:#fff;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  small{margin-top:2px;color:#958b85;font-size:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  button{min-height:38px;border:0;border-radius:7px;display:flex;align-items:center;justify-content:center;gap:7px;color:#c8bdb6;background:rgba(255,255,255,.05);cursor:pointer;font-size:10px;font-weight:750;}
  @media(max-width:820px){display:none;}
`;

export const OpsMain = styled.main`
  min-width:0;
`;

export const OpsHeader = styled.header`
  min-height:124px;
  padding:23px 30px 18px;
  border-bottom:1px solid var(--demo-border);
  display:flex;
  align-items:center;
  gap:16px;
  background:rgba(255,253,249,.95);
  backdrop-filter:blur(12px);
  .crumb{font-size:9px;color:var(--demo-primary);font-weight:800;letter-spacing:.06em;text-transform:uppercase;}
  h1{margin:8px 0 5px;font-family:'Sora',sans-serif;font-size:27px;letter-spacing:-.035em;}
  p{margin:0;color:var(--demo-muted);font-size:12px;line-height:1.45;}
  .status{margin-left:auto;padding:7px 10px;border:1px solid #cfe0da;border-radius:999px;color:#176b52;background:#f3f9f6;font-size:9px;font-weight:800;white-space:nowrap;}
  @media(max-width:620px){padding:15px 12px;min-height:100px;h1{font-size:21px;}.status{display:none;}}
`;

export const OpsContent = styled.div`
  width:100%;
  max-width:1480px;
  margin:0 auto;
  padding:24px 30px 86px;
  @media(max-width:820px){padding:14px 10px 90px;}
`;

export const Metrics = styled.div`
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:10px;
  margin-bottom:16px;
  @media(max-width:900px){grid-template-columns:1fr 1fr;}
`;

export const Metric = styled.article`
  min-height:88px;
  padding:14px;
  border:1px solid #e5ded7;
  border-radius:8px;
  display:flex;
  align-items:center;
  gap:12px;
  background:#fff;
  box-shadow:0 4px 14px rgba(23,37,34,.035);
  .icon{width:39px;height:39px;border-radius:7px;display:grid;place-items:center;color:#176b66;background:#eef4f2;}
  small,b{display:block;}
  small{color:#6d6965;font-size:9px;}
  b{margin-top:4px;font-size:20px;}
`;

export const ContentGrid = styled.div`
  display:grid;
  grid-template-columns:repeat(12,minmax(0,1fr));
  gap:13px;
  @media(max-width:900px){display:block;> *{margin-bottom:12px;}}
`;

export const Panel = styled.section<{ $span?: number }>`
  grid-column:span ${({$span})=>$span ?? 12};
  min-width:0;
  border:1px solid #e5ded7;
  border-radius:8px;
  overflow:hidden;
  background:#fff;
  box-shadow:0 6px 18px rgba(50,39,30,.035);
`;

export const PanelHeader = styled.header`
  min-height:58px;
  padding:13px 15px;
  border-bottom:1px solid #eee8e2;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  background:#fffdfa;
  h2{margin:0;font-family:'Sora',sans-serif;font-size:14px;letter-spacing:-.025em;}
  small{display:block;margin-top:3px;color:#857e78;font-size:9px;}
  svg{color:#8c8178;}
`;

export const OrderList = styled.div`
  display:grid;
`;

export const OrderRow = styled.div`
  min-height:66px;
  padding:9px 14px;
  border-bottom:1px solid #f0ece8;
  display:grid;
  grid-template-columns:70px minmax(170px,1fr) 95px 105px 145px;
  gap:10px;
  align-items:center;
  font-size:10px;
  &:last-child{border-bottom:0;}
  .customer b,.customer small,.value b,.value small{display:block;}
  .customer small,.value small{margin-top:3px;color:#887f78;font-size:8px;}
  .value{text-align:right;}
  @media(max-width:760px){grid-template-columns:58px minmax(120px,1fr) auto;.channel,.value{display:none;}}
`;

export const Status = styled.span<{ $tone: 'warning'|'info'|'success'|'danger' }>`
  width:fit-content;
  padding:5px 7px;
  border-radius:999px;
  color:${({$tone})=>$tone==='success'?'#287139':$tone==='danger'?'#a6382e':$tone==='info'?'#276677':'#95620f'};
  background:${({$tone})=>$tone==='success'?'#edf7ee':$tone==='danger'?'#fff0ed':$tone==='info'?'#edf5f7':'#fff7e7'};
  font-size:8px;
  font-weight:850;
  white-space:nowrap;
`;

export const Actions = styled.div`
  display:flex;
  flex-wrap:wrap;
  gap:5px;
  margin-top:5px;
  button{min-height:27px;padding:0 7px;border:1px solid #ddd5ce;border-radius:6px;color:#514a44;background:#fff;font-size:8px;font-weight:800;cursor:pointer;}
  button.primary{color:#fff;border-color:var(--demo-primary);background:var(--demo-primary);}
`;

export const Empty = styled.div`
  min-height:140px;
  padding:24px;
  display:grid;
  place-items:center;
  align-content:center;
  gap:6px;
  color:#847d77;
  text-align:center;
  b{color:#423d39;font-size:12px;}
  span{font-size:10px;}
`;

export const TableGrid = styled.div`
  padding:12px;
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:9px;
  @media(max-width:520px){grid-template-columns:1fr;}
`;

export const TableCard = styled.article`
  padding:13px;
  border:1px solid #e3dcd5;
  border-radius:7px;
  background:#fff;
  header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
  b,small{display:block;}
  b{font-size:11px;}
  small{margin-top:3px;color:#807872;font-size:8px;}
`;

export const CallList = styled.div`
  padding:12px;
  display:grid;
  gap:8px;
`;

export const CallCard = styled.article`
  min-height:58px;
  padding:10px 11px;
  border:1px solid #e4ddd5;
  border-radius:7px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  b,small{display:block;}
  b{font-size:10px;}
  small{margin-top:3px;color:#827a74;font-size:8px;}
`;

export const CustomerRoot = styled.div`
  min-height:calc(100dvh - 64px);
  --home-primary:#d64d08;
  --home-border:#dfe4df;
  --home-text:#17211d;
  --home-muted:#66716b;
  background:linear-gradient(180deg,#f1f4f1 0,#fff 620px,#f7f8f6 100%);
  color:var(--home-text);
`;

export const CustomerHeader = styled.header`
  min-height:78px;
  padding:0 max(18px,calc((100vw - 1240px)/2));
  border-bottom:1px solid var(--home-border);
  display:flex;
  align-items:center;
  gap:16px;
  background:#fff;
  position:sticky;
  top:64px;
  z-index:30;
  .brand{display:flex;align-items:center;gap:10px;margin-right:auto;}
  .brand .mark{width:42px;height:42px;border-radius:7px;display:grid;place-items:center;color:#fff;background:var(--home-primary);font-weight:900;}
  b,small{display:block;}
  .brand b{font-family:Georgia,'Times New Roman',serif;font-size:18px;}
  .brand small{margin-top:2px;color:#7e847f;font-size:9px;}
  .user{padding:7px 10px;border:1px solid var(--home-border);border-radius:7px;background:#f8faf8;font-size:10px;}
  .cart{min-width:42px;height:42px;border:0;border-radius:7px;display:flex;align-items:center;justify-content:center;gap:5px;color:#fff;background:var(--home-primary);cursor:pointer;font-weight:800;}
`;

export const CustomerMain = styled.main`
  width:min(1240px,calc(100% - 24px));
  margin:0 auto;
  padding:22px 0 86px;
`;

export const CustomerHero = styled.section`
  min-height:210px;
  padding:32px;
  border-radius:10px;
  display:flex;
  align-items:flex-end;
  background:
    radial-gradient(circle at 82% 18%,rgba(255,255,255,.16),transparent 14rem),
    linear-gradient(130deg,#263d34,#17211d);
  color:#fff;
  box-shadow:0 14px 35px rgba(23,33,29,.15);
  h1{margin:7px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:clamp(30px,5vw,50px);}
  p{max-width:600px;margin:9px 0 0;color:#d5ded9;line-height:1.55;font-size:12px;}
  span{color:#ff9a68;font-size:9px;font-weight:850;text-transform:uppercase;letter-spacing:.1em;}
`;

export const CategoryRow = styled.div`
  display:flex;
  gap:8px;
  overflow-x:auto;
  padding:20px 0 12px;
  button{min-width:130px;min-height:50px;padding:0 14px;border:1px solid var(--home-border);border-radius:7px;background:#fff;color:#4b5650;cursor:pointer;font-weight:750;font-size:10px;}
  button.active{border-color:var(--home-primary);color:var(--home-primary);background:#fff6f0;}
`;

export const Products = styled.div`
  margin-top:12px;
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:13px;
  @media(max-width:760px){grid-template-columns:1fr;}
`;

export const ProductCard = styled.article`
  min-height:150px;
  border:1px solid var(--home-border);
  border-radius:8px;
  overflow:hidden;
  display:grid;
  grid-template-columns:145px minmax(0,1fr);
  background:#fff;
  box-shadow:0 7px 22px rgba(70,45,20,.04);
  .image{display:grid;place-items:center;background:linear-gradient(145deg,#e8ded4,#c9b5a3);color:#6b4c39;font-family:Georgia,serif;font-size:28px;font-weight:800;}
  .body{padding:16px;display:flex;flex-direction:column;}
  h3{margin:0;font-size:16px;}
  p{margin:6px 0 12px;color:var(--home-muted);font-size:11px;line-height:1.45;}
  footer{margin-top:auto;display:flex;align-items:center;gap:9px;}
  footer strong{color:var(--home-primary);font-size:14px;}
  footer button{margin-left:auto;width:35px;height:35px;border:0;border-radius:8px;display:grid;place-items:center;color:#fff;background:var(--home-primary);cursor:pointer;}
  @media(max-width:480px){grid-template-columns:108px minmax(0,1fr);min-height:125px;.body{padding:12px;}h3{font-size:14px;}.image{font-size:22px;}}
`;

export const CartDrawer = styled.aside<{ $open: boolean }>`
  position:fixed;
  top:0;
  right:0;
  z-index:120;
  width:min(480px,100%);
  height:100dvh;
  padding:20px;
  transform:translateX(${({$open})=>$open?'0':'100%'});
  visibility:${({$open})=>$open?'visible':'hidden'};
  transition:transform .28s ease,visibility .28s;
  background:#f4f6f3;
  box-shadow:${({$open})=>$open?'-22px 0 70px rgba(20,31,26,.24)':'none'};
  display:flex;
  flex-direction:column;
  header{display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid var(--home-border);}
  h2{margin:0;font-family:Georgia,'Times New Roman',serif;}
`;

export const CartOverlay = styled.button<{ $open: boolean }>`
  position:fixed;
  inset:0;
  z-index:110;
  border:0;
  background:rgba(15,12,10,.58);
  opacity:${({$open})=>$open?1:0};
  visibility:${({$open})=>$open?'visible':'hidden'};
  transition:opacity .2s,visibility .2s;
`;

export const CartLines = styled.div`
  margin-top:14px;
  display:grid;
  gap:8px;
  overflow:auto;
`;

export const CartLine = styled.div`
  padding:11px;
  border:1px solid var(--home-border);
  border-radius:7px;
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:8px;
  background:#fff;
  b,small{display:block;}
  b{font-size:11px;}
  small{margin-top:3px;color:#787e7a;font-size:9px;}
  .qty{display:flex;align-items:center;gap:7px;}
  .qty button{width:28px;height:28px;border:0;border-radius:6px;background:#f0ece6;cursor:pointer;}
`;

export const Checkout = styled.div`
  margin-top:auto;
  padding-top:14px;
  border-top:1px solid var(--home-border);
  display:grid;
  gap:9px;
  label{display:grid;gap:4px;color:#68716c;font-size:9px;font-weight:800;text-transform:uppercase;}
  select{height:40px;border:1px solid var(--home-border);border-radius:7px;padding:0 10px;background:#fff;}
  .total{display:flex;align-items:center;justify-content:space-between;margin-top:5px;font-size:12px;}
  .total strong{font-size:20px;color:var(--home-primary);}
`;

export const Toast = styled.div`
  margin-bottom:13px;
  padding:11px 13px;
  border:1px solid #bad9bf;
  border-radius:7px;
  display:flex;
  align-items:center;
  gap:8px;
  color:#287139;
  background:#edf7ee;
  font-size:10px;
  font-weight:750;
`;
