import styled from 'styled-components';

export const Root = styled.div<{ $primary: string; $dark?: boolean }>`
  --p: ${({ $primary }) => $primary || '#e85a2b'};
  --bg: ${({ $dark }) => ($dark ? '#151515' : '#f7f5f1')};
  --surface: ${({ $dark }) => ($dark ? '#202020' : '#ffffff')};
  --text: ${({ $dark }) => ($dark ? '#f6f4ef' : '#1f1e1a')};
  --muted: ${({ $dark }) => ($dark ? '#aaa69f' : '#6f6a64')};
  --line: ${({ $dark }) => ($dark ? '#34322f' : '#dfdbd5')};
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', system-ui, sans-serif;

  *, *::before, *::after { box-sizing: border-box; }
  button, input, select, textarea { font: inherit; }
  button, input, select, textarea { color: var(--text); }
  button { cursor: pointer; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
  }
`;

export const Header = styled.header`
  height:80px;padding:0 120px;border-bottom:1px solid var(--line);background:var(--surface);
  display:grid;grid-template-columns:minmax(260px,1fr) auto;align-items:center;gap:28px;
  .brand{justify-self:start;padding:0;border:0;background:transparent;color:var(--text);display:flex;align-items:center;gap:12px;min-width:0;text-align:left;cursor:pointer}.brand:hover .brand-copy b,.brand:focus-visible .brand-copy b{color:var(--p)}.brand:focus-visible{outline:2px solid color-mix(in srgb,var(--p) 30%,transparent);outline-offset:6px;border-radius:10px}
  .logo{width:40px;height:40px;border-radius:12px;overflow:hidden;background:var(--p);color:#fff;display:grid;place-items:center;font-family:'Gabarito','Inter',sans-serif;font-size:20px;font-weight:800}
  .logo img{width:100%;height:100%;object-fit:cover}
  .brand-copy{display:grid;gap:2px;min-width:0}.brand-copy b{font-family:'Gabarito','Inter',sans-serif;font-size:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .status{color:var(--muted);font-size:13px;display:flex;align-items:center;gap:6px}.status i{width:8px;height:8px;border-radius:50%}.status i.open{background:#33b864}.status i.closed{background:#e5484d}
  .actions{justify-self:end;display:flex;align-items:center;gap:24px}
  .account{border:0;background:transparent;color:var(--text);display:flex;align-items:center;gap:8px;font-weight:650}
  .cart{min-height:40px;padding:0 16px;border:0;border-radius: 10px;background:var(--p);color:#fff;display:flex;align-items:center;gap:10px;font-weight:700}
  .cart i{padding:2px 6px;border-radius:8px;background:#1f1e1a;font-size:11px;font-style:normal}

  @media(max-width:900px){display:none}
`;

export const Mobile = styled.main`
  display:none;
  @media(max-width:900px){
    display:block;
    min-height:calc(100dvh - 44px);
    padding:20px 20px 28px;
    background:var(--bg);
    color:var(--text);

    &.orders-view{
      padding-top:0;
    }

    &.orders-view .orders-page-title{
      min-height:60px;
      margin:0 -20px;
      padding:12px 20px;
      border-bottom:1px solid var(--line);
      background:var(--surface);
    }

    &.orders-view > div{
      gap:0;
    }
  }
`;

export const Desktop = styled.main`
  display:block;
  min-height:896px;
  padding:64px 120px 80px;
  background:var(--bg);
  color:var(--text);
  @media(max-width:1100px){padding-inline:48px}
  @media(max-width:900px){display:none}
`;

export const Center = styled.div<{ $wide?: boolean }>`
  width:${({$wide})=>$wide?'800px':'720px'};max-width:100%;margin:0 auto;display:grid;gap:32px;
  &.orders-center{width:1200px}
  @media(max-width:1100px){&.orders-center{width:100%}}
`;

