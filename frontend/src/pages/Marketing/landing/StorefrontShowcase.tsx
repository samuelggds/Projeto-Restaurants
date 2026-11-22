import { useId, useRef, useState } from 'react';
import { Expand, X } from 'lucide-react';
import './StorefrontShowcase.css';

const storefronts = [
  { slug: 'forno-alto', name: 'Forno Alto', category: 'Pizzaria', highlight: 'Margherita de massa longa com manjericão e muçarela' },
  { slug: 'braseiro-burger', name: 'Braseiro Burger', category: 'Hamburgueria', highlight: 'Brasa Bacon com cheddar e bacon crocante' },
  { slug: 'acai-da-mata', name: 'Açaí da Mata', category: 'Açaiteria', highlight: 'Tigela de açaí com banana, morango e granola' },
  { slug: 'salvia-trattoria', name: 'Sálvia Trattoria', category: 'Restaurante', highlight: 'Tagliatelle fresco ao ragù' },
] as const;

type Storefront = (typeof storefronts)[number];
const directory = '/marketing-vitrines';
const previewSizes = '(max-width: 640px) 43vw, (max-width: 1200px) 22vw, 260px';

function CardImage({ slug }: { slug: Storefront['slug'] }) {
  return (
    <img
      src={`${directory}/${slug}-480.webp`}
      srcSet={`${directory}/${slug}-480.webp 480w, ${directory}/${slug}.webp 828w`}
      sizes={previewSizes}
      alt=""
      width={828}
      height={1700}
      loading="lazy"
      decoding="async"
    />
  );
}

export function StorefrontShowcase() {
  const [selected, setSelected] = useState<Storefront | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const headingId = useId();
  const modalTitleId = useId();

  function openStore(store: Storefront, trigger: HTMLButtonElement) {
    opener.current = trigger;
    setSelected(store);
    dialog.current?.showModal();
  }

  return (
    <section className="gx-storefronts" id="vitrines" aria-labelledby={headingId}>
      <div className="gx-storefronts__inner">
        <div className="gx-storefronts__header">
          <h2 id={headingId}>Quatro cozinhas, <em>quatro cardápios.</em></h2>
          <p>Abra uma vitrine de exemplo e veja como as fotos, as ofertas e a marca de cada casa aparecem para o cliente.</p>
        </div>
        <ul className="gx-storefronts__list">
          {storefronts.map((store) => (
            <li key={store.slug} className={`gx-storefronts__entry gx-storefronts__entry--${store.slug}`}>
              <button
                className="gx-storefronts__open"
                type="button"
                aria-haspopup="dialog"
                aria-label={`Ampliar cardápio de ${store.name}, ${store.category.toLocaleLowerCase('pt-BR')}`}
                onClick={(event) => openStore(store, event.currentTarget)}
              >
                <span className="gx-storefronts__stage" aria-hidden="true">
                  <span className="gx-storefronts__device"><CardImage slug={store.slug} /></span>
                  <span className="gx-storefronts__banner"><CardImage slug={store.slug} /></span>
                </span>
                <span className="gx-storefronts__caption">
                  <span><strong>{store.category}</strong><small>{store.name}</small></span>
                  <span className="gx-storefronts__expand"><Expand size={17} aria-hidden="true" /></span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby={modalTitleId}
        className="gx-storefronts__dialog"
        onClose={() => {
          setSelected(null);
          opener.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="gx-storefronts__sheet">
          <div className="gx-storefronts__dialog-header">
            <div><h3 id={modalTitleId}>{selected?.name}</h3><p>{selected?.category} · Cardápio de exemplo</p></div>
            <button type="button" className="gx-storefronts__close" aria-label="Fechar vitrine" onClick={() => dialog.current?.close()}>
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          {selected && (
            <div className="gx-storefronts__scroll" tabIndex={0} role="region" aria-label="Captura ampliada do cardápio">
              <img
                src={`${directory}/${selected.slug}.webp`}
                width={828}
                height={1700}
                alt={`Página inicial de ${selected.name}, com opções de entrega e retirada. Destaque: ${selected.highlight}.`}
              />
            </div>
          )}
        </div>
      </dialog>
    </section>
  );
}
