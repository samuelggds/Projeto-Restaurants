import styled from 'styled-components';

export const Page=styled.div`
  min-height:100vh;background:#fdfcf9;color:#24221f;font-family:Inter,system-ui,sans-serif;
`;
export const Header=styled.header`
  height:72px;padding:0 max(24px,calc((100vw - 1120px)/2));display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:20px;border-bottom:1px solid #eeeae4;background:#fff;
  >button,nav button{border:0;background:transparent;color:#282622;font-weight:650}
  >button{justify-self:start;display:flex;align-items:center;gap:8px} >button svg{width:16px}
  nav{justify-self:end;display:flex;gap:22px} nav button{display:flex;align-items:center;gap:6px;font-size:13px} nav svg{width:14px}
  @media(max-width:700px){height:58px;padding:0 16px;grid-template-columns:auto 1fr;>button span,nav{display:none}}
`;
export const Brand=styled.div`display:flex;align-items:center;gap:9px;span{display:grid;gap:2px}strong{font-size:13px}small{color:#3f9a59;font-size:10px}`;
export const BrandLogo=styled.span`width:32px;height:32px;border-radius:9px;overflow:hidden;display:grid!important;place-items:center;background:#e85a2b;color:#fff;font-weight:900;img{width:100%;height:100%;object-fit:cover}`;
export const Main=styled.main`width:min(1120px,calc(100% - 32px));margin:38px auto 0;@media(max-width:700px){width:100%;margin:0;padding:14px}`;
export const SuccessCard=styled.section`
  min-height:196px;padding:34px 40px;border:1px solid #d8eee0;border-radius:22px;background:#f2fbf5;display:flex;align-items:center;justify-content:space-between;gap:30px;
  h1{margin:10px 0 10px;font-size:30px}p{max-width:600px;margin:0;color:#77716a;font-size:13px;line-height:1.55}
  @media(max-width:700px){min-height:0;padding:28px 22px;text-align:center;justify-content:center;h1{font-size:25px}.success-icon{display:none}}
`;
export const SuccessPill=styled.span`width:max-content;padding:6px 10px;border-radius:999px;background:#dff5e6;color:#268447;display:flex;align-items:center;gap:5px;font-size:9px;font-weight:850;text-transform:uppercase;svg{width:12px}`;
export const Meta=styled.div`margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;span{padding:6px 9px;border-radius:7px;background:#fff;color:#55514d;font-size:9px;font-weight:700;display:flex;align-items:center;gap:5px}svg{width:11px}`;
export const SuccessIcon=styled.div`width:118px;height:118px;flex:0 0 auto;border-radius:50%;display:grid;place-items:center;background:#d8f2e1;color:#2d9b55;svg{width:62px;height:62px}@media(max-width:700px){display:none}`;
export const ContentGrid=styled.div`margin-top:24px;display:grid;grid-template-columns:minmax(0,1.45fr) minmax(300px,.9fr);gap:22px;align-items:start;@media(max-width:850px){grid-template-columns:1fr}`;
export const OrderCard=styled.section`padding:24px;border:1px solid #ece8e2;border-radius:16px;background:#fff;box-shadow:0 8px 22px rgba(40,35,29,.04)`;
export const SectionTitle=styled.header`display:flex;align-items:flex-start;justify-content:space-between;span{display:grid;gap:3px}strong{font-size:15px}small{color:#88817a;font-size:10px}svg{width:20px;color:#ef6a38}`;
export const ItemList=styled.ul`margin:18px 0 12px;padding:0;display:grid;gap:10px;list-style:none;li{display:flex;justify-content:space-between;gap:20px;font-size:11px;color:#625d57}strong{color:#292622}.discount strong{color:#2e9252}`;
export const Total=styled.div`padding-top:14px;border-top:1px solid #efebe5;display:flex;justify-content:space-between;font-size:13px;font-weight:850`;
export const Payment=styled.p`margin:14px 0 0;color:#7b756f;font-size:10px`;
export const Side=styled.aside`display:grid;gap:14px`;
export const CourierCard=styled.section`padding:14px 16px;border:1px solid #ece8e2;border-radius:15px;background:#fff;display:flex;align-items:center;gap:10px;span{display:grid;gap:2px}strong{font-size:11px}small{color:#2b8d4f;font-size:9px}`;
export const CourierAvatar=styled.span`width:40px;height:40px!important;flex:0 0 auto;border-radius:50%;overflow:hidden;display:grid!important;place-items:center!important;background:#273445!important;color:#fff;font-size:10px;font-weight:900;img{width:100%;height:100%;object-fit:cover}`;
export const Done=styled.em`margin-left:auto;padding:5px 8px;border-radius:999px;background:#edf8f0;color:#2b8d4f;display:flex;align-items:center;gap:4px;font-size:8px;font-style:normal;font-weight:800;svg{width:10px}`;
export const RatingCard=styled.section`padding:24px;border:1px solid #ece8e2;border-radius:16px;background:#fff;text-align:center;h2{margin:0;font-size:17px}p{margin:6px 0 15px;color:#89827b;font-size:10px}`;
export const Stars=styled.div`display:flex;justify-content:center;gap:8px;margin-bottom:14px;button{width:38px;height:38px;border:1px solid #f2dfce;border-radius:9px;background:#fff9f4;color:#f4a024;display:grid;place-items:center}button:disabled{opacity:.65}svg{width:21px}`;
export const RatingMessage=styled.p`color:#2c8d50!important;font-weight:750`;
export const Primary=styled.button`width:100%;min-height:45px;border:0;border-radius:10px;background:#ef5b2a;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;svg{width:15px}&:disabled{opacity:.55}`;
export const Secondary=styled.button`width:100%;min-height:42px;margin-top:8px;border:1px solid #ebe7e1;border-radius:10px;background:#fff;color:#2d2a27;font-weight:750`;
export const Help=styled.button`margin:28px auto 20px;border:0;background:transparent;color:#77716b;text-decoration:underline;font-size:9px;display:flex;align-items:center;gap:5px;svg{width:12px}`;
export const State=styled.main`min-height:70vh;display:grid;place-items:center;padding:30px;color:#5f5953`;
