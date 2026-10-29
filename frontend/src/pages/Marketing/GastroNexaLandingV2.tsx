import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { approvedLandingMarkup } from './GastroNexaApprovedMarkup';
import { ApprovedPage } from './GastroNexaApprovedPage.styles';
import { SalesContactForm } from './landing/SalesContactForm';
import { ApprovedMarketingPlans } from './landing/ApprovedMarketingPlans';
import { GastroNexaInteractiveDemo } from './landing/GastroNexaInteractiveDemo';

type PlanCode = 'BASICO' | 'PREMIUM' | 'GESTAO_TOTAL' | 'UNDECIDED';
type MountTargets = { lead: Element; plans: Element; demo: Element };

// Keep the dangerouslySetInnerHTML prop referentially stable. React updates
// innerHTML when this object is replaced; recreating it after setMounts()
// would detach both portal targets, leaving the form and plans invisible.
const stableApprovedMarkup = { __html: approvedLandingMarkup };

const descriptions: Record<string, { title: string; desc: string; note: string }> = {
  cardapio: {
    title: 'Um cardápio que valoriza seu negócio.',
    desc: 'Seu cliente escolhe produtos, personaliza o pedido e navega por um cardápio que respeita a identidade do seu restaurante.',
    note: 'Navegação prática no celular',
  },
  pedidos: {
    title: 'Cada pedido no lugar certo.',
    desc: 'Acompanhe o fluxo da operação e organize as etapas do atendimento, do recebimento à conclusão.',
    note: 'Fluxo visual para a equipe',
  },
  gestao: {
    title: 'Visão clara para decidir melhor.',
    desc: 'Reúna informações comerciais e operacionais para entender o movimento do restaurante.',
    note: 'Indicadores da sua operação',
  },
};

export default function GastroNexaLandingV2() {
  const [mounts, setMounts] = useState<MountTargets | null>(null);
  const [initialPlan, setInitialPlan] = useState<PlanCode>('UNDECIDED');

  useEffect(() => {
    document.title = 'GastroNexa | Cardápio digital, pedidos e gestão';
  }, []);

  // The approved HTML is inserted by React as one DOM subtree. Attach to the
  // subtree itself at commit time: never depend on a passive effect to find
  // the targets before mounting the live form and catalog components.
  const attachApprovedMarkup = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    const lead = element.querySelector('#gx-lead-root');
    const plans = element.querySelector('#gx-pricing-root');
    const demo = element.querySelector('#gx-interactive-demo-root');
    if (!lead || !plans || !demo) return;
    setMounts((previous) =>
      previous?.lead === lead && previous.plans === plans && previous.demo === demo
        ? previous : { lead, plans, demo },
    );
  }, []);

  // Delegated React events keep the mobile navigation and preview tabs live
  // without manipulating a separate copy of the approved static markup.
  const handleMarkupClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;
    const container = event.currentTarget;
    const nav = container.querySelector<HTMLElement>('#main-nav');
    const toggle = container.querySelector<HTMLButtonElement>('#mobile-toggle');

    if (event.target.closest('#mobile-toggle')) {
      if (!nav || !toggle) return;
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      return;
    }
    if (event.target.closest('#main-nav a')) {
      nav?.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
      toggle?.setAttribute('aria-label', 'Abrir menu');
    }

    const tab = event.target.closest<HTMLButtonElement>('[data-tab]');
    if (!tab) return;
    const name = tab.dataset.tab ?? 'cardapio';
    const description = descriptions[name];
    if (!description) return;

    container.querySelectorAll<HTMLElement>('[data-tab]').forEach((button) => {
      const active = button.dataset.tab === name;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    container.querySelectorAll<HTMLElement>('[data-pane]').forEach((pane) => {
      pane.classList.toggle('active', pane.dataset.pane === name);
    });
    const title = container.querySelector('#tab-title');
    const desc = container.querySelector('#tab-desc');
    const note = container.querySelector('#tab-note');
    if (title) title.textContent = description.title;
    if (desc) desc.textContent = description.desc;
    if (note) note.textContent = description.note;
  };

  return (
    <ApprovedPage>
      {/* Static, first-party presentation markup only. User input and plan data stay inside React. */}
      <div
        ref={attachApprovedMarkup}
        onClick={handleMarkupClick}
        dangerouslySetInnerHTML={stableApprovedMarkup}
      />
      {mounts
        ? createPortal(
            <SalesContactForm initialPlan={initialPlan} onPlanChange={setInitialPlan} />,
            mounts.lead,
          )
        : null}
      {mounts
        ? createPortal(<ApprovedMarketingPlans onSelectPlan={setInitialPlan} />, mounts.plans)
        : null}
      {mounts ? createPortal(<GastroNexaInteractiveDemo />, mounts.demo) : null}
    </ApprovedPage>
  );
}
