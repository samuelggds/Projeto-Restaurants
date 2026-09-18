import { Sparkles } from 'lucide-react';
import type { HomeProduct } from '../types';
import * as C from './HomeComboCard.styles';

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function HomeComboCard({
  combo,
  orderingLocked,
  onOpen,
}: {
  combo: HomeProduct;
  orderingLocked?: boolean;
  onOpen: (combo: HomeProduct) => void;
}) {
  const itemNames = (combo.comboGroups || [])
    .flatMap((group) => group.options)
    .map((option) => option.name)
    .filter((name, index, values) => values.indexOf(name) === index)
    .slice(0, 3);

  return (
    <C.Card>
      <div className="image">
        <img src={combo.image} alt={combo.name} loading="lazy" decoding="async" />
        <span className="badge"><Sparkles size={14} /> Combo</span>
      </div>
      <div className="content">
        <div>
          <h3>{combo.name}</h3>
          <p>{combo.description || 'Uma combinação especial preparada pelo restaurante.'}</p>
        </div>
        {itemNames.length > 0 && (
          <div className="items" aria-label="Itens do combo">
            {itemNames.map((name) => <span key={name}>{name}</span>)}
          </div>
        )}
        <footer>
          <div className="price">
            <small>A partir de</small>
            <strong>{brl(combo.price)}</strong>
          </div>
          <button
            type="button"
            disabled={!combo.available || orderingLocked}
            onClick={() => onOpen(combo)}
          >
            {orderingLocked ? 'Bloqueado' : combo.available ? 'Montar combo' : 'Indisponível'}
          </button>
        </footer>
      </div>
    </C.Card>
  );
}
