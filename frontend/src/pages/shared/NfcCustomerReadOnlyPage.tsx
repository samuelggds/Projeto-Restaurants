import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import api from '../../Services/api';

type Visit = {
 id:string;cardCode:string;tableNumber:number|null;status:string;openedAt:string;
 totalCents:number;paidCents:number;outstandingCents:number;
 items:Array<{id:string;kind:string;description:string;quantity:number;totalCents:number;createdAt:string;sourceOrderId:number|null}>;
 orders:Array<{id:number;status:string;createdAt:string}>;
};
const money=(cents:number)=>(cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const when=(date:string)=>new Date(date).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
const statuses:Record<string,string>={PENDENTE:'Recebido',PREPARANDO:'Em preparo',PRONTO:'Pronto',SAIU_PARA_ENTREGA:'Saiu para entrega',ENTREGUE:'Entregue',CANCELADO:'Cancelado'};
const Layout=styled.main`
 min-height:100dvh;background:#f7f8f4;color:#263129;padding:22px 14px 64px;
 *{box-sizing:border-box}
 .wrapper{max-width:690px;margin:0 auto;display:grid;gap:15px}
 .brand{display:flex;align-items:center;gap:9px;color:#ea6d22;font-weight:850;font-size:19px}
 .brand img{width:32px;height:32px;object-fit:contain}
 h1{margin:4px 0;font-size:clamp(23px,5vw,31px);letter-spacing:-.04em}
 p{margin:0;line-height:1.5}
 .sub{font-size:13px;color:#728178}
 .card{background:#fff;border:1px solid #e4e8e1;border-radius:17px;padding:21px;box-shadow:0 5px 25px #1e2d1b08}
 .form{display:grid;gap:14px}
 label{font-size:13px;font-weight:700;display:grid;gap:7px}
 input{border:1px solid #cbd7cc;border-radius:9px;font:inherit;padding:14px;width:100%}
 button{background:#e9681d;color:white;border:0;border-radius:10px;cursor:pointer;padding:13px;font:inherit;font-weight:800}
 button:disabled{opacity:.55;cursor:not-allowed}
 .warning{background:#fff1e6;padding:11px;border-radius:9px;color:#995117;font-size:12px}
 .error{color:#a8281d;font-size:13px}
 .bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
 .chip{font-size:11px;color:#25704b;background:#e9f7ee;border-radius:99px;padding:7px 10px;font-weight:700}
 .meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:15px 0}
 .meta span,.label{font-size:11px;color:#7a867c;display:block;margin-bottom:4px}
 .meta strong{overflow-wrap:anywhere;font-size:13px}
 .order{border:1px solid #e5ebe5;border-radius:12px;margin-top:11px;overflow:hidden}
 .order-heading{background:#f7f8f6;padding:12px;display:flex;justify-content:space-between;gap:8px;font-size:12px}
 .item{padding:11px 12px;display:flex;justify-content:space-between;gap:8px;border-top:1px solid #e8ebe6;font-size:13px}
 .summary{display:grid;gap:12px}
 .summary div{display:flex;justify-content:space-between;gap:10px}
 .summary .balance{border-top:1px solid #dce9d7;padding-top:13px;font-size:19px;font-weight:850}
 .help{font-size:11px;color:#7a857b}
 @media(max-width:430px){.card{padding:16px}.order-heading{flex-direction:column}.meta{gap:9px}}
`;
export default function NfcCustomerReadOnlyPage(){
 const {token=''}=useParams();
 const [cpf,setCpf]=useState('');
 const [session,setSession]=useState('');
 const [visit,setVisit]=useState<Visit|null>(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [updated,setUpdated]=useState('');
 const refreshing=useRef(false);
 const validToken=/^[A-Za-z0-9_-]{32,128}$/u.test(token);
 const load=useCallback(async(sessionToken:string)=>{
   if(refreshing.current)return;
   refreshing.current=true;
   try{
     const response=await api.get<{comanda:Visit;updatedAt:string}>('/nfc-customer-view/account',{
       headers:{'x-nfc-customer-session':sessionToken},skipBaseUrlFallback:true,
     });
     if(!response.data?.comanda)throw new Error('Comanda indisponível');
     setVisit(response.data.comanda);setUpdated(response.data.updatedAt);setError('');
   }catch(err){
     const status=(err as {response?:{status?:number}}).response?.status;
     if(status===401||status===403){setSession('');setVisit(null);setError('Acesso encerrado. Aproxime novamente o cartão e confirme sua identidade.');}
     else setError('Não foi possível atualizar a comanda. Verifique a conexão.');
   }finally{refreshing.current=false;}
 },[]);
 const verify=async(event:FormEvent)=>{
   event.preventDefault();
   if(!validToken||cpf.length!==11||busy)return;
   setBusy(true);setError('');
   try{
     const response=await api.post<{sessionToken:string}>('/nfc-customer-view/verify',{token,cpf},{skipBaseUrlFallback:true});
     const value=response.data?.sessionToken;
     if(!value)throw new Error('Sessão inválida');
     setCpf('');setSession(value);
     await load(value);
   }catch{
     setSession('');setVisit(null);setError('Não foi possível verificar o CPF ou a visita. Se houve tentativas incorretas, o acesso poderá ficar temporariamente bloqueado.');
   }finally{setBusy(false);}
 };
 useEffect(()=>{
   if(!session)return;
   let cancelled=false;
   const id=window.setInterval(()=>{if(!cancelled&&!document.hidden)void load(session)},5000);
   const visibility=()=>{if(!document.hidden&&!cancelled)void load(session)};
   document.addEventListener('visibilitychange',visibility);
   return()=>{cancelled=true;window.clearInterval(id);document.removeEventListener('visibilitychange',visibility)};
 },[session,load]);
 return <Layout><div className="wrapper">
   <header><div className="brand"><img src="/gastronexa-logo.svg" alt=""/> GastroNexa</div><h1>Minha comanda NFC</h1><p className="sub">Acompanhe os pedidos e o consumo da sua visita. Somente visualização.</p></header>
   {!session&&<section className="card">
     {!validToken?<p className="error">Identificador do cartão inválido. Aproxime novamente o cartão NFC.</p>:
       <form className="form" onSubmit={e=>void verify(e)}>
         <p>Para proteger seus pedidos, confirme o CPF completo cadastrado na recepção.</p>
         <label>CPF completo (11 dígitos)<input type="password" autoComplete="off" inputMode="numeric" pattern="[0-9]{11}" maxLength={11} required value={cpf} onChange={e=>setCpf(e.target.value.replace(/\D/g,'').slice(0,11))}/></label>
         <button type="submit" disabled={busy||cpf.length!==11}>{busy?'Verificando...':'Visualizar minha comanda'}</button>
         <p className="help">O cartão sozinho não revela dados. O acesso é temporário e encerra quando o cartão é devolvido.</p>
       </form>}
   </section>}
   {visit&&<><section className="card">
     <div className="bar"><h2 style={{margin:0,fontSize:18}}>Visita atual</h2><span className="chip">Atualização automática</span></div>
     <div className="meta">
       <div><span>Cartão NFC</span><strong>{visit.cardCode}</strong></div>
       <div><span>Mesa</span><strong>{visit.tableNumber===null?'Sem mesa vinculada':`Mesa ${visit.tableNumber}`}</strong></div>
       <div><span>Início da visita</span><strong>{when(visit.openedAt)}</strong></div>
       <div><span>Comanda</span><strong>#{visit.id.slice(0,8).toUpperCase()}</strong></div>
     </div>
     <p className="help">Atualizado: {updated?when(updated):'Consultando...'}. Os dados são consultados no servidor a cada 5 segundos.</p>
   </section>
   <section className="card"><h2 style={{margin:'0 0 12px',fontSize:18}}>Meus pedidos</h2>
     {visit.orders.map(order=><div className="order" key={order.id}>
       <div className="order-heading"><strong>Pedido #{order.id} · {when(order.createdAt)}</strong><span>{statuses[order.status]||order.status}</span></div>
       {visit.items.filter(item=>item.sourceOrderId===order.id).map(item=><div className="item" key={item.id}><span>{item.quantity} × {item.description}</span><strong>{money(item.totalCents)}</strong></div>)}
     </div>)}
     {visit.items.filter(item=>!item.sourceOrderId||!visit.orders.some(order=>order.id===item.sourceOrderId)).map(item=><div className="item" key={item.id}><span>{item.quantity} × {item.description}</span><strong>{money(item.totalCents)}</strong></div>)}
     {visit.items.length===0&&<p className="sub">Nenhum consumo registrado nesta visita.</p>}
   </section>
   <section className="card summary">
     <div><span>Total de consumo</span><strong>{money(visit.totalCents)}</strong></div>
     <div><span>Pagamentos confirmados</span><strong>{money(visit.paidCents)}</strong></div>
     <div className="balance"><span>Saldo em aberto</span><strong>{money(visit.outstandingCents)}</strong></div>
     <p className="help">Os valores são fornecidos pelo servidor. Esta tela não permite pedir, editar, cancelar ou pagar.</p>
   </section></>}
   {error&&<p role="alert" className="warning">{error}</p>}
 </div></Layout>;
}
