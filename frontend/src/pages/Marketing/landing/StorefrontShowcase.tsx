import { useId, useRef, useState } from 'react';
import { Expand, SunMoon, X } from 'lucide-react';
import { demoStores, toggleStorefrontTheme, type DemoSlug } from './storefrontDemo/catalog';
import { RestaurantTrialLink } from './storefrontDemo/RestaurantTrialLink';
import './StorefrontShowcase.css';

const storefronts = Object.values(demoStores);
const directory = '/marketing-vitrines';
const previewSizes = '(max-width: 640px) 43vw, (max-width: 1200px) 22vw, 260px';
const storefrontPreview = '/help-preview.html?view=storefront';

function CardImage({ slug }: { slug: DemoSlug }) {
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
  const [selected, setSelected] = useState<DemoSlug | null>(null);
  // Keep one document alive so switching restaurants preserves each demo bag and theme.
  const [firstStore, setFirstStore] = useState<DemoSlug | null>(null);
  const [frameUnavailable, setFrameUnavailable] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const headingId = useId();
  const modalTitleId = useId();

  function openStore(slug: DemoSlug, trigger: HTMLButtonElement) {
    opener.current = trigger;
    setFrameUnavailable(false);
    setFirstStore((first) => first ?? slug);
    setSelected(slug);
    selectFrameStore(slug);
    dialog.current?.showModal();
  }

  function selectFrameStore(slug: DemoSlug | null) {
    const location = frame.current?.contentDocument?.location;
    if (!location || location.pathname + location.search !== storefrontPreview) return;
    const nextSlug = slug ?? '';
    if (location.hash.slice(1) !== nextSlug) location.replace(`${storefrontPreview}#${nextSlug}`);
  }

  return (
    <section className="gx-storefronts" id="vitrines" aria-labelledby={headingId}>
      <div className="gx-storefronts__inner">
        <div className="gx-storefronts__header">
          <h2 id={headingId}>Quatro cozinhas, <em>quatro cardápios.</em></h2>
          <p>Escolha uma loja e experimente um pedido com dados fictícios, da sacola à entrega. Em qualquer cardápio, você pode começar a ativação do seu restaurante para o teste gratuito.</p>
        </div>
        <ul className="gx-storefronts__list">
          {storefronts.map((store) => (
            <li key={store.slug} className={`gx-storefronts__entry gx-storefronts__entry--${store.slug}`}>
              <button
                className="gx-storefronts__open"
                type="button"
                aria-haspopup="dialog"
                aria-label={`Experimentar cardápio de ${store.name}, ${store.category.toLocaleLowerCase('pt-BR')}`}
                onClick={(event) => openStore(store.slug, event.currentTarget)}
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
          selectFrameStore(null);
          opener.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="gx-storefronts__sheet">
          <div className="gx-storefronts__dialog-header">
            <div><h3 id={modalTitleId}>{selected && demoStores[selected].name}</h3><p>Demonstração com dados fictícios</p></div>
            <button type="button" className="gx-storefronts__close gx-storefronts__theme" disabled={frameUnavailable}
              aria-label="Alternar tema claro e escuro da vitrine" title="Alternar tema claro e escuro"
              onClick={() => frame.current?.contentDocument?.dispatchEvent(new Event(toggleStorefrontTheme))}>
              <SunMoon size={20} aria-hidden="true" />
            </button>
            <button type="button" className="gx-storefronts__close" aria-label="Fechar vitrine" onClick={() => dialog.current?.close()}>
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          {firstStore && (
            <iframe
              ref={frame}
              title="Telas do cliente"
              src={`${storefrontPreview}#${firstStore}`}
              sandbox="allow-same-origin allow-scripts allow-forms"
              onLoad={(event) => {
                const document = event.currentTarget.contentDocument;
                if (!document?.documentElement.dataset.previewViews?.split(' ').includes('storefront')) {
                  setFrameUnavailable(true);
                  setFirstStore(null);
                  return;
                }
                selectFrameStore(selected);
              }}
            />
          )}
          {frameUnavailable && selected && (
            <div className="gx-storefronts__unavailable" role="status">
              <p>O cardápio de {demoStores[selected].name} não abriu nesta janela.</p>
              <a href={`/vitrine-demo.html#${selected}`} target="_blank" rel="noopener noreferrer">
                Abrir cardápio em nova aba
              </a>
            </div>
          )}
          {selected && <RestaurantTrialLink slug={selected} />}
        </div>
      </dialog>
    </section>
  );
}