export const PageTitle = styled.div`
  display:flex;align-items:center;gap:16px;
  h1{margin:0;font-family:'Gabarito','Inter',sans-serif;font-size:32px;line-height:1;font-weight:800}
  .back{width:36px;height:36px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--text);display:grid;place-items:center;transition:background-color 160ms ease,transform 160ms ease}
  .back svg{width:24px;height:24px}
  .back:hover{background:color-mix(in srgb,var(--surface) 72%,var(--line))}
  .back:active{transform:scale(.94)}
  .back:focus-visible{outline:2px solid color-mix(in srgb,var(--p) 28%,transparent);outline-offset:2px}
  @media(max-width:900px){
    gap:12px;margin-bottom:24px;
    h1{font-size:24px}
    .back{width:36px;height:36px}
  }
`;

export const ProfileCard = styled.section`
  padding:16px;border:1px solid var(--line);border-radius:20px;background:var(--surface);color:var(--text);display:flex;align-items:center;gap:16px;box-shadow:0 5px 18px rgba(25,22,18,.035);
  .avatar{width:60px;height:60px;flex:0 0 60px;border-radius:50%;overflow:hidden;background:color-mix(in srgb,var(--p) 12%,#fff);color:var(--p);display:grid;place-items:center;font-family:'Gabarito','Inter',sans-serif;font-size:22px;font-weight:800}
  .avatar-button{position:relative;padding:0;border:0;cursor:pointer}
  .avatar-button:disabled{cursor:default}
  .avatar img{width:100%;height:100%;object-fit:cover}
  .avatar-edit{position:absolute;right:1px;bottom:1px;width:21px;height:21px;border:2px solid var(--surface);border-radius:50%;background:var(--p);color:#fff;display:grid;place-items:center;opacity:0;transform:scale(.88);transition:opacity 160ms ease,transform 160ms ease}
  .avatar-edit svg{width:11px;height:11px}
  .avatar-button:hover .avatar-edit,.avatar-button:focus-visible .avatar-edit{opacity:1;transform:scale(1)}
  .avatar-loading{position:absolute;inset:0;border-radius:50%;display:grid;place-items:center;background:rgba(31,30,26,.64);color:#fff;font-size:9px;font-family:'Inter',sans-serif;font-weight:700}
  .avatar-input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
  .copy{min-width:0;display:grid;gap:4px}
  .copy b{font-family:'Gabarito','Inter',sans-serif;font-size:18px}
  .copy span{min-width:0;overflow:hidden;color:var(--muted);font-size:13px;text-overflow:ellipsis;white-space:nowrap}
  .desktop-contact{display:none}
  @media(max-width:900px){
    .avatar-edit{opacity:1;transform:none}
  }

  @media(min-width:901px){
    padding:24px;
    gap:24px;
    .avatar{width:72px;height:72px;flex-basis:72px;border-radius:50%}
    .copy{gap:6px}
    .copy b{font-size:22px}
    .copy span{font-size:14px}
    .mobile-contact{display:none}
    .desktop-contact{display:block}
  }

  @media(prefers-reduced-motion:reduce){
    .avatar-edit{transition:none}
  }
`;

export const MenuCard = styled.section`
  padding:8px;border:1px solid var(--line);border-radius:20px;background:var(--surface);color:var(--text);box-shadow:0 5px 18px rgba(25,22,18,.035);
  button{width:100%;min-height:52px;padding:16px;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--text);display:flex;align-items:center;gap:12px;text-align:left}
  button:last-child{border-bottom:0}
  button svg:first-child{width:20px;height:20px;flex:0 0 20px}
  button span{font-size:15px;font-weight:650}
  button .chev{width:16px;height:16px;margin-left:auto;color:#8e8b86;flex:0 0 16px}
  .badge{margin-left:auto;padding:4px 8px;border-radius:8px;background:#fdf2ec;color:var(--p);font-size:11px;font-weight:800;white-space:nowrap}
  .badge + .chev{margin-left:0}

  @media(min-width:901px){
    padding:12px;
    button{min-height:60px;padding:20px;gap:16px}
    button span{font-size:16px}
    .badge{padding:4px 10px;font-size:12px}
  }
`;

