import { ArrowUpRight } from 'lucide-react';
import { RESTAURANT_TRIAL_PATH } from '../../marketingPaths';
import { demoStores, type DemoSlug } from './catalog';
import './RestaurantTrialLink.css';

export function RestaurantTrialLink({ slug }: { slug: DemoSlug }) {
  return (
    <div className="gx-store-trial">
      <span>Teste da GastroNexa</span>
      <a href={`${RESTAURANT_TRIAL_PATH}?modelo=${demoStores[slug].model}`}>
        Ativar meu restaurante <ArrowUpRight size={17} aria-hidden="true" />
      </a>
    </div>
  );
}
