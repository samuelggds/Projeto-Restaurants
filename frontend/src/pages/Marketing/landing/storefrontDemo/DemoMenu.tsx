import { useRef, useState, type CSSProperties } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Tag,
  X,
} from 'lucide-react';
import { demoPhotoPath, demoStores, type DemoProduct, type DemoSlug } from './catalog';
import { formatPrice as money, itemCountLabel } from './demoSession';
import './DemoMenu.css';

type Props = {
  slug: DemoSlug;
  onAdd: (product: DemoProduct, quantity: number) => void;
  onBag: () => void;
  onAddress: () => void;
  onCoupon: () => void;
  addressLabel: string;
  bagCount: number;
};

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export function DemoMenu({
  slug,
  onAdd,
  onBag,
  onAddress,
  onCoupon,
  addressLabel,
  bagCount,
}: Props) {
  const store = demoStores[slug];
  const featured = store.products[0];
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [selected, setSelected] = useState<DemoProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState('');
  const container = useRef<HTMLElement | null>(null);
  const opener = useRef<string | undefined>(undefined);
  const addedBag = useRef<HTMLButtonElement | null>(null);
  const categories = ['Todos', ...new Set(store.products.map((item) => item.category))];
  const term = normalize(search.trim());
  const results = store.products.filter(
    (item) =>
      (category === 'Todos' || item.category === category) &&
      normalize(item.name + ' ' + item.description).includes(term),
  );
  const dark = slug === 'forno-alto' || slug === 'braseiro-burger';
  function showProduct(product: DemoProduct, trigger: HTMLButtonElement) {
    opener.current = trigger.dataset.product;
    setQuantity(1);
    setAdded('');
    setSelected(product);
  }
  function backToMenu() {
    const previous = opener.current;
    setSelected(null);
    requestAnimationFrame(() => {
      if (previous)
        container.current
          ?.querySelector<HTMLButtonElement>(`[data-product="${previous}"]`)
          ?.focus();
    });
  }
  return (
    <section
      ref={container}
      className="gxd-menu"
      data-palette={dark ? 'dark' : 'light'}
      style={{ '--gxd-brand': store.color } as CSSProperties}
      aria-label={`Cardápio de ${store.name}`}
    >
      {selected ? (
        <div className="gxd-product">
          <button className="gxd-back" type="button" autoFocus onClick={backToMenu}>
            <ArrowLeft size={17} /> Voltar ao cardápio
          </button>
          <img className="gxd-product-photo" src={selected.image} alt={selected.name} />
          <div className="gxd-product-info">
            <small>{selected.category}</small>
            <h3>{selected.name}</h3>
            <p>{selected.description}</p>
            <strong className="gxd-unit-price">{money(selected.price)}</strong>
            <div className="gxd-quantity">
              <span>Quantidade</span>
              <div>
                <button
                  type="button"
                  aria-label="Diminuir quantidade"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((q) => q - 1)}
                >
                  <Minus size={18} />
                </button>
                <output aria-live="polite">{quantity}</output>
                <button
                  type="button"
                  aria-label="Aumentar quantidade"
                  disabled={quantity >= 99}
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <button
              className="gxd-primary"
              type="button"
              onClick={() => {
                onAdd(selected, quantity);
                setAdded(`${quantity} × ${selected.name} na sacola.`);
                setSelected(null);
                requestAnimationFrame(() => addedBag.current?.focus());
              }}
            >
              <ShoppingBag size={18} />
              Adicionar à sacola <strong>{money(selected.price * quantity)}</strong>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="gxd-cover">
            <img src={store.cover} alt={`Página inicial de ${store.name}: ${featured.name}`} />
            <button
              className="gxd-bag"
              type="button"
              onClick={onBag}
              aria-label={`Ver sacola, ${itemCountLabel(bagCount)}`}
            >
              <ShoppingBag size={18} />
              <span>{bagCount}</span>
            </button>
          </div>
          <div className="gxd-identity">
            <img src={`${demoPhotoPath}/logo-${slug}.svg`} alt="" width="48" height="48" />
            <h3>{store.name}</h3>
            <p>
              {store.category} <span aria-hidden="true">·</span>{' '}
              <span className="gxd-open">Aberto para pedidos</span>
            </p>
          </div>
          <div className="gxd-menu-body">
            {added && (
              <div className="gxd-added">
                <span role="status">
                  <Check size={15} />
                  {added}
                </span>
                <button ref={addedBag} type="button" onClick={onBag}>
                  Ver sacola <ChevronRight size={15} />
                </button>
              </div>
            )}
            <button className="gxd-address" type="button" onClick={onAddress}>
              <MapPin size={19} />
              <span>
                <small>Entregar em</small>
                <strong>{addressLabel || 'Escolher endereço'}</strong>
              </span>
              <ChevronRight size={17} />
            </button>
            <button
              className="gxd-feature"
              type="button"
              data-product="featured"
              onClick={(e) => showProduct(featured, e.currentTarget)}
            >
              <img src={store.cover} alt="" />
              <span>
                <small>Especial da casa</small>
                <strong>{featured.name}</strong>
                <span>
                  Ver produto <ArrowRight size={15} />
                </span>
              </span>
            </button>
            <button className="gxd-coupon" type="button" onClick={onCoupon}>
              <Tag size={18} />
              <span>Cupons da loja</span>
              <ChevronRight size={16} />
            </button>
            <div className="gxd-catalog-heading">
              <h4>O que vai ser hoje?</h4>
            </div>
            <label className="gxd-search">
              <Search size={17} />
              <input
                type="search"
                placeholder="Buscar no cardápio"
                aria-label="Buscar no cardápio"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="gxd-categories" role="group" aria-label="Categorias do cardápio">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
            {results.length ? (
              <ul className="gxd-products">
                {results.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      data-product={item.id}
                      onClick={(e) => showProduct(item, e.currentTarget)}
                    >
                      <img src={item.image} alt="" width="66" height="66" loading="lazy" />
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.category}</small>
                        <b>{money(item.price)}</b>
                      </span>
                      <Plus aria-hidden="true" size={17} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="gxd-empty">
                <p>Nenhum produto encontrado.</p>
                <button
                  type="button"
                  onClick={() => {
                    setCategory('Todos');
                    setSearch('');
                  }}
                >
                  <X size={14} />
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
