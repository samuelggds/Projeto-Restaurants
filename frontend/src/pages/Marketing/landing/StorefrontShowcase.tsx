import { lazy, Suspense, useId, useReducer, useRef, useState, type CSSProperties } from 'react';
import { Expand, X } from 'lucide-react';
import { demoStores, type DemoSlug } from './storefrontDemo/catalog';
import { initialDemoSessions, updateDemoSession } from './storefrontDemo/demoSession';
import './StorefrontShowcase.css';

const StorefrontExperience = lazy(() => import('./storefrontDemo/StorefrontExperience')
  .then(module => ({ default: module.StorefrontExperience })));
const storefronts = Object.values(demoStores);
const directory = '/marketing-vitrines';
const previewSizes = '(max-width: 640px) 43vw, (max-width: 1200px) 22vw, 260px';

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
  const [sessions, dispatch] = useReducer(updateDemoSession, undefined, () => initialDemoSessions());
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const headingId = useId();
  const modalTitleId = useId();

  function openStore(slug: DemoSlug, trigger: HTMLButtonElement) {
    opener.current = trigger;
    setSelected(slug);
    dialog.current?.showModal();
  }

  return (
    <section className="gx-storefronts" id="vitrines" aria-labelledby={headingId}>
      <div className="gx-storefronts__inner">
        <div className="gx-storefronts__header">
          <h2 id={headingId}>Quatro cozinhas, <em>quatro cardápios.</em></h2>
          <p>Escolha uma loja, monte sua sacola e acompanhe a entrega. Você pode testar o pedido inteiro com dados fictícios.</p>
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
          opener.current?.focus({ preventScroll: true });
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="gx-storefronts__sheet" style={selected ? { '--demo-accent': demoStores[selected].color } as CSSProperties : undefined}>
          <div className="gx-storefronts__dialog-header">
            <div><h3 id={modalTitleId}>{selected && demoStores[selected].name}</h3><p>Demonstração interativa · pedidos e pagamentos fictícios</p></div>
            <button type="button" className="gx-storefronts__close" aria-label="Fechar vitrine" onClick={() => dialog.current?.close()}>
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          {selected && (
            <Suspense fallback={<p role="status">Abrindo o cardápio…</p>}>
              <StorefrontExperience key={selected} slug={selected} session={sessions[selected]} dispatch={dispatch} />
            </Suspense>
          )}
        </div>
      </dialog>
    </section>
  );
}
