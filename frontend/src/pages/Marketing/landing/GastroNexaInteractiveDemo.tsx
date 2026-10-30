import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Check, Play, Pause, RotateCcw, QrCode, ShoppingBag, Wifi } from 'lucide-react';
import './GastroNexaInteractiveDemo.css';

type Mode = 'delivery' | 'mesas' | 'nfc';
const modes: {id:Mode; label:string; sub:string}[] = [
  {id:'delivery',label:'Cardápio delivery',sub:'Entrega e retirada'},
  {id:'mesas',label:'QR Code na mesa',sub:'Pedidos pelo cliente'},
  {id:'nfc',label:'Cashless NFC',sub:'Comanda individual com a equipe'},
];
const stage: Record<Mode,{ title:string; headline:string; explanation:string; steps:{name:string; headline:string; details:string}[] }> = {
  delivery:{
    title:'Seu delivery. Seu cliente.',headline:'O pedido chega. A cozinha prepara.',
    explanation:'O cliente escolhe produtos no cardápio digital, confirma o carrinho e acompanha o atendimento.',
    steps:[
      {name:'Abrir cardápio',headline:'Seu cardápio, na palma da mão.',details:'O cliente conhece os produtos e escolhe o que quer pedir.'},
      {name:'Escolher produtos',headline:'Escolha rápida, visual e prática.',details:'Itens e quantidades são selecionados em uma demonstração de pedido.'},
      {name:'Conferir carrinho',headline:'Tudo pronto para confirmar.',details:'O resumo exibe os itens e os valores desta prévia.'},
      {name:'Enviar pedido',headline:'Pedido enviado à equipe.',details:'Visualize como a cozinha recebe a solicitação; nada é enviado de verdade.'},
      {name:'Acompanhar',headline:'Cada etapa no seu lugar.',details:'O cliente acompanha a evolução do preparo e da entrega.'},
    ]
  },
  mesas:{
    title:'A mesa chama. O cliente escolhe.',headline:'Sua mesa. Seu consumo.',
    explanation:'O QR Code identifica a mesa. Cada pessoa entra com nome e telefone, pede no celular e acompanha seu consumo.',
    steps:[
      {name:'Escanear QR',headline:'A câmera encontra sua mesa.',details:'Aponte para o QR Code da mesa e abra a experiência do salão.'},
      {name:'Identificar cliente',headline:'Nome e telefone. Sem complicar.',details:'Cada participante se identifica e acompanha apenas seus próprios pedidos.'},
      {name:'Fazer pedido',headline:'O cardápio vai até a mesa.',details:'O cliente seleciona seus produtos pelo celular.'},
      {name:'Enviar à cozinha',headline:'Pedido enviado. Salão conectado.',details:'A equipe acompanha os pedidos no fluxo operacional.'},
      {name:'Acompanhar consumo',headline:'Sua mesa, seu consumo.',details:'Acompanhe o pedido, a chamada de garçom e o consumo individual.'},
    ]
  },
  nfc:{
    title:'Um cartão. Sua comanda.',headline:'Aproxime. Escolha. Peça.',
    explanation:'A equipe cadastra o cliente e lança os itens. O cliente confirma com o cartão e os 3 primeiros dígitos do CPF, em uma comanda individual.',
    steps:[
      {name:'Recepção pela equipe',headline:'O atendimento começa na recepção.',details:'A equipe cadastra nome, CPF e telefone, vincula o cartão à visita e informa a mesa, se houver.'},
      {name:'Confirmar pedido',headline:'Aproxime o cartão. Confirme com CPF.',details:'A equipe lança os itens. No iPhone, o cartão abre o acesso pelo Safari; o cliente confirma com os 3 primeiros dígitos do CPF.'},
      {name:'Registrar consumo',headline:'Pedido na cozinha. Conta em aberto.',details:'A confirmação por cartão e CPF registra o pedido na comanda da visita. O pagamento é feito separadamente.'},
    ]
  },
};
const format = (cents:number)=> (cents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const clamp = (value:number)=>Math.max(0,Math.min(1,value));
const ease = (value:number)=>{const t=clamp(value);return t*t*(3-2*t);};
const durations:Record<Mode,number[]>={delivery:[3200,3200,3200,2800,3200],mesas:[4200,3200,3200,2800,3200],nfc:[5200,5800,4200]};
function frameAt(mode:Mode,elapsed:number){
  const times=durations[mode],duration=times.reduce((sum,time)=>sum+time,0);
  let local=elapsed%duration,step=0;
  while(step<times.length-1&&local>=times[step]){local-=times[step];step+=1;}
  return {step,local,duration,progress:local/times[step]};
}
function Brand(){return <span className="gn-scene-brand-mark"><img src="/gastronexa-logo.svg" alt=""/>Gastro<span>Nexa</span></span>;}
const demoProducts=[{name:'Pizza calabresa',emoji:'🍕',price:4990},{name:'Refrigerante',emoji:'🥤',price:700},{name:'Água mineral',emoji:'💧',price:500}];
function Phone({mode,step,local,phoneApproach}:{mode:Mode;step:number;local:number;phoneApproach:number}) {
  const scanner=(1-Math.cos(Math.max(0,local-1500)/210))/2;
  const typed=(text:string,delay:number)=>text.slice(0,Math.floor(clamp((local-delay)/650)*text.length));
  const phoneStyle=mode==='mesas'?{transform:`translate3d(calc(var(--gn-phone-qr-x) * ${phoneApproach}),calc(var(--gn-phone-qr-y) * ${phoneApproach}),0) rotate(${-8*phoneApproach}deg) scale(${1-phoneApproach*.08})`} as CSSProperties:undefined;
  return <div className="gn-scene-phone" style={phoneStyle} aria-label="iPhone ilustrativo da demonstração">
    <div className="gn-scene-notch"/><div className="gn-scene-status">9:41 <span>● ᴡɪғɪ ▰</span></div>
    <div className="gn-scene-brand"><Brand/></div>
    <div className="gn-scene-content" key={mode+'-'+step}>
      {mode==='mesas' ? <>
        <small className="gn-scene-tag">Mesa 08 · {step<2?'Em atendimento':'Cliente exemplo'}</small>
        {step===0 ? <><h4>Escaneie o QR da mesa.</h4><p>A câmera abre o cardápio identificado.</p><div className="gn-scene-scanner"><QrCode size={86}/><div className="gn-scene-laser" style={{transform:`translateY(${scanner*122}px)`,opacity:local>=1500&&local<=2800?1:0}}/></div>{local>2800&&<div className="gn-scene-positive"><Check size={13}/> Mesa 08 identificada</div>}</> :
        step===1 ? <><h4>Seu lugar.<br/>Seu pedido.</h4><p>Identifique-se para acompanhar somente seu consumo.</p><label>Nome<input readOnly tabIndex={-1} value={typed("Cliente exemplo",150)}/></label><label>Telefone<input readOnly tabIndex={-1} value={typed("(00) 00000-0000",900)}/></label><b className="gn-scene-cta">Acessar cardápio da mesa</b></> :
        step===2 ? <><h4>Escolha seus produtos.</h4>{demoProducts.slice(0,2).map(p=><div className="gn-scene-product" key={p.name}>{p.emoji} <span>{p.name}</span><b>{format(p.price)}</b></div>)}<b className="gn-scene-cta">Enviar pedido</b></> :
        step===3 ? <><h4>Pedido enviado!</h4><p>Itens vinculados ao seu consumo individual.</p><div className="gn-scene-product">🍕 Pizza calabresa <b>{format(4990)}</b></div><div className="gn-scene-positive"><Check size={13}/> Pedido enviado para a cozinha.</div></> :
        <><h4>Sua mesa.<br/>Seu consumo.</h4><div className="gn-scene-product">🍕 Pizza calabresa <b>{format(4990)}</b></div><div className="gn-scene-positive"><Check size={13}/> Acompanhamento do pedido</div><b className="gn-scene-cta">Ver conta individual</b></>}
      </> : mode==='nfc' ? <>
        <small className="gn-scene-tag">Equipe autorizada · visita atual</small>
        {step===0 ? <><h4>Recepção do cliente</h4><p>A equipe vincula o cartão à visita.</p><label>Nome<input readOnly tabIndex={-1} value={typed('Cliente exemplo',100)}/></label><label>CPF<input readOnly tabIndex={-1} value={typed('000.000.000-00',750)}/></label><div className="gn-scene-form-row"><label>Telefone<input readOnly tabIndex={-1} value={typed('(00) 00000-0000',1400)}/></label><label>Mesa (opcional)<input readOnly tabIndex={-1} value={typed('08',2000)}/></label></div><b className="gn-scene-cta">{local>2850?'Cartão vinculado à visita ✓':'Vincular cartão e abrir comanda'}</b><small className="gn-scene-note">Dados fictícios de demonstração.</small></> :
        step===1 ? <><h4>Confirmação do pedido</h4><div className="gn-scene-product">🍕 Pizza calabresa <b>{format(4990)}</b></div><p>A equipe lançou os itens. O cliente confirma.</p><div className={local>2100?'gn-scene-positive':'gn-scene-wait'}><Wifi size={13}/> {local>2100?'Cartão NFC identificado':'Aproxime o cartão do iPhone'}</div>{local>1500&&local<2850?<div className="gn-scene-notification"><Wifi size={15}/><span><b>Notificação NFC</b><small>Toque para abrir no Safari</small></span></div>:<p>Confirme com os 3 primeiros dígitos do CPF.</p>}<div className="gn-scene-digits">{[0,1,2].map(i=><span key={i}>{local>3000+i*340?'0':'●'}</span>)}</div><b className="gn-scene-cta">{local>4350?'Pedido confirmado ✓':'Confirmar pedido'}</b></> :
        <><h4>Comanda individual</h4><p>Cliente exemplo · visita atual</p><div className="gn-scene-positive"><Check size={13}/> Pedido enviado para a cozinha.</div><div className="gn-scene-product">🍕 Pizza calabresa <b>{format(4990)}</b></div><div className="gn-scene-product">Saldo em aberto <b>{format(4990)}</b></div><span className="gn-scene-unpaid">NÃO PAGO</span><p>NFC confirma o pedido.<br/>O pagamento é feito separadamente.</p></>}
      </> : <>
        <small className="gn-scene-tag">Cardápio digital · delivery</small>
        {step<3 ? <><h4>{step===0?'Seu pedido começa aqui.':step===1?'Escolha seus favoritos.':'Confira seu carrinho.'}</h4>{demoProducts.slice(0,step===0?2:3).map((p,i)=><div className="gn-scene-product" key={p.name} style={{transform:`translateY(${(1-ease((local-i*220)/700))*15}px)`,opacity:.4+.6*ease((local-i*220)/700)}}>{p.emoji} <span>{p.name}</span><b>{format(p.price)}</b></div>)}<b className="gn-scene-cta">{step===2?'Confirmar pedido':'Continuar comprando'}</b></> :
        step===3 ? <><h4>Pedido enviado!</h4><p>Uma demonstração do recebimento de pedidos.</p><div className="gn-scene-positive"><Check size={13}/> Pedido enviado à operação.</div></> :
        <><h4>Acompanhe seu pedido.</h4>{['Recebido','Em preparo','Pronto para entrega'].map(x=><div className="gn-scene-product" key={x}><Check size={13}/>{x}</div>)}</>}
      </>}
    </div><div className="gn-scene-home"/>
  </div>;
}
function Illustration({mode,step,faceBack,onFlip}:{mode:Mode;step:number;faceBack:boolean;onFlip:()=>void}){
 return <div className={'gn-scene-illustration gn-scene-'+mode}>
   {mode==='mesas' && <div className="gn-scene-paper"><small>MESA EM ATENDIMENTO</small><strong>Mesa 08</strong><QrCode size={92}/><p>Aponte a câmera.<br/>Seu próximo pedido começa aqui.</p></div>}
   {mode==='nfc' && <button type="button" className={'gn-scene-card gn-scene-flip '+(faceBack?'flipped':'')} onClick={onFlip} aria-label={faceBack?'Ver frente do cartão NFC':'Virar cartão NFC para ver o verso'} title="Clique para virar o cartão">
   <span className="gn-scene-card-front"><b>GX <span>GastroNexa</span></b><strong>Comanda<br/>individual.</strong><small>Seu pedido começa aqui · toque para virar</small></span>
   <span className="gn-scene-card-back"><b>GX <span>GastroNexa</span></b><strong>Aproxime.<br/>Escolha.<br/><em>Peça.</em></strong><Wifi size={38}/><small>www.gastronexa.com.br</small></span>
 </button>}
   {(mode==='mesas'&&step===0 || mode==='nfc'&&(step===0||step===1||step===4))&&<div className="gn-scene-signal">{mode==='mesas'?<QrCode size={22}/>:<Wifi size={22}/>} {mode==='mesas'?'Escaneando QR Code':'Lendo cartão NFC'}</div>}
   <Phone mode={mode} step={step}/>
 </div>;
}
export function GastroNexaInteractiveDemo() {
 const [mode,setMode]=useState<Mode>('mesas');
 const [step,setStep]=useState(0);
 const [playing,setPlaying]=useState(false);
 const [faceBack,setFaceBack]=useState(false);
 const [autoplayStarted,setAutoplayStarted]=useState(false);
 const sectionRef=useRef<HTMLElement>(null);
 const stages=stage[mode].steps;
 useEffect(()=>{if(!playing)return;const id=window.setInterval(()=>setStep(previous=>(previous+1)%stages.length),3500);return()=>window.clearInterval(id);},[playing,stages.length]);
 useEffect(()=>{
   if (autoplayStarted || typeof IntersectionObserver === 'undefined') return;
   const root=sectionRef.current;
   if (!root) return;
   const observer=new IntersectionObserver(entries=>{
     if (!entries.some(entry=>entry.isIntersecting)) return;
     setAutoplayStarted(true);
     observer.disconnect();
     if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(true);
   },{threshold:0.15});
   observer.observe(root);
   return ()=>observer.disconnect();
 },[autoplayStarted]);
 const chooseMode=(id:Mode)=>{setMode(id);setStep(0);setFaceBack(false);setPlaying(false);};
 return <section ref={sectionRef} className="gn-try gn-showcase" id="demonstracao" aria-label="Demonstração animada GastroNexa">
   <div className="gn-try-wrap">
     <header className="gn-showcase-heading"><div className="gn-showcase-label">● EXPLORE A EXPERIÊNCIA GASTRONEXA <span>PRÉVIA</span></div><h2>Uma plataforma.<br/><em>Três formas de conectar.</em></h2><p>Do pedido no delivery ao atendimento no salão: conheça as experiências para o seu cliente, sua equipe e seu restaurante.</p></header>
     <div className="gn-showcase-tabs" role="group" aria-label="Escolha a experiência">
       {modes.map(item=><button type="button" key={item.id} aria-pressed={mode===item.id} onClick={()=>chooseMode(item.id)}>{item.id==='delivery'?<ShoppingBag size={22}/>:item.id==='mesas'?<QrCode size={22}/>:<Wifi size={22}/>}<span><b>{item.label}</b><small>{item.sub}</small></span></button>)}
     </div>
     <div className="gn-showcase-main">
       <div className="gn-showcase-copy"><small>● {mode==='nfc'?'COM A EQUIPE AUTORIZADA':mode==='mesas'?'NO SALÃO, PELO CELULAR DO CLIENTE':'PEDIDOS NO CELULAR DO CLIENTE'}</small><h3>{mode==='mesas'?<>A mesa chama.<br/><em>O cliente escolhe.</em></>:mode==='nfc'?<>Um cartão.<br/><em>Sua comanda.</em></>:<>Seu delivery.<br/><em>Sem complicar.</em></>}</h3><p>{stage[mode].explanation}</p>
         <div className="gn-showcase-checks">{(mode==='mesas'?['Mesa identificada pelo QR Code','Pedidos enviados à cozinha','Consumo individual por participante']:mode==='nfc'?['Recepção com nome, CPF e telefone','Mesa opcional e identificação por cartão','Consulta e pagamento na evolução do módulo']:['Cardápio digital no celular','Carrinho e pedido demonstrativos','Acompanhamento visual da operação']).map(x=><span key={x}><Check size={15}/>{x}</span>)}</div>
         <div className="gn-showcase-current" aria-live="polite"><small>{String(step+1).padStart(2,'0')} / {mode==='nfc'?'PRÉVIA CASHLESS':mode==='mesas'?'QR CODE DE MESA':'DELIVERY'}</small><strong>{stages[step].headline}</strong><p>{stages[step].details}</p></div>
         <div className="gn-showcase-actions"><button type="button" className="gn-showcase-primary" onClick={()=>setPlaying(v=>!v)}>{playing?<Pause size={16}/>:<Play size={16}/>} {playing?'Pausar animação':'Ver animação'}</button><button type="button" className="gn-showcase-reset" onClick={()=>{setPlaying(false);setStep(0);}}><RotateCcw size={16}/> Rever esta experiência</button></div>
         <small className="gn-showcase-caption">{playing?'Reproduzindo a experiência selecionada.':'Selecione uma experiência ou explore as etapas.'}</small>
       </div>
       <Illustration mode={mode} step={step} faceBack={faceBack} onFlip={()=>setFaceBack(back=>!back)}/>
     </div>
     <nav className="gn-showcase-steps" aria-label="Etapas da experiência">{stages.map((s,i)=><button type="button" key={s.name} aria-current={i===step?'step':undefined} onClick={()=>{setStep(i);setPlaying(false);}}><small>{String(i+1).padStart(2,'0')}</small><strong>{s.name}</strong></button>)}</nav>
     <footer className="gn-showcase-foot"><span>Prévia de apresentação · nenhum cadastro, pedido ou pagamento real é enviado.</span><span>www.gastronexa.com.br</span></footer>
   </div>
 </section>;
}