export const Logout = styled.button`
  width:100%;
  padding:16px;
  border:0;
  background:transparent;
  font-size:15px;
  font-weight:700;

  && {
    color:#df2c2c;
  }

  &:hover {
    color:#c82020;
  }

  @media(min-width:901px){
    min-height:51px;
    font-size:16px;
  }
`;

export const Stack = styled.div`display:grid;gap:16px;`;

export const OrdersView = styled.div`
  display:grid;
  gap:32px;
  @media(max-width:900px){gap:0}
`;

export const Tabs = styled.div`
  display:flex;
  align-items:flex-start;
  border-bottom:1px solid var(--line);

  button{
    min-height:50px;
    padding:0 32px;
    border:0;
    border-bottom:3px solid transparent;
    background:transparent;
    color:var(--muted);
    font-weight:500;
  }

  button.active{
    border-bottom-color:var(--p);
    color:var(--p);
    font-weight:700;
  }

  .mobile-label{display:none}

  @media(max-width:900px){
    width:calc(100% + 40px);
    margin-left:-20px;

    button{
      min-height:45px;
      padding:0;
      flex:1;
      border-bottom-width:2px;
      font-size:14px;
    }

    .mobile-label{display:inline}
    .desktop-label{display:none}
  }
`;

export const OrderList = styled.div`
  display:grid;
  gap:20px;

  @media(max-width:900px){
    gap:16px;
    padding-top:20px;
  }
`;

export const OrderCard = styled.article`
  padding:24px;
  border:1px solid var(--line);
  border-radius:16px;
  background:var(--surface);
  color:var(--text);
  box-shadow:0 4px 14px rgba(25,22,18,.03);
  display:grid;
  gap:16px;
  outline:none;

  .order-header,.order-body{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:16px;
    min-width:0;
  }

  .restaurant{
    min-width:0;
    display:flex;
    align-items:center;
    gap:12px;
  }

  .thumb{
    width:48px;
    height:48px;
    flex:0 0 48px;
    border-radius:10px;
    overflow:hidden;
    display:grid;
    place-items:center;
    background:#f7f5f0;
    color:var(--p);
    font-family:'Gabarito','Inter',sans-serif;
    font-weight:800;
  }

  .thumb img{width:100%;height:100%;object-fit:cover}

  .restaurant-copy{min-width:0;display:grid;gap:4px}
  .restaurant-copy b{
    overflow:hidden;
    font-family:'Gabarito','Inter',sans-serif;
    font-size:18px;
    text-overflow:ellipsis;
    white-space:nowrap;
  }
  .restaurant-copy span{
    overflow:hidden;
    color:var(--muted);
    font-size:13px;
    text-overflow:ellipsis;
    white-space:nowrap;
  }

  .status{
    padding:6px 14px;
    border-radius:8px;
    font-size:12px;
    font-weight:800;
    white-space:nowrap;
  }
  .status.preparing{background:#fdf2ec;color:var(--p)}
  .status.on-the-way{background:#ecf2fd;color:#2b6be8}
  .status.delivered{background:#eaf7ee;color:#268c43}
  .status.cancelled{background:#fff0ee;color:#c54436}
  .status.payment-pending{background:#fff6df;color:#a66b00}

  .divider{height:1px;background:var(--line)}

  .order-body p{
    min-width:0;
    margin:0;
    overflow:hidden;
    color:var(--muted);
    font-size:15px;
    line-height:1.45;
    text-overflow:ellipsis;
    white-space:nowrap;
  }

  .order-body strong{
    flex:0 0 auto;
    font-size:16px;
    white-space:nowrap;
  }

  .order-progress{
    display:grid;
    gap:10px;
    width:min(600px,100%);
    margin-inline:auto;
  }

  .progress-line{
    display:flex;
    align-items:center;
    padding-inline:12px;
  }

  .progress-segment{
    min-width:0;
    flex:1;
    display:flex;
    align-items:center;
  }

  .progress-segment:last-child{flex:0 0 12px}

  .progress-segment i{
    width:12px;
    height:12px;
    flex:0 0 12px;
    border-radius:50%;
    background:#d8d5d0;
  }

  .progress-segment em{
    height:2px;
    flex:1;
    background:#efece6;
  }

  .progress-segment i.done,
  .progress-segment em.done{
    background:var(--p);
  }

  .progress-labels{
    display:grid;
    grid-template-columns:repeat(4,1fr);
    color:var(--muted);
    font-size:9px;
    font-style:normal;
    text-align:center;
  }

  .progress-labels span.current{
    color:var(--p);
    font-weight:800;
  }

  .track-order{
    width:100%;
    min-height:36px;
    padding:9px 12px;
    border:1px solid var(--p);
    border-radius:999px;
    background:#fff;
    color:var(--p);
    display:flex;
    align-items:center;
    gap:8px;
    font-size:13px;
    font-weight:700;
    text-align:left;
    transition:background 180ms ease,transform 180ms ease;
  }

  .track-order:hover{background:color-mix(in srgb,var(--p) 5%,#fff)}
  .track-order:active{transform:scale(.995)}
  .track-order svg{width:14px;height:14px;flex:0 0 14px}

  .support-order{
    justify-self:start;
    padding:0;
    border:0;
    background:transparent;
    color:var(--p);
    display:flex;
    align-items:center;
    gap:6px;
    font-size:12px;
    font-weight:700;
  }

  .support-order svg{width:14px;height:14px}

  @media(max-width:900px){
    padding:16px;
    gap:12px;
    .restaurant{gap:8px}
    .thumb{width:32px;height:32px;flex-basis:32px;border-radius:8px}
    .restaurant-copy{gap:2px}
    .restaurant-copy b{font-size:15px}
    .restaurant-copy span{font-size:12px}
    .status{padding:4px 8px;font-size:11px}
    .order-body p{font-size:13px}
    .order-body strong{font-size:14px}
    .order-progress{width:100%}
    .progress-labels{font-size:9px}
    .track-order{min-height:36px}
  }

  @media(max-width:430px){
    .order-header{align-items:flex-start}
    .restaurant-copy{max-width:190px}
  }
`;

