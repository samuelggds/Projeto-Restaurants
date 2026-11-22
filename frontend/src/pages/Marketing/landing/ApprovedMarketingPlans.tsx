import { useEffect, useState, useMemo } from 'react';
import { Check, Clock3, Gift } from 'lucide-react';
import api from '../../../Services/api';
import { presentPlanBenefits } from './planBenefitPresentation';

type PlanCode = 'BASICO' | 'PREMIUM' | 'GESTAO_TOTAL';
type PublicPlan = { code: PlanCode; name: string; description: string; monthlyFee: number; trialDays: number; features: string[]; featured: boolean };
const fallback: PublicPlan[] = [
  {code:'BASICO',name:'Entrada',description:'Delivery, pedidos e atendimento por QR Code de mesa.',monthlyFee:79.9,trialDays:7,featured:false,features:['Sistema de delivery','Cardápio digital com QR Code de mesa','Implantação inicial assistida','Cadastro inicial de até 50 produtos','Suporte padrão']},
  {code:'PREMIUM',name:'Avançado',description:'Tudo do Entrada, com recursos avançados e gestão assistida contínua.',monthlyFee:149.9,trialDays:15,featured:false,features:['Sistema de delivery','Cardápio digital com QR Code de mesa','Cartões NFC com comandas individuais (em homologação)','Implantação inicial assistida','Suporte prioritário','Gestão assistida contínua, inclusive com atualizações diárias sob solicitação','Domínio próprio opcional com gestão técnica pela GastroNexa','Página personalizada do restaurante opcional no domínio próprio']},
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
 const sorted=useMemo(()=>plans.filter((plan) => plan.code !== 'GESTAO_TOTAL').sort((a,b)=>order[a.code]-order[b.code]),[plans]);
 return (
   <div className="price-grid" aria-label="Planos da GastroNexa">
     {sorted.map(plan => {
       const details = presentPlanBenefits(plan.features);
       const advanced = plan.code === 'PREMIUM';
       const title = advanced ? 'Avançado' : 'Entrada';
       const sections = [...details.sections];
       if (advanced) {
         const priority = (category: string) => Number(category === 'management' || category === 'support');
         sections.sort((a, b) => priority(b.category) - priority(a.category));
       }
       const features = sections.flatMap(section => section.items);
       const visible = features.slice(0, 4);
       const remaining = features.slice(4);
       const hasConditions = remaining.length + details.bonuses.length + details.upcoming.length > 0;

       return (
         <article className={advanced ? 'price-card featured' : 'price-card'} key={plan.code}>
           <div className="plan-heading">
             <h3>{title}</h3>
             <span className="trial">
               <Clock3 size={15} aria-hidden="true" />
               {plan.trialDays > 0 ? `${plan.trialDays} dias de teste` : 'Sem período de teste'}
             </span>
           </div>
           <div className="price"><strong>{currency(plan.monthlyFee)}</strong><span>/mês</span></div>
           <p className="plan-desc">{plan.description}</p>
           <ul className="plan-features">
             {visible.map(benefit => (
               <li key={benefit.original}>
                 <Check size={16} aria-hidden="true" />
                 <span>{benefit.title}{benefit.detail && <small>{benefit.detail}</small>}</span>
               </li>
             ))}
           </ul>
           {hasConditions && (
             <details>
               <summary>Ver todos os benefícios e condições</summary>
               <ul className="plan-features">
                 {remaining.map(benefit => (
                   <li key={benefit.original}>
                     <Check size={16} aria-hidden="true" />
                     <span>{benefit.title}{benefit.detail && <small>{benefit.detail}</small>}</span>
                   </li>
                 ))}
                 {details.bonuses.map(benefit => (
                   <li key={benefit.original}>
                     <Gift size={16} aria-hidden="true" />
                     <span>{benefit.title}{benefit.detail && <small>{benefit.detail}</small>}</span>
                   </li>
                 ))}
                 {details.upcoming.map(benefit => (
                   <li key={benefit.original}>
                     <Clock3 size={16} aria-hidden="true" /><span>{benefit.title} (em breve)</span>
                   </li>
                 ))}
               </ul>
             </details>
           )}
           <a className={advanced ? 'main-btn' : 'outline-btn'} href="#contato" onClick={() => onSelectPlan(plan.code)}>
             Quero o {title}
           </a>
         </article>
       );
     })}
   </div>
 );
}
