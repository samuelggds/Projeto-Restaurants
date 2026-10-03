import styled from 'styled-components';

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
    animation:profile-quick-backdrop-in 180ms ease-out both;
  }

  &.closing{
    pointer-events:none;
    animation:profile-quick-backdrop-out 190ms ease-in both;
  }

  @keyframes profile-quick-backdrop-in{
    from{opacity:0}
    to{opacity:1}
  }

  @keyframes profile-quick-backdrop-out{
    from{opacity:1}
    to{opacity:0}
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
    animation:profile-quick-sheet-in 260ms cubic-bezier(.22,1,.36,1) both;
    scrollbar-width:none;
    will-change:transform,opacity;
  }

  &.closing{
    pointer-events:none;
    animation:profile-quick-sheet-out 190ms cubic-bezier(.4,0,1,1) both;
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
    transition:
      background-color 150ms ease,
      transform 150ms cubic-bezier(.22,1,.36,1);
  }

  .quick-profile-links button:active{
    background:#fff5f5;
    transform:scale(.994);
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
    0%{
      transform:translate3d(0,-24px,0) scale(.992);
      opacity:.45;
    }
    60%{
      opacity:1;
    }
    100%{
      transform:translate3d(0,0,0) scale(1);
      opacity:1;
    }
  }

  @keyframes profile-quick-sheet-out{
    0%{
      transform:translate3d(0,0,0) scale(1);
      opacity:1;
    }
    100%{
      transform:translate3d(0,-18px,0) scale(.995);
      opacity:0;
    }
  }

  @media(prefers-reduced-motion:reduce){
    animation:none;
    .quick-profile-links button{transition:none}
    .quick-profile-links button:active{transform:none}
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