export const ItemCard = styled.article`
  min-height:84px;padding:16px 20px;border:1px solid var(--line);border-radius:16px;background:var(--surface);color:var(--text);display:flex;align-items:center;gap:16px;box-shadow:0 4px 14px rgba(25,22,18,.03);
  .icon{width:44px;height:44px;flex:0 0 44px;border-radius:12px;background:#fdf2ec;color:var(--p);display:grid;place-items:center}
  .copy{min-width:0;display:grid;gap:4px;flex:1}.copy b{font-size:15px}.copy span{color:var(--muted);font-size:13px;line-height:1.35}
  .default{color:var(--p);font-size:11px;font-weight:800}
  .actions{display:flex;gap:8px}
  .actions button{min-height:34px;padding:0 10px;border:0;border-radius:9px;background:color-mix(in srgb,var(--surface) 86%,var(--line));color:var(--text);font-size:11px;font-weight:700}
  @media(max-width:900px){padding:14px;align-items:flex-start;.actions{margin-left:auto}}
`;

export const AddButton = styled.button`
  width:100%;min-height:48px;border:1px dashed color-mix(in srgb,var(--p) 55%,var(--line));border-radius:14px;background:var(--surface);color:var(--p);font-weight:700;
`;

export const Coupon = styled.article<{ $muted?: boolean }>`
  padding:20px;border:1px solid var(--line);border-radius:18px;background:var(--surface);display:grid;gap:12px;opacity:${({$muted})=>$muted?.65:1};
  .top{display:flex;align-items:center;justify-content:space-between;gap:12px}
  code{padding:6px 9px;border-radius:8px;background:color-mix(in srgb,var(--surface) 86%,var(--line));color:var(--text);font-weight:800}
  .state{padding:5px 9px;border-radius:8px;background:#fdf2ec;color:var(--p);font-size:11px;font-weight:800}
  h3{margin:0;font-family:'Gabarito','Inter',sans-serif;font-size:20px}.discount{color:var(--p);font-size:20px;font-weight:800}
  p{margin:0;color:var(--muted);font-size:13px;line-height:1.45}
  small{color:var(--muted);font-size:11px}
  button{justify-self:start;min-height:36px;padding:0 14px;border:0;border-radius: 10px;background:var(--p);color:#fff;font-size:12px;font-weight:700}
`;

