import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { approvedLandingMarkup } from './GastroNexaApprovedMarkup';
import { ApprovedPage } from './GastroNexaApprovedPage.styles';
import { SalesContactForm } from './landing/SalesContactForm';
import { ApprovedMarketingPlans } from './landing/ApprovedMarketingPlans';

type PlanCode = 'BASICO' | 'PREMIUM' | 'GESTAO_TOTAL' | 'UNDECIDED';
const descriptions: Record<string,{title:string;desc:string;note:string}> = {
 cardapio:{title:'Um cardápio que valoriza seu negócio.',desc:'Seu cliente escolhe produtos, personaliza o pedido e navega por um cardápio que respeita a identidade do seu restaurante.',note:'Navegação prática no celular'},
 pedidos:{title:'Cada pedido no lugar certo.',desc:'Acompanhe o fluxo da operação e organize as etapas do atendimento, do recebimento à conclusão.',note:'Fluxo visual para a equipe'},
 gestao:{title:'Visão clara para decidir melhor.',desc:'Reúna informações comerciais e operacionais para entender o movimento do restaurante.',note:'Indicadores da sua operação'},
};
export default function GastroNexaLandingV2(){
 const root=useRef<HTMLDivElement>(null);
 const [mounts,setMounts]=useState<{lead:Element;plans:Element}|null>(null);
 const [initialPlan,setInitialPlan]=useState<PlanCode>('UNDECIDED');
 useEffect(()=>{
  document.title='GastroNexa | Cardápio digital, pedidos e gestão';
  const host=root.current;if(!host)return;
  const lead=host.querySelector('#gx-lead-root'),plans=host.querySelector('#gx-pricing-root');
  if(lead&&plans)setMounts({lead,plans});
  const menu=host.querySelector<HTMLButtonElement>('#mobile-toggle');
  const nav=host.querySelector<HTMLElement>('#main-nav');
  const onMenu=()=>{if(!menu||!nav)return;const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open))};
  const onNav=(e:Event)=>{if(!(e.target instanceof Element)||!e.target.closest('a'))return;nav?.classList.remove('open');menu?.setAttribute('aria-expanded','false')};
  const onTabs=(event:Event)=>{
    const target=event.target instanceof Element?event.target.closest<HTMLButtonElement>('[data-tab]'):null;
    if(!target)return;
    const name=target.dataset.tab??'cardapio';
    host.querySelectorAll<HTMLElement>('[data-tab]').forEach(el=>{const active=el.dataset.tab===name;el.classList.toggle('active',active);el.setAttribute('aria-selected',String(active))});
    host.querySelectorAll<HTMLElement>('[data-pane]').forEach(el=>el.classList.toggle('active',el.dataset.pane===name));
    const value=descriptions[name];if(!value)return;
    const title=host.querySelector('#tab-title'),desc=host.querySelector('#tab-desc'),note=host.querySelector('#tab-note');
    if(title)title.textContent=value.title;if(desc)desc.textContent=value.desc;if(note)note.textContent=value.note;
  };
  menu?.addEventListener('click',onMenu);nav?.addEventListener('click',onNav);host.addEventListener('click',onTabs);
  return()=>{menu?.removeEventListener('click',onMenu);nav?.removeEventListener('click',onNav);host.removeEventListener('click',onTabs)};
 },[]);
 return <ApprovedPage ref={root}>
   {/* Only first-party immutable design markup. Forms and live plan data remain in React. */}
   <div dangerouslySetInnerHTML={{__html:approvedLandingMarkup}} />
   {mounts?createPortal(<SalesContactForm initialPlan={initialPlan} onPlanChange={setInitialPlan}/>,mounts.lead):null}
   {mounts?createPortal(<ApprovedMarketingPlans onSelectPlan={setInitialPlan}/>,mounts.plans):null}
 </ApprovedPage>;
}
