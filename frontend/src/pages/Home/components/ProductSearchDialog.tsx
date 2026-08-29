import { ChevronRight, Search, ShoppingBag, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
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

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    inputRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

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
            <span>Encontre seu pedido</span>
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
            autoFocus
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
          {!normalizedQuery && (
            <EmptyState>
              <IconCircle>
                <Search size={28} />
              </IconCircle>
              <h3>O que você deseja pedir?</h3>
              <p>Digite o nome de um produto para encontrá-lo rapidamente no cardápio.</p>
            </EmptyState>
          )}

          {normalizedQuery && !results.length && (
            <EmptyState>
              <IconCircle>
                <ShoppingBag size={27} />
              </IconCircle>
              <h3>Nenhum produto encontrado</h3>
              <p>Tente buscar por outro nome ou confira a escrita do produto.</p>
            </EmptyState>
          )}

          {results.length > 0 && (
            <Results aria-label="Produtos encontrados">
              <ResultCount>
                {results.length}{' '}
                {results.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
              </ResultCount>
              {results.map((product) => (
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
                  <ProductImage src={product.image} alt="" />
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
  place-items: start center;
  padding: clamp(72px, 11vh, 128px) 20px 28px;
  background: rgba(17, 18, 18, 0.52);
  backdrop-filter: blur(8px);
`;

const Dialog = styled.section`
  width: min(720px, 100%);
  max-height: min(720px, calc(100vh - 100px));
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 24px;
  background: #fffdfb;
  box-shadow: 0 30px 80px rgba(35, 23, 15, 0.28);
  color: #211d1a;

  @media (max-width: 620px) {
    max-height: calc(100dvh - 32px);
    border-radius: 20px;
  }
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 26px 16px;

  span {
    color: var(--search-primary);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  h2 {
    margin: 4px 0 0;
    font-size: clamp(1.35rem, 3vw, 1.75rem);
    line-height: 1.15;
  }

  @media (max-width: 620px) {
    padding: 20px 18px 14px;
  }
`;

const CloseButton = styled.button`
  flex: 0 0 auto;
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid #e8e0d8;
  border-radius: 50%;
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
  margin: 0 26px 18px;
  padding: 0 15px;
  border: 1px solid #ded5cd;
  border-radius: 15px;
  background: #fff;
  color: #786e66;
  box-shadow: 0 7px 22px rgba(49, 34, 23, 0.06);

  &:focus-within {
    border-color: var(--search-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--search-primary) 14%, transparent);
    color: var(--search-primary);
  }

  input {
    min-width: 0;
    flex: 1;
    height: 52px;
    border: 0;
    outline: 0;
    background: transparent;
    color: #211d1a;
    font: inherit;
    font-size: 1rem;
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
    border-radius: 50%;
    background: #f5f0eb;
    color: #655b54;
    cursor: pointer;
  }

  @media (max-width: 620px) {
    margin: 0 18px 14px;
  }
`;

const Content = styled.div`
  min-height: 250px;
  max-height: min(530px, calc(100vh - 265px));
  overflow-y: auto;
  padding: 0 26px 26px;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--search-primary) 40%, #ddd) transparent;

  @media (max-width: 620px) {
    min-height: 210px;
    max-height: calc(100dvh - 210px);
    padding: 0 18px 20px;
  }
`;

const EmptyState = styled.div`
  display: grid;
  min-height: 245px;
  place-items: center;
  align-content: center;
  padding: 28px;
  border: 1px dashed #dfd5cc;
  border-radius: 18px;
  background: linear-gradient(145deg, #fff 0%, #fbf6f1 100%);
  text-align: center;

  h3 {
    margin: 15px 0 6px;
    font-size: 1.05rem;
  }

  p {
    max-width: 410px;
    margin: 0;
    color: #756b63;
    font-size: 0.91rem;
    line-height: 1.55;
  }
`;

const IconCircle = styled.div`
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 18px;
  background: color-mix(in srgb, var(--search-primary) 11%, #fff);
  color: var(--search-primary);
`;

const Results = styled.div`
  display: grid;
  gap: 10px;
`;

const ResultCount = styled.p`
  margin: 0 0 2px;
  color: #786f68;
  font-size: 0.78rem;
  font-weight: 700;
`;

const ResultButton = styled.button`
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) 38px;
  align-items: center;
  gap: 15px;
  width: 100%;
  padding: 10px;
  border: 1px solid #e8dfd7;
  border-radius: 17px;
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
    grid-template-columns: 70px minmax(0, 1fr) 32px;
    gap: 11px;
    border-radius: 15px;
  }
`;

const ProductImage = styled.img`
  width: 92px;
  height: 78px;
  border-radius: 12px;
  object-fit: cover;
  background: #eee8e2;

  @media (max-width: 620px) {
    width: 70px;
    height: 68px;
  }
`;

const ProductInfo = styled.span`
  min-width: 0;

  h3 {
    overflow: hidden;
    margin: 0 0 4px;
    font-size: 1rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  p {
    display: -webkit-box;
    overflow: hidden;
    margin: 0 0 7px;
    color: #766c65;
    font-size: 0.82rem;
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
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 50%;
  background: color-mix(in srgb, var(--search-primary) 10%, #fff);
  color: var(--search-primary);
  transition:
    color 160ms ease,
    background 160ms ease;

  @media (max-width: 620px) {
    width: 32px;
    height: 32px;
  }
`;
