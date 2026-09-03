import { ChevronRight, Search, SearchX, ShoppingBag, X } from 'lucide-react';
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes } from 'styled-components';
import type { HomeProduct } from '../types';

type ProductSearchDialogProps = {
  open: boolean;
  products: HomeProduct[];
  primaryColor: string;
  onClose: () => void;
  onSelect: (product: HomeProduct) => void;
};

const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const revealBackdrop = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const revealDialog = keyframes`
  from {
    opacity: 0;
    transform: translate3d(0, 14px, 0) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
`;

export function ProductSearchDialog({
  open,
  products,
  primaryColor,
  onClose,
  onSelect,
}: ProductSearchDialogProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = normalizeSearchText(query);
  const results = useMemo(() => {
    if (!normalizedQuery) return [];
    return products.filter((product) =>
      normalizeSearchText(product.name).includes(normalizedQuery),
    );
  }, [normalizedQuery, products]);
  const suggestedProducts = useMemo(
    () => products.filter((product) => product.available !== false).slice(0, 5),
    [products],
  );
  const visibleProducts = normalizedQuery ? results : suggestedProducts;
  const closeFromEffect = useEffectEvent(onClose);

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeFromEffect();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    inputRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <Backdrop
      $primary={primaryColor}
      data-testid="product-search-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <Dialog
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-search-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <Header>
          <div>
            <span>Pesquisa rápida</span>
            <h2 id="product-search-title">Buscar no cardápio</h2>
          </div>
          <CloseButton type="button" aria-label="Fechar busca" onClick={onClose}>
            <X size={21} />
          </CloseButton>
        </Header>

        <SearchField>
          <Search size={21} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            autoComplete="off"
            aria-label="Pesquisar produto pelo nome"
            placeholder="Digite o nome do produto..."
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button type="button" aria-label="Limpar busca" onClick={() => setQuery('')}>
              <X size={17} />
            </button>
          )}
        </SearchField>

        <Content aria-live="polite">
          {!normalizedQuery && !visibleProducts.length && (
            <EmptyState>
              <IconCircle>
                <ShoppingBag size={23} />
              </IconCircle>
              <span>
                <h3>Cardápio indisponível</h3>
                <p>Os produtos aparecerão aqui assim que estiverem disponíveis.</p>
              </span>
            </EmptyState>
          )}

          {normalizedQuery && !results.length && (
            <EmptyState>
              <IconCircle>
                <SearchX size={23} />
              </IconCircle>
              <span>
                <h3>Nenhum produto encontrado</h3>
                <p>Tente outro nome ou limpe a pesquisa para ver as sugestões.</p>
              </span>
            </EmptyState>
          )}

          {visibleProducts.length > 0 && (
            <Results
              aria-label={normalizedQuery ? 'Produtos encontrados' : 'Sugestões do cardápio'}
            >
              <ResultCount>
                {normalizedQuery
                  ? `${results.length} ${results.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`
                  : 'Sugestões do cardápio'}
              </ResultCount>
              {visibleProducts.map((product) => (
                <ResultButton
                  key={product.id}
                  type="button"
                  aria-label={`Ver ${product.name}`}
                  onClick={() => onSelect(product)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    onSelect(product);
                  }}
                >
                  <ProductImage src={product.image} alt="" loading="lazy" decoding="async" />
                  <ProductInfo>
                    <h3>{product.name}</h3>
                    <p>{product.description || 'Confira os detalhes e escolha como deseja.'}</p>
                    <Price>
                      {product.promotion?.active && product.originalPrice > product.price && (
                        <del>{brl(product.originalPrice)}</del>
                      )}
                      <strong>{brl(product.price)}</strong>
                    </Price>
                  </ProductInfo>
                  <ChevronCircle aria-hidden="true">
                    <ChevronRight size={19} />
                  </ChevronCircle>
                </ResultButton>
              ))}
            </Results>
          )}
        </Content>
      </Dialog>
    </Backdrop>,
    document.body,
  );
}

const Backdrop = styled.div<{ $primary: string }>`
  --search-primary: ${(props) => props.$primary || '#d64d08'};
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(17, 18, 18, 0.58);
  backdrop-filter: blur(6px);
  animation: ${revealBackdrop} 180ms ease-out both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 620px) {
    align-items: end;
    padding: 8px;
  }
`;

