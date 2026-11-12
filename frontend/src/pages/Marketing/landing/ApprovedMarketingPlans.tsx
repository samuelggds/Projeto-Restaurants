import { useEffect, useState, useMemo } from 'react';
import { ArrowRight, Check, Clock3, Gift } from 'lucide-react';
import api from '../../../Services/api';
import { presentPlanBenefits } from './planBenefitPresentation';

type PlanCode = 'BASICO' | 'PREMIUM' | 'GESTAO_TOTAL';
type PublicPlan = { code: PlanCode; name: string; description: string; monthlyFee: number; trialDays: number; features: string[]; featured: boolean };
const fallback: PublicPlan[] = [
  {code:'BASICO',name:'Básico',description:'Delivery, pedidos e atendimento por QR Code de mesa.',monthlyFee:79.9,trialDays:7,featured:false,features:['Sistema de delivery','Cardápio digital com QR Code de mesa','Implantação inicial assistida','Cadastro inicial de até 50 produtos','Suporte padrão']},
  {code:'PREMIUM',name:'Premium',description:'Tudo do Entrada, com recursos avançados e gestão assistida contínua.',monthlyFee:149.9,trialDays:15,featured:false,features:['Sistema de delivery','Cardápio digital com QR Code de mesa','Cartões NFC com comandas individuais (em homologação)','Implantação inicial assistida','Suporte prioritário','Gestão assistida contínua, inclusive com atualizações diárias sob solicitação','Domínio próprio opcional com gestão técnica pela GastroNexa','Página personalizada do restaurante opcional no domínio próprio']},
  {code:'GESTAO_TOTAL',name:'Gestão Total',description:'Tudo do Premium com apoio contínuo sob solicitação.',monthlyFee:299.9,trialDays:15,featured:true,features:['Tudo do Plano Premium','Implantação inicial assistida','Gestão assistida contínua sob solicitação','Suporte prioritário']},
];
const order: Record<PlanCode, number> = {BASICO:1,PREMIUM:2,GESTAO_TOTAL:3};
function validCatalog(data: unknown): PublicPlan[] {
  const input = Array.isArray((data as {plans?: unknown[]})?.plans) ? (data as {plans:unknown[]}).plans : [];
  const parsed: PublicPlan[] = [];
  for(const item of input){
    if(!item || typeof item !== 'object') continue;
    const p = item as Record<string,unknown>;
    const code=String(p.code??'').toUpperCase();
    if(code!=='BASICO' && code!=='PREMIUM' && code!=='GESTAO_TOTAL') continue;
    const features = Array.isArray(p.features) ? p.features.map(x=>String(x)) : [];
    const amount=Number(p.monthlyFee); const trial=Number(p.trialDays);
    parsed.push({code,name:String(p.name??code),description:String(p.description??''),monthlyFee:Number.isFinite(amount)?amount:0,trialDays:Number.isFinite(trial)?trial:0,featured:Boolean(p.featured),features});
  }
  return parsed.some((plan) => plan.code === 'BASICO') && parsed.some((plan) => plan.code === 'PREMIUM') ? parsed : fallback;
}
const currency=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
export function ApprovedMarketingPlans({onSelectPlan}:{onSelectPlan:(code:PlanCode)=>void}){
 const [plans,setPlans]=useState<PublicPlan[]>(fallback);
 useEffect(()=>{let active=true;api.get('/platform/plans',{skipBaseUrlFallback:true}).then(r=>{if(active)setPlans(validCatalog(r.data))}).catch(()=>undefined);return()=>{active=false}},[]);
 const sorted=useMemo(()=>plans.filter((plan) => plan.code !== 'GESTAO_TOTAL').sort((a,b)=>order[a.code]-order[b.code),[plans]);
 return <div className="price-grid" aria-label="Planos da GastroNexa">
 {sorted.map(plan=>{
  // Marketing only: final entitlement is always verified server-side.
  const features = plan.features;
  const detail=presentPlanBenefits(features);
  const offerPrice = plan.monthlyFee;
  const title = plan.code === 'BASICO' ? 'Entrada' : 'Avançado';
  const isFeatured = plan.code === 'PREMIUM';
  const primary=detail.sections.flatMap(s=>s.items);
  return <article className={'price-card'+(isFeatured?' featured':'')} key={plan.code}>
   {isFeatured?<span className="price-ribbon">MAIS COMPLETO</span>:null}
   <h3>{title}</h3><p className="plan-desc">{plan.description}</p>
   <div className="price"><strong>{currency(offerPrice)}</strong><span>/mês</span></div>
   <span className="trial"><Clock3 size={14}/> {plan.trialDays>0?`${plan.trialDays} dias de teste`:'Sem período de teste'}</span>
   <ul className="plan-features">
    {primary.slice(0,5).map(f=><li key={f.original}><Check size={16} aria-hidden="true"/><span>{f.title}</span></li>)}
   </ul>
   {primary.length>5 || detail.bonuses.length || detail.upcoming.length?<details>
    <summary>Ver todos os benefícios e condições</summary>
    <ul className="plan-features">
      {primary.slice(5).map(f=><li key={f.original}><Check size={15}/><span>{f.title}{f.detail?<small> — {f.detail}</small>:null}</span></li>)}
      {detail.bonuses.map(f=><li key={f.original}><Gift size={15}/><span>{f.title}{f.detail?<small className="bonus-detail"> — {f.detail}</small>:null}</span></li>)}
      {detail.upcoming.map(f=><li key={f.original}><Clock3 size={15}/><span>{f.title} (em breve)</span></li>)}
    </ul>
   </details>:null}
   <a className={isFeatured?'main-btn':'outline-btn'} href="#contato" onClick={()=>onSelectPlan(plan.code)}>Quero o {title} <ArrowRight size={16}/></a>
  </article>;
 })}
 </div>;
}
