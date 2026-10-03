import { FormEvent, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import styled from 'styled-components';
import deliveryChatService,{type DeliveryChatMessage,type DeliveryChatSnapshot} from '../../Services/deliveryChatService';
import { getGuestOrderOwnershipToken } from '../../Services/ordersService';
import { acquireSocket, connectGuestOrdersSocket } from '../../Services/socketService';
import { getAccessToken } from '../../modules/auth/session/authSession';

function merge(list: DeliveryChatMessage[], message: DeliveryChatMessage) {
  const next = list.some((item) => item.id === message.id)
    ? list.map((item) => (item.id === message.id ? { ...item, ...message } : item))
    : [...list, message];
  return next.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
}

function apiErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback
  );
}

function validSnapshot(value: DeliveryChatSnapshot) {
  if (
    !value ||
    !value.thread ||
    !value.order ||
    !Array.isArray(value.messages)
  ) {
    throw new Error('Resposta inválida do chat da entrega.');
  }
  return value;
}
export function CustomerTrackingChatPanel({orderId,courierName}:{orderId:number;courierName:string}){
 const [snapshot,setSnapshot]=useState<DeliveryChatSnapshot|null>(null),[draft,setDraft]=useState(''),[error,setError]=useState(''),[sending,setSending]=useState(false);const end=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{let active=true,busy=false;const refresh=async()=>{if(busy)return;busy=true;try{const next=validSnapshot(await deliveryChatService.get(orderId));if(active)setSnapshot(cur=>cur?{...next,messages:next.messages.reduce((a,m)=>merge(a,m),cur.messages)}:next);if(active)setError('');}catch(e){if(active)setError(apiErrorMessage(e, 'Não foi possível abrir o chat desta entrega.'));}finally{busy=false;}};void refresh();const id=setInterval(refresh,5000);return()=>{active=false;clearInterval(id);};},[orderId]);

 useEffect(()=>{
   const accessToken=getAccessToken();
   const guestProof=getGuestOrderOwnershipToken(orderId);
   const lease=accessToken?acquireSocket(accessToken,`customer-delivery-chat:${orderId}`):null;
   const guestSocket=!accessToken&&guestProof?connectGuestOrdersSocket([{orderId,token:guestProof}],`customer-delivery-chat:${orderId}`):null;
   const socket=lease?.socket||guestSocket;
   if(!socket)return undefined;

   const onMessage=(raw:unknown)=>{
     const payload=raw as {orderId?:unknown;message?:DeliveryChatMessage};
     if(Number(payload?.orderId||0)!==orderId||!payload?.message)return;
     setSnapshot(cur=>cur?{...cur,messages:merge(cur.messages,payload.message!)}:cur);
     void deliveryChatService.markRead(orderId).catch(()=>undefined);
   };
   const onStatus=(raw:unknown)=>{
     const payload=raw as {id?:unknown;order?:{id?:unknown}};
     if(Number(payload?.order?.id??payload?.id??0)!==orderId)return;
     void deliveryChatService.get(orderId).then(next=>setSnapshot(validSnapshot(next))).catch(()=>undefined);
   };
   socket.on('delivery:chat-message',onMessage);
   socket.on('order:status-changed',onStatus);
   return()=>{
     socket.off('delivery:chat-message',onMessage);
     socket.off('order:status-changed',onStatus);
     lease?.release();
     guestSocket?.disconnect();
   };
 },[orderId]);

 useEffect(()=>{
   end.current?.scrollIntoView({behavior:'smooth',block:'end'});
 },[snapshot?.messages.length]);
 async function submit(e:FormEvent){e.preventDefault();const msg=draft.replace(/\s+/g,' ').trim();if(!msg||sending||snapshot?.thread.readOnly)return;setSending(true);setError('');try{const result=await deliveryChatService.send(orderId,msg);if(result?.message)setSnapshot(cur=>cur?{...cur,messages:merge(cur.messages,result.message)}:cur);setDraft('');}catch(err){setError(apiErrorMessage(err, 'Não foi possível enviar a mensagem.'));}finally{setSending(false);}}
 return <Card><h2 className="desktop-title">Mensagens com {courierName}</h2><h3 className="mobile-title">Fale com o entregador</h3><Messages>{snapshot?.messages.map(m=>String(m.senderRole).toUpperCase()==='SYSTEM'?<System key={m.id}>{m.message}</System>:<Bubble key={m.id} $mine={String(m.senderRole).toUpperCase()==='CUSTOMER'}><p>{m.message}</p><time>{new Date(m.createdAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time></Bubble>)}<div ref={end}/></Messages>{error?<Err role="alert">{error}</Err>:null}<Form onSubmit={submit}><input value={draft} onChange={e=>setDraft(e.target.value.slice(0,500))} disabled={!snapshot||snapshot.thread.readOnly||sending} placeholder={snapshot?.thread.readOnly?'Conversa encerrada':`Enviar mensagem para ${courierName.split(' ')[0] || 'o entregador'}...`}/><button disabled={!draft.trim()||!snapshot||snapshot.thread.readOnly||sending}><Send/></button></Form></Card>;
}
const Card=styled.section`
  padding:20px;
  border:1px solid #efece6;
  border-radius:20px;
  background:#fff;

  h2{margin:0 0 14px;color:#1f1e1a;font-size:14px}
  .mobile-title{display:none;margin:0 0 10px;color:#72706b;font-size:12px;text-transform:uppercase}

  @media(max-width:900px){
    margin:0 -4px;
    padding:16px 0 0;
    border:0;
    border-top:1px solid #efece6;
    border-radius:0;
    .desktop-title{display:none}
    .mobile-title{display:block}
  }
`;
const Messages=styled.div`
  min-height:140px;
  max-height:300px;
  display:flex;
  flex-direction:column;
  gap:10px;
  overflow-y:auto;
  @media(max-width:900px){min-height:0;max-height:220px}
`;
const Bubble=styled.div<{$mine:boolean}>`
  max-width:86%;
  padding:12px;
  align-self:${p=>p.$mine?'flex-end':'flex-start'};
  border-radius:${p=>p.$mine?'12px 12px 4px 12px':'12px 12px 12px 4px'};
  background:${p=>p.$mine?'#fdf2ec':'#efece6'};
  color:${p=>p.$mine?'#e85a2b':'#1f1e1a'};
  p{margin:0;font-size:13px;line-height:1.45}
  time{display:block;margin-top:4px;color:#98938d;font-size:10px;text-align:right}
`;
const System=styled.p`align-self:center;margin:0;padding:6px 10px;border-radius:999px;background:#f2f6f3;color:#69736e;font-size:9px`;
const Err=styled.p`margin:8px 0 0;color:#a2372a;font-size:10px`;
const Form=styled.form`
  margin-top:12px;
  display:grid;
  grid-template-columns:1fr 44px;
  gap:12px;
  align-items:center;

  input{
    min-width:0;
    height:44px;
    padding:0 14px;
    border:1px solid #efece6;
    border-radius:24px;
    outline:0;
    font-size:13px;
    background:#fff;
  }

  button{
    width:44px;
    height:44px;
    display:grid;
    place-items:center;
    border:0;
    border-radius:50%;
    background:#e85a2b;
    color:#fff;
  }

  button:disabled{opacity:.5}
  svg{width:18px}
`;