export const SectionLabel = styled.h2`
  margin:0;color:var(--muted);font-family:'Gabarito','Inter',sans-serif;font-size:14px;text-transform:uppercase;
`;

export const SettingsCard = styled.section`
  padding:8px;border:1px solid var(--line);border-radius:16px;background:var(--surface);color:var(--text);box-shadow:0 4px 14px rgba(25,22,18,.03);
  .row{min-height:52px;padding:16px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line)}
  .row:last-child{border-bottom:0}.row span{font-size:15px;font-weight:650}.row.danger{color:#df2c2c}
  button.link,a.link{border:0;background:transparent;color:inherit;display:flex;align-items:center;gap:8px;text-decoration:none}
  .security-row{align-items:center}
  .security-copy{min-width:0;display:flex;align-items:flex-start;gap:12px}
  .security-copy>span{display:grid;gap:3px}
  .security-copy b{font-size:15px}
  .security-copy small{color:var(--muted);font-size:12px;font-weight:500;line-height:1.4}
  .security-icon{width:34px;height:34px;flex:0 0 34px;border-radius:10px;background:color-mix(in srgb,var(--p) 10%,var(--surface));color:var(--p);display:grid;place-items:center}
  .mfa-confirm{margin:0 8px 8px;padding:16px;border:1px solid var(--line);border-radius:12px;background:color-mix(in srgb,var(--surface) 92%,var(--bg));display:grid;gap:14px}
  .mfa-copy{display:grid;gap:4px}.mfa-copy b{font-size:14px}.mfa-copy span{color:var(--muted);font-size:12px;line-height:1.45}
  .mfa-confirm label{display:grid;gap:6px;font-size:12px;font-weight:700}
  .mfa-confirm input{width:100%;min-height:44px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--text);outline:none}
  .mfa-confirm input:focus{border-color:var(--p);box-shadow:0 0 0 3px color-mix(in srgb,var(--p) 10%,transparent)}
  .mfa-confirm input[aria-invalid='true']{border-color:#df2c2c}
  .mfa-error{padding:10px 12px;border-radius:9px;background:#fff1f0;color:#b42318;font-size:12px;line-height:1.4}
  .mfa-actions{display:flex;justify-content:flex-end;gap:8px}
  .mfa-actions button{min-height:38px;padding:0 13px;border-radius:9px;font-weight:700}
  .mfa-actions .secondary{border:1px solid var(--line);background:var(--surface);color:var(--text)}
  .mfa-actions .primary{border:0;background:var(--p);color:#fff}
  @media(max-width:600px){
    .security-row{align-items:flex-start}
    .security-copy{max-width:calc(100% - 56px)}
    .mfa-actions{display:grid;grid-template-columns:1fr 1fr}
  }
`;

export const Toggle = styled.button<{ $on: boolean }>`
  width:44px;height:24px;padding:2px;border:0;border-radius:12px;background:${({$on})=>$on?'var(--p)':'#d9d6d0'};display:flex;justify-content:${({$on})=>$on?'flex-end':'flex-start'};cursor:pointer;transition:background 160ms ease;
  &::after{content:'';width:20px;height:20px;border-radius:10px;background:var(--surface);box-shadow:0 1px 3px rgba(0,0,0,.18);transition:transform 160ms ease}
  &:disabled{opacity:.55;cursor:wait}
`;

export const HelpGrid = styled.div`
  display:grid;grid-template-columns:1fr 1fr;gap:16px;
  a,button{min-height:120px;padding:20px;border:1px solid var(--line);border-radius:16px;background:var(--surface);color:var(--text);text-decoration:none;text-align:left;display:grid;align-content:start;gap:8px}
  svg{color:var(--p)}b{font-size:16px}span{color:var(--muted);font-size:12px}
  @media(max-width:600px){grid-template-columns:1fr;a,button{min-height:96px}}
`;

