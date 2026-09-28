import styled from 'styled-components';

export const Root = styled.div<{ $primary: string }>`
  --p: ${({ $primary }) => $primary || '#e85a2b'};
  --bg: #fdfcf9;
  --surface: #fff;
  --text: #1f1e1a;
  --muted: #72706b;
  --line: #efece6;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', system-ui, sans-serif;

  *, *::before, *::after { box-sizing: border-box; }
  button, input { font: inherit; }
  button { cursor: pointer; }
`;

export const Header = styled.header`
  height:80px;padding:0 120px;border-bottom:1px solid var(--line);background:#fff;
  display:grid;grid-template-columns:minmax(260px,1fr) 380px minmax(260px,1fr);align-items:center;gap:28px;
  .brand{display:flex;align-items:center;gap:12px;min-width:0}
  .logo{width:40px;height:40px;border-radius:12px;overflow:hidden;background:var(--p);color:#fff;display:grid;place-items:center;font-family:'Gabarito','Inter',sans-serif;font-size:20px;font-weight:800}
  .logo img{width:100%;height:100%;object-fit:cover}
  .brand-copy{display:grid;gap:2px;min-width:0}.brand-copy b{font-family:'Gabarito','Inter',sans-serif;font-size:18px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .status{color:var(--muted);font-size:13px;display:flex;align-items:center;gap:6px}.status i{width:8px;height:8px;border-radius:50%;background:#32b667}
  .search{height:40px;padding:0 16px;border:1px solid var(--line);border-radius:999px;background:#fafaf8;color:var(--muted);display:flex;align-items:center;gap:12px}
  .actions{justify-self:end;display:flex;align-items:center;gap:24px}
  .account{border:0;background:transparent;color:var(--text);display:flex;align-items:center;gap:8px;font-weight:650}
  .cart{min-height:40px;padding:0 16px;border:0;border-radius:999px;background:var(--p);color:#fff;display:flex;align-items:center;gap:10px;font-weight:700}
  .cart i{padding:2px 6px;border-radius:8px;background:#1f1e1a;font-size:11px;font-style:normal}

  @media(max-width:900px){display:none}
`;

export const Mobile = styled.main`
  display:none;
  @media(max-width:900px){display:block;padding:20px 20px 28px}
`;

export const Desktop = styled.main`
  display:block;
  padding:64px 120px 80px;
  @media(max-width:900px){display:none}
`;

export const Center = styled.div<{ $wide?: boolean }>`
  width:${({$wide})=>$wide?'800px':'720px'};max-width:100%;margin:0 auto;display:grid;gap:32px;
`;

export const PageTitle = styled.div`
  display:flex;align-items:center;gap:16px;
  h1{margin:0;font-family:'Gabarito','Inter',sans-serif;font-size:32px;line-height:1;font-weight:800}
  .back{width:40px;height:40px;border:0;border-radius:20px;background:#f7f5f0;color:var(--text);display:grid;place-items:center}
  @media(max-width:900px){
    gap:12px;margin-bottom:24px;
    h1{font-size:24px}
    .back{width:36px;height:36px}
  }
`;

export const ProfileCard = styled.section`
  padding:16px;border:1px solid var(--line);border-radius:20px;background:#fff;display:flex;align-items:center;gap:16px;
  .avatar{width:64px;height:64px;border-radius:32px;overflow:hidden;background:color-mix(in srgb,var(--p) 12%,#fff);color:var(--p);display:grid;place-items:center;font-family:'Gabarito','Inter',sans-serif;font-size:22px;font-weight:800}
  .avatar img{width:100%;height:100%;object-fit:cover}
  .copy{min-width:0;display:grid;gap:4px}.copy b{font-family:'Gabarito','Inter',sans-serif;font-size:18px}.copy span{color:var(--muted);font-size:13px}
  @media(min-width:901px){padding:20px}
`;

export const MenuCard = styled.section`
  padding:8px;border:1px solid var(--line);border-radius:20px;background:#fff;
  button{width:100%;min-height:52px;padding:16px;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--text);display:flex;align-items:center;gap:12px;text-align:left}
  button:last-child{border-bottom:0}
  button svg:first-child{width:20px;height:20px}
  button span{font-size:15px;font-weight:650}
  button .chev{margin-left:auto;color:#9b9892}
  .badge{margin-left:auto;padding:4px 8px;border-radius:8px;background:#fdf2ec;color:var(--p);font-size:11px;font-weight:800}
  .badge + .chev{margin-left:0}
`;

export const Logout = styled.button`
  width:100%;padding:16px;border:0;background:transparent;color:#df2c2c;font-size:15px;font-weight:700;
`;

export const Stack = styled.div`display:grid;gap:16px;`;

export const Tabs = styled.div`
  display:flex;gap:8px;padding-bottom:4px;border-bottom:1px solid var(--line);
  button{min-height:40px;padding:0 14px;border:0;border-radius:999px;background:transparent;color:var(--muted);font-weight:650}
  button.active{background:#fdf2ec;color:var(--p)}
`;

