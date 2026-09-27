import { Plus } from 'lucide-react';
import type { HomeProduct } from '../Home/types';
import * as S from './TableMenuExperience.styles';

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type ProductCardProps = {
  product: HomeProduct;
  disabled: boolean;
  onOpen: () => void;
  onAdd: () => void;
};

export function FigmaComboCard({
  product,
  disabled,
  onOpen,
  onAdd,
}: ProductCardProps) {
  return (
    <S.ComboCard $hasImage={Boolean(product.image)}>
      <button
        className="main"
        type="button"
        disabled={disabled}
        aria-label={`Ver detalhes de ${product.name}`}
        onClick={onOpen}
      />
      {product.image ? (
        <div className="media">
          <img src={product.image} alt={product.name} />
        </div>
      ) : null}
      <div className="copy">
        <h3>{product.name}</h3>
        {product.description ? <p>{product.description}</p> : null}
        <strong className="price">{brl(product.price)}</strong>
      </div>
      <button
        className="add"
        type="button"
        disabled={disabled}
        aria-label={`Adicionar ${product.name}`}
        onClick={onAdd}
      >
        <Plus size={20} />
      </button>
    </S.ComboCard>
  );
}

export function FigmaCatalogCard({
  product,
  disabled,
  onOpen,
  onAdd,
}: ProductCardProps) {
  return (
    <S.CatalogCard $hasImage={Boolean(product.image)}>
      <button
        className="main"
        type="button"
        disabled={disabled}
        aria-label={`Ver detalhes de ${product.name}`}
        onClick={onOpen}
      />
      {product.image ? (
        <div className="media">
          <img src={product.image} alt={product.name} />
        </div>
      ) : null}
      <div className="copy">
        <h3>{product.name}</h3>
        {product.description ? <p>{product.description}</p> : null}
        {product.promotion?.active && product.originalPrice > product.price ? (
          <span className="original">{brl(product.originalPrice)}</span>
        ) : null}
        <strong className="price">{brl(product.price)}</strong>
      </div>
      <button
        className="add"
        type="button"
        disabled={disabled}
        aria-label={`Adicionar ${product.name}`}
        onClick={onAdd}
      >
        <Plus size={17} />
      </button>
    </S.CatalogCard>
  );
}