export const Faq = styled.div`
  display:grid;gap:10px;
  details{padding:16px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
  summary{font-weight:650;cursor:pointer}
  p{margin:10px 0 0;color:var(--muted);font-size:13px;line-height:1.5}
`;

export const Empty = styled.div`
  padding:34px;border:1px dashed var(--line);border-radius:16px;background:var(--surface);color:var(--muted);text-align:center;font-size:13px;
`;

export const Footer = styled.footer`
  padding:64px 120px;background:#1f1e1a;color:#fff;
  .inner{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:40px}.brand{font-family:'Gabarito','Inter',sans-serif;font-size:20px;font-weight:800}
  h3{font-size:14px}p,a,button{color:#72706b;font-size:13px;line-height:1.6;text-decoration:none}
  button{padding:0;border:0;background:transparent;text-align:left}
  .bottom{margin-top:48px;padding-top:20px;border-top:1px solid #343330;color:#72706b;font-size:12px;display:flex;justify-content:space-between}
  @media(max-width:900px){display:none}
`;

export const MobileHomeIndicator = styled.div`
  display:none;
  @media(max-width:900px){display:flex;justify-content:center;padding:12px 0 0;&::after{content:'';width:120px;height:5px;border-radius: 10px;background:#d1cece}}
`;


export const SavedPaymentDetails = styled.section`
  width:600px;
  max-width:100%;
  margin:0 auto;
  display:grid;
  gap:18px;

  .details-grid{
    padding:24px;
    border:1px solid var(--line);
    border-radius:18px;
    background:var(--surface);
    display:grid;
    grid-template-columns:320px minmax(0,1fr);
    gap:24px;
    box-shadow:0 14px 38px rgba(37,30,24,.06);
  }

  .visual-side{
    min-width:0;
  }

  .protected{
    margin:12px 8px 0;
    display:flex;
    align-items:center;
    gap:8px;
    color:#2d914d;
    font-size:11px;
  }

  .protected svg{
    width:14px;
    height:14px;
    flex:0 0 14px;
  }

  .info-side{
    min-width:0;
  }

  .primary-badge{
    min-height:48px;
    margin-bottom:6px;
    padding:8px 12px;
    border-radius:10px;
    background:#ecf8ef;
    color:#2d914d;
    display:flex;
    align-items:center;
    gap:8px;
    font-size:12px;
    font-weight:750;
  }

  .primary-badge svg{
    width:18px;
    height:18px;
    flex:0 0 18px;
  }

  dl{
    margin:0;
    display:grid;
  }

  dl>div{
    min-height:48px;
    border-bottom:1px solid var(--line);
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:16px;
  }

  dl>div:last-child{
    border-bottom:0;
  }

  dt{
    color:var(--muted);
    font-size:12px;
  }

  dd{
    margin:0;
    color:var(--text);
    font-size:12px;
    font-weight:800;
    text-align:right;
  }

  .detail-actions{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:18px;
  }

  .detail-actions button{
    min-height:46px;
    border-radius:10px;
    font-weight:800;
    transition:transform 180ms ease,box-shadow 180ms ease,background-color 180ms ease;
  }

  .detail-actions button:not(:disabled):hover{
    transform:translateY(-1px);
  }

  .detail-actions button:not(:disabled):active{
    transform:translateY(0) scale(.99);
  }

  .detail-actions .remove{
    border:0;
    background:#fff1f1;
    color:#e03232;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:8px;
  }

  .detail-actions .remove svg{
    width:16px;
    height:16px;
  }

  .detail-actions .primary{
    border:1px solid var(--p);
    background:transparent;
    color:var(--p);
  }

  .detail-actions .primary:disabled{
    opacity:.55;
    cursor:default;
  }

  @media(max-width:900px){
    width:100%;
    gap:16px;

    .details-grid{
      padding:0;
      border:0;
      border-radius:0;
      background:transparent;
      box-shadow:none;
      grid-template-columns:1fr;
      gap:18px;
    }

    .visual-side{
      display:grid;
      gap:12px;
    }

    .protected{
      display:none;
    }

    .primary-badge{
      margin:0;
      min-height:48px;
      font-size:13px;
    }

    dl>div{
      min-height:44px;
    }

    dt,dd{
      font-size:13px;
    }

    .detail-actions{
      grid-template-columns:1fr;
      gap:12px;
    }

    .detail-actions .primary{
      order:-1;
      min-height:48px;
    }

    .detail-actions .remove{
      min-height:48px;
    }
  }
`;