const Dialog = styled.section`
  width: min(640px, 100%);
  max-height: min(680px, calc(100dvh - 40px));
  overflow: hidden;
  border: 1px solid #e6ddd5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 24px 70px rgba(22, 18, 15, 0.3);
  color: #211d1a;
  animation: ${revealDialog} 280ms cubic-bezier(0.22, 1, 0.36, 1) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 620px) {
    max-height: calc(100dvh - 16px);
    border-radius: 8px;
  }
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 20px 12px;

  span {
    color: var(--search-primary);
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  h2 {
    margin: 2px 0 0;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.45rem;
    line-height: 1.15;
  }

  @media (max-width: 620px) {
    padding: 14px 14px 10px;

    h2 {
      font-size: 1.25rem;
    }
  }
`;

const CloseButton = styled.button`
  flex: 0 0 auto;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid #e8e0d8;
  border-radius: 8px;
  background: #fff;
  color: #332c27;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    border-color: var(--search-primary);
    color: var(--search-primary);
    outline: none;
  }
`;

const SearchField = styled.label`
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 0 20px 12px;
  padding: 0 12px;
  border: 1px solid #ded5cd;
  border-radius: 8px;
  background: #fbfaf8;
  color: #786e66;

  &:focus-within {
    border-color: var(--search-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--search-primary) 14%, transparent);
    color: var(--search-primary);
  }

  input {
    min-width: 0;
    flex: 1;
    height: 46px;
    border: 0;
    outline: 0;
    background: transparent;
    color: #211d1a;
    font: inherit;
    font-size: 0.94rem;
  }

  input::placeholder {
    color: #9b928b;
  }

  input::-webkit-search-cancel-button {
    display: none;
  }

  button {
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border: 0;
    border-radius: 6px;
    background: #f5f0eb;
    color: #655b54;
    cursor: pointer;
  }

  @media (max-width: 620px) {
    margin: 0 14px 10px;
  }
`;

const Content = styled.div`
  min-height: 132px;
  max-height: min(500px, calc(100dvh - 190px));
  overflow-y: auto;
  padding: 0 20px 18px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--search-primary) 40%, #ddd) transparent;

  @media (max-width: 620px) {
    min-height: 124px;
    max-height: calc(100dvh - 158px);
    padding: 0 14px 14px;
  }
`;

const EmptyState = styled.div`
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  min-height: 124px;
  align-content: center;
  align-items: center;
  gap: 14px;
  padding: 18px 12px;
  border-block: 1px solid #eee8e2;
  text-align: left;

  h3 {
    margin: 0 0 4px;
    font-size: 0.98rem;
  }

  p {
    margin: 0;
    color: #756b63;
    font-size: 0.82rem;
    line-height: 1.4;
  }
`;

const IconCircle = styled.div`
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 8px;
  background: color-mix(in srgb, var(--search-primary) 11%, #fff);
  color: var(--search-primary);
`;

const Results = styled.div`
  display: grid;
  gap: 6px;
`;

const ResultCount = styled.p`
  margin: 2px 0 4px;
  color: #786f68;
  font-size: 0.78rem;
  font-weight: 700;
`;

const ResultButton = styled.button`
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) 24px;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px;
  border: 1px solid #e8dfd7;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;

  &:hover,
  &:focus-visible {
    border-color: color-mix(in srgb, var(--search-primary) 55%, #e8dfd7);
    outline: none;
    box-shadow: 0 10px 28px rgba(48, 31, 19, 0.09);
    transform: translateY(-1px);
  }

  &:hover > span:last-child,
  &:focus-visible > span:last-child {
    background: var(--search-primary);
    color: #fff;
  }

  @media (max-width: 620px) {
    grid-template-columns: 58px minmax(0, 1fr) 20px;
    gap: 9px;
  }
`;

const ProductImage = styled.img`
  width: 76px;
  height: 64px;
  border-radius: 6px;
  object-fit: cover;
  background: #eee8e2;

  @media (max-width: 620px) {
    width: 58px;
    height: 56px;
  }
`;

const ProductInfo = styled.span`
  min-width: 0;

  h3 {
    overflow: hidden;
    margin: 0 0 4px;
    font-size: 0.92rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    display: -webkit-box;
    overflow: hidden;
    margin: 0 0 5px;
    color: #766c65;
    font-size: 0.76rem;
    line-height: 1.35;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
`;

const Price = styled.span`
  display: flex;
  align-items: baseline;
  gap: 7px;

  del {
    color: #9b928b;
    font-size: 0.72rem;
  }

  strong {
    color: var(--search-primary);
    font-size: 0.91rem;
  }
`;

const ChevronCircle = styled.span`
  display: grid;
  width: 24px;
  height: 32px;
  place-items: center;
  color: var(--search-primary);
  transition:
    color 160ms ease,
    background 160ms ease;

  @media (max-width: 620px) {
    width: 20px;
  }
`;
