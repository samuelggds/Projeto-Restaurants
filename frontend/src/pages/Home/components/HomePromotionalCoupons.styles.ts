import styled from 'styled-components';
export const Section = styled.section`
  margin: 18px 0; border-radius: 16px; background: #fff9f8; padding: 18px;
  > header, .coupon-dialog > header { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; }
  > header > span { display:flex; align-items:center; gap:8px; color:#312a29; font-size:16px; }
  > header svg { color:#ff4b4b; width:20px; height:20px; }
  button { cursor:pointer; }
  > header button { border:none; background:transparent; color:#e23a3a; font-weight:750; }
  .coupon-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr)); gap:12px; }
  .coupon-card { display:flex; gap:12px; padding:16px; border:1px solid #ffe1de; border-radius:13px; background:white; }
  .coupon-symbol { width:36px; height:36px; border-radius:10px; display:grid; place-items:center; background:#fff1ee; color:#ff4b4b; flex-shrink:0; }
  .coupon-content { display:grid; gap:5px; flex:1; min-width:0; }
  .coupon-content b { color:#302b2b; font-size:13px; }
  .coupon-content strong { color:#e94343; font-size:22px; }
  .coupon-content p, .coupon-content small { margin:0; color:#736a68; font-size:11px; }
  .coupon-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
  .coupon-actions button { border-radius:7px; padding:8px 10px; font-size:11px; font-weight:800; }
  .coupon-copy { display:flex; align-items:center; gap:5px; border:1px dashed #e9bcb6; background:#fff; color:#b4443d; }
  .coupon-copy svg { width:13px; height:13px; }
  .coupon-apply { border:none; background:#ff4b4b; color:#fff; }
  .coupon-backdrop { position:fixed; inset:0; z-index:1100; display:grid; place-items:center; background:#0008; padding:16px; }
  .coupon-dialog { width:min(650px,100%); max-height:85dvh; overflow:auto; border-radius:18px; padding:22px; background:white; box-shadow:0 16px 60px #0002; }
  .coupon-dialog > header button { border:none; background:transparent; }
  @media(max-width:650px) {
    padding:12px;
    .coupon-backdrop { place-items:end center; padding:0; }
    .coupon-dialog { border-radius:20px 20px 0 0; max-height:85dvh; width:100%; }
    .coupon-list { grid-template-columns:1fr; }
  }
`;
