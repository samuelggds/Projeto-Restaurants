import styled from 'styled-components';

export const GuestOrdersFrame = styled.main<{ $primary: string }>`
  --guest-primary: ${({ $primary }) => $primary};
  min-height: 100vh;
  background: #fdfcf9;
  color: #1f1e1a;
  font-family: Inter, system-ui, sans-serif;
`;

export const MobileHeader = styled.header`
  display:none;
  @media(max-width:760px){
    height:64px;padding:0 20px;border-bottom:1px solid #efece6;background:#fff;
    display:flex;align-items:center;justify-content:space-between;gap:12px;
    button{border:0;background:transparent;color:inherit;cursor:pointer}
    .brand{min-width:0;display:flex;align-items:center;gap:10px;text-align:left}
    .logo{width:34px;height:34px;flex:0 0 34px;border-radius:10px;overflow:hidden;display:grid;place-items:center;background:var(--guest-primary);color:#fff;font-weight:800}
    .logo img{width:100%;height:100%;object-fit:cover}
    .brand>span:last-child{min-width:0;display:grid;gap:1px}
    b{overflow:hidden;font-family:Gabarito,Inter,sans-serif;font-size:15px;text-overflow:ellipsis;white-space:nowrap}
    small{font-size:10px;color:#72706b}
    .search{width:38px;height:38px;flex:0 0 38px;border-radius:50%;background:#fafaf8;display:grid;place-items:center}
    .search svg{width:18px;height:18px}
  }
`;

export const Main = styled.section`
  width:min(1220px,calc(100% - 40px));margin:0 auto;padding:56px 0 80px;
  @media(max-width:760px){width:100%;padding:20px 20px 96px}
`;

export const TitleBlock = styled.div`
  display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:28px;
  h1{margin:0 0 4px;font-family:Gabarito,Inter,sans-serif;font-size:30px}
  p{margin:0;color:#72706b;font-size:14px}
  .mobile-title{display:none}
  @media(max-width:760px){
    display:grid;align-items:stretch;margin-bottom:14px;
    .desktop-title{display:none}.mobile-title{display:block;font-size:26px}
    p{font-size:13px}
  }
`;

export const SearchBox = styled.label`
  width:min(410px,100%);height:44px;padding:0 14px;border:1px solid var(--guest-primary);
  border-radius:999px;background:#fff;display:flex;align-items:center;gap:10px;
  svg{width:17px;color:var(--guest-primary)}
  input{width:100%;border:0;outline:0;background:transparent;font:inherit;font-size:13px}
  input::placeholder{color:#89857f}
  @media(max-width:760px){width:100%;border-radius:12px}
`;

export const OrderStack = styled.div`display:grid;gap:20px;@media(max-width:760px){gap:14px}`;

export const OrderCard = styled.article`
  padding:24px;border:1px solid #efece6;border-radius:16px;background:#fff;display:grid;gap:16px;
  .order-head,.order-body{display:flex;align-items:center;justify-content:space-between;gap:16px;min-width:0}
  .restaurant-info{display:flex;align-items:center;gap:12px;min-width:0}
  .restaurant-info>span:last-child{display:grid;gap:3px;min-width:0}
  .restaurant-info b{font-family:Gabarito,Inter,sans-serif;font-size:18px}
  .restaurant-info small{color:#72706b;font-size:13px;white-space:nowrap}
  .thumb{width:48px;height:48px;flex:0 0 48px;border-radius:10px;overflow:hidden;display:grid;place-items:center;background:#f7f5f0;color:var(--guest-primary);font-weight:800}
  .thumb img{width:100%;height:100%;object-fit:cover}
  .status{padding:6px 14px;border-radius:8px;font-size:12px;font-weight:800;white-space:nowrap}
  .status.preparing{background:#fdf2ec;color:var(--guest-primary)}
  .status.on-the-way{background:#ecf2fd;color:#2b6be8}
  .status.delivered{background:#eaf7ee;color:#268c43}
  .status.cancelled{background:#fff0ee;color:#c54436}
  .divider{height:1px;background:#efece6}
  .order-body p{margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#72706b;font-size:15px}
  .order-body strong{font-size:16px;white-space:nowrap}
  .progress{display:grid;gap:9px}
  .line{display:flex;align-items:center;padding:0 12px}
  .segment{display:flex;align-items:center;flex:1;min-width:0}
  .segment:last-child{flex:0 0 12px}
  .segment i{width:12px;height:12px;flex:0 0 12px;border-radius:50%;background:#d8d5d0}
  .segment em{height:2px;flex:1;background:#efece6}
  .segment i.done,.segment em.done{background:var(--guest-primary)}
  .labels{display:grid;grid-template-columns:repeat(4,1fr);font-size:9px;text-align:center;color:#72706b}
  .labels .current{color:var(--guest-primary);font-weight:800}
  .track{min-height:38px;padding:9px 12px;border:1px solid var(--guest-primary);border-radius:999px;background:#fff;color:var(--guest-primary);display:flex;align-items:center;gap:8px;font-weight:700}
  .track svg,.help svg{width:14px;height:14px}
  .help{justify-self:start;padding:0;border:0;background:transparent;color:var(--guest-primary);display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700}
  @media(max-width:760px){
    padding:16px;gap:12px;
    .restaurant-info{gap:8px}.thumb{width:32px;height:32px;flex-basis:32px;border-radius:8px}
    .restaurant-info b{font-size:15px}.restaurant-info small{font-size:11px}
    .status{padding:4px 8px;font-size:10px}
    .order-body p{font-size:12px}.order-body strong{font-size:14px}
  }
`;

export const Empty = styled.div`
  min-height:220px;padding:32px;border:1px dashed #ddd7cf;border-radius:16px;background:#fff;
  display:grid;place-items:center;align-content:center;gap:8px;text-align:center;color:#72706b;
  svg{width:28px;height:28px;color:var(--guest-primary)}strong{color:#1f1e1a}
`;
