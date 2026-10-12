import { ArrowRightLeft, BellRing, Plus, ReceiptText, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import styled from 'styled-components';
import type { RestaurantTable, WaiterTableAccountSnapshot } from '../types';
import { useWaiterWorkspace } from '../useWaiterWorkspace';
import { brl } from './Shared';
import { TableSeatDiagram } from './TableSeatDiagram';

const Panel = styled.aside`
  border:1px solid var(--border);border-radius:14px;background:var(--surface);
  box-shadow:0 6px 24px rgba(23,63,50,.05);overflow:hidden;min-width:0;align-self:start;
  .head,.summary,.orders{padding:18px 20px}
  .head{border-bottom:1px solid var(--border);display:grid;gap:12px}
  .eyebrow{display:flex;align-items:center;justify-content:space-between;color:var(--muted);font-size:11px;font-weight:700}
  .close{border:0;background:transparent;color:var(--muted);cursor:pointer}
  .identity{display:flex;align-items:center;gap:12px;min-width:0}
  .identity h2{font-size:23px;margin:0 0 7px;color:var(--ink)}
  .tag{display:inline-flex;border-radius:100px;padding:4px 9px;background:#fff0d9;color:#95621d;font-size:10px;font-weight:700}
  .tag.free{background:#e9f2ed;color:#315a4c}
  .context,.meta{color:var(--muted);font-size:11px;margin:0}
  .meta{display:flex;flex-wrap:wrap;justify-content:space-between;gap:7px}
  h3{margin:0;font-size:14px}
  .summary{display:grid;gap:12px}
  .consumed{background:#fbfaf7;border-radius:10px;padding:14px;display:grid;gap:7px}
  .consumed small{color:var(--muted);font-size:11px}
  .consumed strong{font-size:26px;color:var(--ink)}
  .orders{padding-top:0;display:grid;gap:11px}
  .orders-header{display:flex;justify-content:space-between;gap:8px;align-items:center}
  .orders-header small{font-size:11px;color:var(--muted)}
  .order{display:grid;gap:5px;padding-bottom:10px;border-bottom:1px solid var(--border)}
  .order-top,.order-bottom{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:11px}
  .order-top small,.order-bottom span{color:var(--muted);font-size:10px}
  .order-top em{font-size:9px;font-style:normal;border-radius:100px;background:#e9f2ed;color:#315a4c;padding:4px 7px}
  .order-bottom span{min-width:0;overflow:hidden;text-overflow:ellipsis}
  .ready{display:flex;align-items:center;gap:8px;color:#315a4c;background:#e9f2ed;border-radius:7px;padding:10px;font-size:11px}
  .error{color:#ae3126;font-size:12px}
  footer{display:grid;gap:8px;padding:17px 18px;background:#fbfaf7;border-top:1px solid var(--border)}
  footer button{width:100%;min-height:42px;border-radius:9px;border:1px solid var(--border);background:#fff;
    color:var(--ink);display:flex;justify-content:center;align-items:center;gap:8px;font-weight:700;font-size:12px}
  footer .primary{background:var(--brand);border-color:var(--brand);color:#fff}
  footer .danger{border-color:#ffd3d0;color:#d94735}
  footer .subtle{border:0;background:transparent}
  button:disabled{opacity:.55;cursor:not-allowed}
`;
const MobileLayer = styled.div`
  display:none;
  @media(max-width:760px){
    display:flex;position:fixed;inset:0;z-index:1200;background:rgba(15,23,20,.48);
    align-items:flex-end;justify-content:center;padding:10px;
    >aside{width:100%;max-width:540px;max-height:91dvh;overflow-y:auto;overscroll-behavior:contain;border-radius:18px 18px 12px 12px}
  }
`;

const statusLabels: Record<string,string> = {
  PENDENTE:'Pendente',PREPARANDO:'Em preparo',PRONTO:'Pronto',ENTREGUE:'Entregue',
  CANCELADO:'Cancelado',SAIU_PARA_ENTREGA:'Em entrega',
};
function PanelContents({table,onClose,onAccount,onTransfer,onNavigate,sessionAction}:{
  table:RestaurantTable;onClose:()=>void;onAccount:()=>void;onTransfer:()=>void;
  onNavigate:(destination:'deliveries'|'payments')=>void;sessionAction:ReactNode;
}) {
  const {tableAccountClient,tableAccountRefreshKey} = useWaiterWorkspace();
  const [snapshot,setSnapshot]=useState<WaiterTableAccountSnapshot|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const session=table.sessionPublicId;
  useEffect(()=>{
    let current=true;
    if(!session){return () =>{current=false};}
    queueMicrotask(()=>{if(current){setSnapshot(null);setLoading(true);setError('');}});
    void tableAccountClient.getAdminSnapshot(session).then(value=>{
      if(current)setSnapshot(value);
    }).catch(()=>{if(current)setError('Não foi possível carregar a comanda desta mesa.');})
      .finally(()=>{if(current)setLoading(false);});
    return ()=>{current=false;};
  },[session,tableAccountClient,tableAccountRefreshKey]);
  const occupied=table.status==='OCCUPIED';
  const orders=snapshot?.orders??[];
  const ready=orders.find(order=>order.status==='PRONTO');
  const money=snapshot?brl(snapshot.summary.consumedCents/100):occupied?'Carregando...':brl(0);
  return <Panel aria-label={`Atendimento da Mesa ${table.number}`}>
    <div className="head">
      <div className="eyebrow"><span>ATENDIMENTO</span><button className="close" aria-label="Fechar detalhes da mesa" onClick={onClose}><X size={17}/></button></div>
      <div className="identity"><TableSeatDiagram number={table.number} capacity={table.seatCapacity} tone={occupied?'busy':'free'}/>
        <div><h2>Mesa {String(table.number).padStart(2,'0')}</h2>
          <span className={`tag ${occupied?'':'free'}`}>{table.sessionStatus==='CLOSING_REQUESTED'?'Conta solicitada':occupied?'Ocupada':'Livre'}</span></div>
      </div>
      <p className="context">{table.seatCapacity?`${table.seatCapacity} lugares`:'Lugares não configurados'} · {table.guests} cliente(s)</p>
      {occupied&&<div className="meta"><span>{snapshot?.summary?.sessionPublicId?'Comanda ativa':'Sessão em atendimento'}</span>
        <span>{table.openedAt?`Aberta às ${table.openedAt}`:'Aberta'}</span></div>}
    </div>
    <div className="summary"><h3>Resumo da comanda</h3>
      <div className="consumed"><small>Consumo até agora</small><strong>{money}</strong>
        <small>{snapshot?`${orders.length} pedidos · ${orders.reduce((sum,order)=>sum+order.itemsCount,0)} itens na comanda`:loading?'Carregando conta...':occupied?'Consulte a conta para ver detalhes':'Mesa disponível para atendimento'}</small>
      </div>
      {error&&<p className="error" role="alert">{error}</p>}
    </div>
    {occupied&&<div className="orders"><div className="orders-header"><h3>Pedidos da mesa</h3><small>{orders.length} pedidos</small></div>
      {orders.map(order=><div className="order" key={order.id}>
        <div className="order-top"><span><b>#{order.id}</b> <small>{new Date(order.createdAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></span>
          <em>{statusLabels[order.status]||order.status}</em></div>
        <div className="order-bottom"><span>{order.items.join(' + ')||'Pedido da mesa'}</span><b>{brl(order.totalCents/100)}</b></div>
      </div>)}
      {snapshot?.hasMoreOrders&&<small>Exibindo os 50 pedidos mais recentes. Consulte o histórico completo para ver os anteriores.</small>}
      {snapshot&&!orders.length&&<small>Nenhum pedido registrado nesta sessão.</small>}
      {ready&&<div className="ready"><BellRing size={15}/>Pedido #{ready.id} pronto para servir.</div>}
    </div>}
    <footer>
      {occupied?<>
        <button className="primary" type="button" onClick={()=>onNavigate('deliveries')}><Plus size={16}/>Pedidos para entregar</button>
        <button type="button" onClick={onAccount} disabled={!session}><ReceiptText size={16}/>Consultar pedidos e pagamentos</button>
        <button className="danger" type="button" onClick={()=>onNavigate('payments')}><ReceiptText size={16}/>Conferir fechamento</button>
        <button className="subtle" type="button" onClick={onTransfer} disabled={!table.sessionId}><ArrowRightLeft size={16}/>Transferir mesa</button>
        {sessionAction}
      </>:<><p className="context">Mesa livre. Abra a mesa para permitir pedidos pelo QR Code.</p>{sessionAction}</>}
    </footer>
  </Panel>;
}
export function SelectedTablePanel({table,onClose,onAccount,onTransfer,onNavigate,sessionAction}:{
 table:RestaurantTable;onClose:()=>void;onAccount:()=>void;onTransfer:()=>void;
 onNavigate:(destination:'deliveries'|'payments')=>void;sessionAction:ReactNode;
}) {
  const [mobile,setMobile]=useState(false);
  useEffect(()=>{
    const update=()=>setMobile(window.innerWidth<=760);
    update();window.addEventListener('resize',update);
    return ()=>window.removeEventListener('resize',update);
  },[]);
  useEffect(()=>{
    if(!mobile)return;
    const old=document.body.style.overflow;document.body.style.overflow='hidden';
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};
    document.addEventListener('keydown',key);
    return ()=>{document.body.style.overflow=old;document.removeEventListener('keydown',key);};
  },[mobile,onClose]);
  const contents=<PanelContents table={table} onClose={onClose} onAccount={onAccount}
    onTransfer={onTransfer} onNavigate={onNavigate} sessionAction={sessionAction}/>;
  return mobile ? <MobileLayer onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div role="dialog" aria-modal="true" aria-label={`Atendimento da Mesa ${table.number}`}>
      {contents}
    </div>
  </MobileLayer> : <div className="desktop-table-details">{contents}</div>;
}