export const OrderCard = styled.article`
  padding:18px;border:1px solid var(--line);border-radius:16px;background:#fff;display:grid;gap:12px;
  .top,.bottom{display:flex;align-items:center;justify-content:space-between;gap:14px}
  .meta{display:grid;gap:3px}.meta b{font-size:14px}.meta span{color:var(--muted);font-size:12px}
  .status{padding:5px 9px;border-radius:8px;background:#fdf2ec;color:var(--p);font-size:11px;font-weight:800}
  p{margin:0;color:var(--muted);font-size:13px;line-height:1.45}
  strong{font-size:16px}
  button{min-height:34px;padding:0 12px;border:1px solid var(--p);border-radius:9px;background:#fff;color:var(--p);font-size:12px;font-weight:700}
`;

export const ItemCard = styled.article`
  min-height:84px;padding:16px 20px;border:1px solid var(--line);border-radius:16px;background:#fff;display:flex;align-items:center;gap:16px;
  .icon{width:44px;height:44px;flex:0 0 44px;border-radius:12px;background:#fdf2ec;color:var(--p);display:grid;place-items:center}
  .copy{min-width:0;display:grid;gap:4px;flex:1}.copy b{font-size:15px}.copy span{color:var(--muted);font-size:13px;line-height:1.35}
  .default{color:var(--p);font-size:11px;font-weight:800}
  .actions{display:flex;gap:8px}
  .actions button{min-height:34px;padding:0 10px;border:0;border-radius:9px;background:#f7f5f0;color:var(--text);font-size:11px;font-weight:700}
  @media(max-width:900px){padding:14px;align-items:flex-start;.actions{margin-left:auto}}
`;

export const AddButton = styled.button`
  width:100%;min-height:48px;border:1px dashed color-mix(in srgb,var(--p) 55%,var(--line));border-radius:14px;background:#fff;color:var(--p);font-weight:700;
`;

export const Coupon = styled.article<{ $muted?: boolean }>`
  padding:20px;border:1px solid var(--line);border-radius:18px;background:#fff;display:grid;gap:12px;opacity:${({$muted})=>$muted?.65:1};
  .top{display:flex;align-items:center;justify-content:space-between;gap:12px}
  code{padding:6px 9px;border-radius:8px;background:#f7f5f0;color:var(--text);font-weight:800}
  .state{padding:5px 9px;border-radius:8px;background:#fdf2ec;color:var(--p);font-size:11px;font-weight:800}
  h3{margin:0;font-family:'Gabarito','Inter',sans-serif;font-size:20px}.discount{color:var(--p);font-size:20px;font-weight:800}
  p{margin:0;color:var(--muted);font-size:13px;line-height:1.45}
  small{color:var(--muted);font-size:11px}
  button{justify-self:start;min-height:36px;padding:0 14px;border:0;border-radius:999px;background:var(--p);color:#fff;font-size:12px;font-weight:700}
`;

export const SectionLabel = styled.h2`
  margin:0;color:var(--muted);font-family:'Gabarito','Inter',sans-serif;font-size:14px;text-transform:uppercase;
`;

export const SettingsCard = styled.section`
  padding:8px;border:1px solid var(--line);border-radius:16px;background:#fff;
  .row{min-height:52px;padding:16px;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid var(--line)}
  .row:last-child{border-bottom:0}.row span{font-size:15px;font-weight:650}.row.danger{color:#df2c2c}
  button.link{border:0;background:transparent;color:inherit;display:flex;align-items:center;gap:8px}
`;

export const Toggle = styled.button<{ $on: boolean }>`
  width:44px;height:24px;padding:2px;border:0;border-radius:12px;background:${({$on})=>$on?'var(--p)':'#d9d6d0'};display:flex;justify-content:${({$on})=>$on?'flex-end':'flex-start'};
  &::after{content:'';width:20px;height:20px;border-radius:10px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.18)}
`;

export const HelpGrid = styled.div`
  display:grid;grid-template-columns:1fr 1fr;gap:16px;
  a,button{min-height:120px;padding:20px;border:1px solid var(--line);border-radius:16px;background:#fff;color:var(--text);text-decoration:none;text-align:left;display:grid;align-content:start;gap:8px}
  svg{color:var(--p)}b{font-size:16px}span{color:var(--muted);font-size:12px}
  @media(max-width:600px){grid-template-columns:1fr;a,button{min-height:96px}}
`;

export const Faq = styled.div`
  display:grid;gap:10px;
  details{padding:16px;border:1px solid var(--line);border-radius:14px;background:#fff}
  summary{font-weight:650;cursor:pointer}
  p{margin:10px 0 0;color:var(--muted);font-size:13px;line-height:1.5}
`;

export const Empty = styled.div`
  padding:34px;border:1px dashed var(--line);border-radius:16px;background:#fff;color:var(--muted);text-align:center;font-size:13px;
`;

export const Footer = styled.footer`
  padding:64px 120px;background:#1f1e1a;color:#fff;
  .inner{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:40px}.brand{font-family:'Gabarito','Inter',sans-serif;font-size:20px;font-weight:800}
  h3{font-size:14px}p,a{color:#72706b;font-size:13px;line-height:1.6;text-decoration:none}
  .bottom{margin-top:48px;padding-top:20px;border-top:1px solid #343330;color:#72706b;font-size:12px;display:flex;justify-content:space-between}
  @media(max-width:900px){display:none}
`;

export const MobileHomeIndicator = styled.div`
  display:none;
  @media(max-width:900px){display:flex;justify-content:center;padding:12px 0 0;&::after{content:'';width:120px;height:5px;border-radius:999px;background:#d1cece}}
`;
