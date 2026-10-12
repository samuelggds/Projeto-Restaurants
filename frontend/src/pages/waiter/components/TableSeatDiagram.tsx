import styled from 'styled-components';
const Layout = styled.span<{ $tone:'free'|'busy'|'reserved' }>`
  --ink: ${p=>p.$tone==='busy'?'#a96614':p.$tone==='reserved'?'#5374b6':'#315a4c'};
  --surface: ${p=>p.$tone==='busy'?'#fff0d9':p.$tone==='reserved'?'#eef2fc':'#e9f2ed'};
  position:relative;width:90px;height:56px;display:flex;align-items:center;justify-content:center;color:var(--ink);
  .desk {width:51px;height:33px;border:1.2px solid var(--ink);border-radius:7px;background:var(--surface);
    font-size:13px;font-weight:700;display:grid;place-items:center;}
  .chair {position:absolute;background:var(--surface);border:1px solid var(--ink);border-radius:1px;}
  .north,.south {width:17px;height:7px;left:36px;}
  .north{top:0}.south{bottom:0}
  .west,.east{width:8px;height:14px;top:21px;}
  .west{left:0}.east{right:0}
`;
export function TableSeatDiagram({number,capacity,tone}:{
  number:number;capacity?:number|null;tone:'free'|'busy'|'reserved'
}) {
  return <Layout $tone={tone} aria-label={`Mesa ${number}, ${capacity ?? 'capacidade não configurada'} lugares`}>
    <i aria-hidden className="chair north"/><i aria-hidden className="chair south"/>
    <i aria-hidden className="chair west"/><i aria-hidden className="chair east"/>
    <span aria-hidden className="desk">{String(number).padStart(2,'0')}</span>
  </Layout>;
}
