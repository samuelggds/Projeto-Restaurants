import { useCallback, useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { approvedLandingMarkup } from './GastroNexaApprovedMarkup';
import { ApprovedPage } from './GastroNexaApprovedPage.styles';
import { SalesContactForm } from './landing/SalesContactForm';
import { ApprovedMarketingPlans } from './landing/ApprovedMarketingPlans';
import { GastroNexaInteractiveDemo } from './landing/GastroNexaInteractiveDemo';
import { RestaurantCampaignHero } from './landing/RestaurantCampaignHero';
import { StorefrontShowcase } from './landing/StorefrontShowcase';
import { RestaurantTeamPanels } from './landing/RestaurantTeamPanels';
import './landing/RestaurantCampaign.css';
import './landing/RestaurantCommercial.css';

type PlanCode = 'BASICO' | 'PREMIUM' | 'GESTAO_TOTAL' | 'UNDECIDED';
type MountTargets = { hero: Element; roles: Element; plans: Element; demo: Element };

// Keep the dangerouslySetInnerHTML prop referentially stable. React updates
// innerHTML when this object is replaced; recreating it after setMounts()
// would detach the portal targets, including the live form and plan catalog.
const stableApprovedMarkup = { __html: approvedLandingMarkup };

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
    const hero = element.querySelector('#gx-hero-root');
    const roles = element.querySelector('#gx-roles-root');
    const plans = element.querySelector('#gx-pricing-root');
    const demo = element.querySelector('#gx-interactive-demo-root');
    if (!hero || !roles || !plans || !demo) return;
    setMounts((previous) =>
      previous?.hero === hero && previous.roles === roles && previous.plans === plans && previous.demo === demo
        ? previous : { hero, roles, plans, demo },
    );
  }, []);

  useEffect(() => {
    if (mounts && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [mounts]);

  // The header is part of the static presentation markup.
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

  };

  const handleMenuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    const toggle = event.currentTarget.querySelector<HTMLButtonElement>('#mobile-toggle');
    if (toggle?.getAttribute('aria-expanded') !== 'true') return;
    toggle.click();
    toggle.focus();
  };

  return (
    <ApprovedPage className="gx-campaign">
      {/* Static, first-party presentation markup only. User input and plan data stay inside React. */}
      <div
        ref={attachApprovedMarkup}
        onClick={handleMarkupClick}
        onKeyDown={handleMenuKey}
        dangerouslySetInnerHTML={stableApprovedMarkup}
      />
      {mounts
        ? createPortal(
            <RestaurantCampaignHero showcase={<StorefrontShowcase />}>
              <SalesContactForm initialPlan={initialPlan} onPlanChange={setInitialPlan} />
            </RestaurantCampaignHero>,
            mounts.hero,
          )
        : null}
      {mounts
        ? createPortal(<ApprovedMarketingPlans onSelectPlan={setInitialPlan} />, mounts.plans)
        : null}
      {mounts ? createPortal(<GastroNexaInteractiveDemo />, mounts.demo) : null}
      {mounts ? createPortal(<RestaurantTeamPanels />, mounts.roles) : null}
    </ApprovedPage>
  );
}
