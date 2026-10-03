import {
  ArrowLeft,
  Clock3,
  ShieldCheck,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { QuantityStepper } from '../../../components/QuantityStepper/QuantityStepper';
import type { HomeProduct } from '../types';
import * as S from './ReadyProductDetail.styles';

const money = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatPreparationTime(value?: number | string) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const normalized = raw.replace(/^(?:entrega|preparo)\s+em\s+/i, '').trim();
  if (/\b(?:min|minuto|minutos|h|hora|horas)\b/i.test(normalized)) return normalized;

  if (/^\d+(?:\s*(?:[-–—]|a)\s*\d+)?$/i.test(normalized)) {
    return `${normalized.replace(/\s*[-–—]\s*/g, '-')} min`;
  }

  return normalized;
}

function productComposition(product: HomeProduct) {
  const names = [
    ...(product.compositionItems || [])
      .filter((item) => item.active !== false)
      .map((item) => String(item.name || '').trim()),
    ...(product.ingredients || []).map((item) => String(item.name || '').trim()),
  ].filter(Boolean);

  return Array.from(new Set(names));
}

type ReadyProductDetailProps = {
  product: HomeProduct;
  restaurantName: string;
  restaurantCategory?: string;
  categoryName?: string;
  preparationTime?: number;
  cartCount?: number;
  onBack: () => void;
  onOpenCart?: () => void;
  onConfirm: (input: {
    quantity: number;
    observation: string;
    sourceElement: HTMLElement | null;
  }) => void;
};

export function ReadyProductDetail({
  product,
  restaurantName,
  restaurantCategory,
  categoryName,
  preparationTime,
  cartCount = 0,
  onBack,
  onOpenCart,
  onConfirm,
}: ReadyProductDetailProps) {
  const [quantity, setQuantity] = useState(1);
  const [observation, setObservation] = useState('');
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const formattedPreparationTime = formatPreparationTime(preparationTime);
  const composition = useMemo(() => productComposition(product), [product]);
  const total = Number(product.price || 0) * quantity;

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const frame = window.requestAnimationFrame(() => backButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [onBack]);

  const confirm = (sourceElement: HTMLElement | null) => {
    onConfirm({
      quantity,
      observation: observation.trim(),
      sourceElement,
    });
  };

  return createPortal(
    <S.Screen
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${product.name}`}
      data-ready-product-detail
    >
      <S.DesktopHeader>
        <span className="spacer" aria-hidden="true" />
        <div className="brand">
          <strong>{restaurantName}</strong>
          <small>
            {[restaurantCategory, formattedPreparationTime ? `preparo em ${formattedPreparationTime}` : '']
              .filter(Boolean)
              .join(' · ')}
          </small>
        </div>
        <div className="actions">
          <button ref={backButtonRef} type="button" className="back" onClick={onBack}>
            <ArrowLeft aria-hidden="true" /> Voltar ao cardápio
          </button>
          <button
            type="button"
            className="cart"
            aria-label={`Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
            onClick={onOpenCart}
            disabled={!onOpenCart}
          >
            <ShoppingBag aria-hidden="true" />
            <span>Carrinho</span>
            {cartCount > 0 ? <i>{cartCount}</i> : null}
          </button>
        </div>
      </S.DesktopHeader>

      <S.Layout>
        <S.Hero>
          {product.image ? (
            <img src={product.image} alt={product.name} />
          ) : (
            <div className="fallback" aria-hidden="true">
              <UtensilsCrossed />
            </div>
          )}

          <S.MobileActions>
            <button ref={backButtonRef} type="button" className="back" onClick={onBack}>
              <ArrowLeft aria-hidden="true" />
              <span>Cardápio</span>
            </button>
            <button
              type="button"
              className="cart"
              aria-label={`Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
              onClick={onOpenCart}
              disabled={!onOpenCart}
            >
              <ShoppingBag aria-hidden="true" />
              {cartCount > 0 ? <i>{cartCount}</i> : null}
            </button>
          </S.MobileActions>

          <div className="hero-copy">
            <small>PRONTO PARA PEDIR</small>
            <strong>{product.name}</strong>
            {product.description ? <p>{product.description}</p> : null}
          </div>

          <div className="mobile-brand">
            <strong>{restaurantName}</strong>
            {restaurantCategory ? <small>{restaurantCategory}</small> : null}
          </div>
        </S.Hero>

        <S.ProductPanel>
          <div className="eyebrow-row">
            <span className="ready"><i /> PRONTO PARA PEDIR</span>
            {categoryName ? <small>{categoryName}</small> : null}
          </div>

          <div className="title-row">
            <h1>{product.name}</h1>
            <S.Price>
              {product.promotion?.active &&
              Number(product.originalPrice) > Number(product.price) ? (
                <del>{money(product.originalPrice)}</del>
              ) : null}
              <strong>{money(product.price)}</strong>
            </S.Price>
          </div>

          {product.description ? <p className="description">{product.description}</p> : null}

          {composition.length || formattedPreparationTime ? (
            <S.Facts $single={!composition.length || !formattedPreparationTime}>
              {composition.length ? (
                <article className="composition">
                  <UtensilsCrossed aria-hidden="true" />
                  <span>
                    <small>COMPOSIÇÃO</small>
                    <strong>{composition.join(', ')}</strong>
                  </span>
                </article>
              ) : null}
              {formattedPreparationTime ? (
                <article>
                  <Clock3 aria-hidden="true" />
                  <span>
                    <small>PREPARO ESTIMADO</small>
                    <strong>{formattedPreparationTime}</strong>
                  </span>
                </article>
              ) : null}
            </S.Facts>
          ) : null}

          <S.Observation>
            <span className="label-row">
              <b>Alguma observação?</b>
              <small>OPCIONAL</small>
            </span>
            <textarea
              maxLength={240}
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
              placeholder="Ex.: retirar um ingrediente, embalar separado..."
            />
          </S.Observation>

          <S.BottomAction>
            <S.Quantity>
              <QuantityStepper
                value={quantity}
                ariaLabel="Quantidade do produto"
                decreaseLabel="Diminuir quantidade"
                increaseLabel="Aumentar quantidade"
                decreaseDisabled={quantity <= 1}
                onDecrease={() => setQuantity((current) => Math.max(1, current - 1))}
                onIncrease={() => setQuantity((current) => current + 1)}
              />
            </S.Quantity>

            <S.AddButton
              type="button"
              data-cart-fly-source="dialog"
              onClick={(event) => confirm(event.currentTarget)}
            >
              <span>Adicionar ao carrinho</span>
              <strong>— {money(total)}</strong>
            </S.AddButton>
          </S.BottomAction>

          <S.Assurance>
            <ShieldCheck aria-hidden="true" />
            <span>Você poderá revisar o pedido no carrinho antes de finalizar.</span>
          </S.Assurance>
        </S.ProductPanel>
      </S.Layout>
    </S.Screen>,
    document.body,
  );
}