export const SavedPaymentsList = styled.section`
  width:600px;
  max-width:100%;
  margin:0 auto;
  display:grid;
  gap:18px;

  .saved-card-list{
    padding:12px 24px;
    border:1px solid var(--line);
    border-radius:18px;
    background:var(--surface);
    box-shadow:0 14px 38px rgba(37,30,24,.06);
  }

  .saved-card-row{
    width:100%;
    min-height:76px;
    padding:0;
    border:0;
    border-bottom:1px solid var(--line);
    background:transparent;
    color:var(--text);
    display:grid;
    grid-template-columns:48px minmax(0,1fr) 24px;
    align-items:center;
    gap:14px;
    text-align:left;
    transition:background-color 160ms ease,transform 160ms ease;
  }

  .saved-card-row:last-child{
    border-bottom:0;
  }

  .saved-card-row:hover{
    background:color-mix(in srgb,var(--surface) 72%,var(--line));
  }

  .saved-card-row:active{
    transform:scale(.995);
  }

  .brand-box{
    width:40px;
    height:28px;
    border-radius:6px;
    background:#262421;
    display:grid;
    place-items:center;
    overflow:hidden;
  }

  .brand-box img{
    width:34px;
    max-height:20px;
    object-fit:contain;
  }

  .saved-card-copy{
    min-width:0;
    display:grid;
    gap:5px;
  }

  .brand-line{
    display:flex;
    align-items:center;
    gap:8px;
  }

  .brand-line strong{
    font-size:14px;
    line-height:1.1;
  }

  .brand-line em{
    padding:3px 7px;
    border-radius:8px;
    background:#eaf8ed;
    color:#2e914e;
    font-size:10px;
    font-style:normal;
    font-weight:800;
  }

  .masked-number{
    color:var(--muted);
    font-size:12px;
    letter-spacing:.03em;
  }

  .row-chevron{
    width:17px;
    height:17px;
    color:var(--muted);
  }

  .saved-card-actions{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:18px;
  }

  .saved-card-actions p{
    margin:0;
    color:var(--muted);
    font-size:12px;
  }

  .add-saved-card{
    min-height:44px;
    padding:0 18px;
    border:1px solid var(--p);
    border-radius:10px;
    background:transparent;
    color:var(--p);
    display:inline-flex;
    align-items:center;
    justify-content:center;
    gap:8px;
    font-weight:750;
    transition:transform 160ms ease,background-color 160ms ease,box-shadow 160ms ease;
  }

  .add-saved-card svg{
    width:16px;
    height:16px;
  }

  .add-saved-card:hover{
    background:color-mix(in srgb,var(--p) 7%,transparent);
    box-shadow:0 7px 16px color-mix(in srgb,var(--p) 14%,transparent);
    transform:translateY(-1px);
  }

  .add-saved-card:active{
    transform:translateY(0) scale(.99);
  }

  @media(max-width:900px){
    width:100%;
    gap:16px;

    .saved-card-list{
      padding:6px 12px;
      border-radius:16px;
    }

    .saved-card-row{
      min-height:70px;
      grid-template-columns:40px minmax(0,1fr) 20px;
      gap:12px;
    }

    .brand-box{
      width:34px;
      height:24px;
      border-radius:5px;
    }

    .brand-box img{
      width:28px;
      max-height:17px;
    }

    .brand-line strong{
      font-size:13px;
    }

    .masked-number{
      font-size:11px;
    }

    .saved-card-actions{
      display:grid;
      grid-template-columns:1fr;
      gap:0;
    }

    .saved-card-actions p{
      display:none;
    }

    .add-saved-card{
      width:100%;
      min-height:46px;
    }
  }

  @media(prefers-reduced-motion:reduce){
    .saved-card-row,
    .add-saved-card{
      transition:none;
    }
  }
`;
