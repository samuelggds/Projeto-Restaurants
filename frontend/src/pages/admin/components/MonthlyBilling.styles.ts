import styled from "styled-components";

export const Shell = styled.section`display:grid;gap:22px;`;
export const Summary = styled.div`
  border:1px solid var(--border);border-radius:18px;background:linear-gradient(135deg,#191c1f,#29241f);color:#fff;
  padding:24px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center;box-shadow:0 16px 36px rgba(38,28,20,.1);
  h2{margin:7px 0;font-size:25px} p{margin:0;color:#c9c5c0;line-height:1.55} small{color:#ff8b50;font-weight:800;letter-spacing:.08em}
  @media(max-width:620px){grid-template-columns:1fr}
`;
export const Status = styled.span<{ $active:boolean }>`
  justify-self:end;min-height:38px;padding:0 14px;border-radius:999px;display:inline-flex;align-items:center;gap:8px;
  background:${({$active})=>$active?"#eaf7eb":"#fff0ed"};color:${({$active})=>$active?"#26753a":"#a53f35"};font-size:12px;font-weight:800;white-space:nowrap;
  &::before{content:"";width:7px;height:7px;border-radius:50%;background:currentColor}@media(max-width:620px){justify-self:start}
`;
export const SectionTitle = styled.div`h2{margin:0 0 5px;font-size:20px}p{margin:0;color:var(--muted);font-size:13px}`;
export const Plans = styled.div`display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;@media(max-width:760px){grid-template-columns:1fr}`;
export const PlanCard = styled.article<{ $featured?:boolean;$current?:boolean }>`
  position:relative;min-height:365px;overflow:hidden;border:2px solid ${({$current})=>$current?"var(--a)":"var(--border)"};border-radius:20px;
  background:${({$featured})=>$featured?"linear-gradient(145deg,#fff7ef 0%,#fff 58%)":"#fff"};padding:24px;display:flex;flex-direction:column;gap:15px;
  box-shadow:${({$current,$featured})=>$current?"0 18px 42px rgba(116,66,31,.15)":$featured?"0 14px 34px rgba(77,47,25,.09)":"0 8px 24px rgba(43,31,22,.06)"};transition:transform 180ms ease,box-shadow 180ms ease,border-color 180ms ease;
  &::before{content:"";position:absolute;inset:0 auto 0 0;width:4px;background:${({$current,$featured})=>$current||$featured?"var(--a)":"transparent"}}
  &:hover{transform:translateY(-3px);box-shadow:0 20px 42px rgba(43,31,22,.13);border-color:color-mix(in srgb,var(--a) 52%,var(--border))}
  .description{margin:0;min-height:42px;color:var(--muted);font-size:13px;line-height:1.55}
  .price{display:flex;align-items:baseline;gap:7px;color:var(--a);font-size:30px;font-weight:900;letter-spacing:-.04em}.price small{color:var(--muted);font-size:12px;font-weight:650;letter-spacing:0}
`;
export const PlanHeading = styled.div`
  display:flex;align-items:center;gap:12px;padding-right:90px;
  >span{width:46px;height:46px;flex:0 0 46px;border-radius:13px;background:color-mix(in srgb,var(--a) 12%,#fff);color:var(--a);display:grid;place-items:center}
  small{color:var(--muted);font-size:9px;font-weight:850;letter-spacing:.12em}h3{margin:2px 0 0;font-size:21px}
`;
export const Benefits = styled.ul`
  margin:0;padding:16px 0 0;border-top:1px solid var(--border);display:grid;gap:10px;list-style:none;
  li{display:flex;align-items:flex-start;gap:9px;color:#514941;font-size:12px;line-height:1.45}svg{flex:0 0 auto;color:#2d8545;margin-top:1px}
`;
export const ChoosePlanButton = styled.button<{ $current:boolean }>`
  width:100%;min-height:48px;margin-top:auto;border:1px solid ${({$current})=>$current?"color-mix(in srgb,var(--a) 32%,#ddd)":"var(--a)"};border-radius:12px;
  background:${({$current})=>$current?"color-mix(in srgb,var(--a) 8%,#fff)":"var(--a)"};color:${({$current})=>$current?"var(--a)":"#fff"};font-size:13px;font-weight:850;cursor:pointer;
  transition:filter 160ms ease,transform 160ms ease,box-shadow 160ms ease;&:hover:not(:disabled){filter:brightness(.94);transform:translateY(-1px);box-shadow:0 9px 20px color-mix(in srgb,var(--a) 25%,transparent)}
  &:disabled{cursor:not-allowed;opacity:.82}
`;
export const CurrentTag = styled.span`position:absolute;z-index:1;top:18px;right:18px;border-radius:999px;background:color-mix(in srgb,var(--a) 12%,#fff);color:var(--a);padding:6px 10px;font-size:10px;font-weight:850;`;
export const RecommendedTag = styled(CurrentTag)`background:#211d1a;color:#fff;`;
export const Notice = styled.div`border:1px solid #ecd7c5;border-radius:13px;background:#fff9f3;color:#71543d;padding:13px 15px;font-size:12px;line-height:1.5;`;
export const ViewTabs = styled.div`
  width:fit-content;display:flex;gap:5px;padding:5px;border:1px solid var(--border);border-radius:13px;background:#f6f2ee;
  button{min-height:40px;border:0;border-radius:9px;background:transparent;color:var(--muted);padding:0 16px;display:inline-flex;align-items:center;gap:8px;font-weight:800;cursor:pointer;transition:background 160ms ease,color 160ms ease,box-shadow 160ms ease}
  button.active{background:#fff;color:var(--a);box-shadow:0 5px 14px rgba(43,31,22,.09)}
  button:hover:not(.active){color:#29231f;background:rgba(255,255,255,.55)}
  @media(max-width:520px){width:100%;button{flex:1;justify-content:center;padding:0 10px;font-size:12px}}
`;
export const Invoices = styled.div`border:1px solid var(--border);border-radius:16px;background:#fff;padding:8px 20px;`;
export const BillingCard = styled.article`
  position:relative;overflow:hidden;border:1px solid var(--border);border-radius:20px;background:linear-gradient(140deg,#fff 0%,#fffaf5 100%);padding:24px;box-shadow:0 14px 34px rgba(43,31,22,.07);display:grid;gap:22px;
  &::after{content:"";position:absolute;width:190px;height:190px;border-radius:50%;right:-85px;top:-105px;background:color-mix(in srgb,var(--a) 10%,transparent)}
`;
export const BillingCardHeader = styled.div`
  position:relative;z-index:1;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;
  .label{display:inline-flex;align-items:center;gap:8px;color:var(--a);font-size:10px;font-weight:900;letter-spacing:.09em;text-transform:uppercase}
  h2{margin:8px 0 4px;font-size:22px}p{margin:0;color:var(--muted);font-size:12px}
  .cycle{min-width:112px;border-radius:14px;background:#211d1a;color:#fff;padding:13px 15px;text-align:center}.cycle small{display:block;color:#cfc7c0;font-size:9px;font-weight:800;letter-spacing:.08em}.cycle strong{display:block;margin-top:3px;font-size:20px}
  @media(max-width:580px){flex-direction:column;.cycle{width:100%;text-align:left}}
`;
export const BillingDates = styled.div`
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;
  div{min-height:86px;border:1px solid var(--border);border-radius:13px;background:rgba(255,255,255,.86);padding:13px;display:flex;flex-direction:column;justify-content:space-between;gap:8px}
  span{color:var(--muted);font-size:10px;font-weight:750}strong{color:#2a2420;font-size:13px;line-height:1.35}
  .grace{border-color:#efceb1;background:#fff8f1}.grace strong{color:#9b541e}
  @media(max-width:850px){grid-template-columns:repeat(2,minmax(0,1fr))}@media(max-width:460px){grid-template-columns:1fr}
`;
export const BillingPayment = styled.div`
  border-top:1px solid var(--border);padding-top:18px;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px;
  h3{margin:0 0 5px;font-size:15px}p{margin:0;color:var(--muted);font-size:11px;line-height:1.45}
  button{min-height:45px;border:0;border-radius:11px;background:#191816;color:#fff;padding:0 18px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:850;cursor:pointer;transition:background 160ms ease,transform 160ms ease}
  button:hover:not(:disabled){background:var(--a);transform:translateY(-1px)}button:disabled{opacity:.55;cursor:not-allowed}
  @media(max-width:620px){grid-template-columns:1fr;button{width:100%}}
`;
export const InvoiceRow = styled.article`
  min-height:82px;border-bottom:1px solid var(--border);display:grid;grid-template-columns:minmax(150px,1fr) auto auto auto;gap:18px;align-items:center;
  &:last-child{border-bottom:0}h3{margin:0 0 5px;font-size:14px}p{margin:0;color:var(--muted);font-size:11px}strong{white-space:nowrap}
  button{min-height:38px;border:0;border-radius:10px;background:#191816;color:#fff;padding:0 14px;font-weight:750;cursor:pointer}button:hover{background:var(--a)}
  @media(max-width:680px){grid-template-columns:1fr auto;padding:14px 0;gap:10px}
`;
export const PaidMark = styled.span`display:inline-flex;align-items:center;justify-content:center;color:#28763d;`;
export const InvoiceUnavailable = styled.span`color:var(--muted);font-size:11px;font-weight:700;white-space:nowrap;`;
export const InvoiceStatus = styled.span<{ $status:string }>`
  border-radius:999px;padding:7px 10px;font-size:10px;font-weight:850;text-transform:uppercase;
  background:${({$status})=>$status==="PAGO"?"#eaf7eb":$status==="PENDENTE"?"#fff5e5":"#fdeceb"};
  color:${({$status})=>$status==="PAGO"?"#28763d":$status==="PENDENTE"?"#9b651d":"#a43d36"};
`;
export const Empty = styled.div`border:1px dashed var(--border);border-radius:14px;padding:28px;text-align:center;color:var(--muted);`;
export const Loading = styled(Empty)`animation:pulse 1.2s ease-in-out infinite;@keyframes pulse{50%{opacity:.55}}`;
export const PixBackdrop = styled.div`
  position:fixed;inset:0;z-index:1300;background:rgba(20,17,15,.58);backdrop-filter:blur(4px);display:grid;place-items:center;padding:20px;
`;
export const PixModal = styled.div`
  width:min(430px,100%);max-height:calc(100vh - 40px);overflow:auto;border-radius:20px;background:#fff;padding:24px;box-shadow:0 28px 80px rgba(20,14,10,.3);position:relative;text-align:center;
  .close{position:absolute;right:14px;top:14px;width:34px;height:34px;border:0;border-radius:50%;background:#f3efeb;color:#342a24;cursor:pointer;font-size:20px}
  .brand{display:inline-flex;align-items:center;gap:8px;color:#167b68;font-size:12px;font-weight:850;letter-spacing:.05em;text-transform:uppercase}
  h2{margin:12px 0 7px;font-size:22px}p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}
  img{width:220px;height:220px;display:block;margin:18px auto 12px;border:1px solid var(--border);border-radius:14px;padding:8px;object-fit:contain}
  .amount{font-size:24px;font-weight:900;color:var(--a);margin:5px 0 14px}
  .copy{width:100%;min-height:46px;border:0;border-radius:11px;background:#191816;color:#fff;font-weight:850;cursor:pointer}.copy:hover{background:var(--a)}
  .expires{margin-top:10px;font-size:11px;color:var(--muted)}
`;
