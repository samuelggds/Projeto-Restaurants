import { ChevronDown, ImageOff, Plus, Trash2 } from 'lucide-react';
import { ProductSelector } from '../styles/HalfHalfProductSelector.styles';
import type { AdminProduct, AdminProductOptionGroup } from '../types';

type HalfHalfProductSelectorProps = {
  products: AdminProduct[];
  group: AdminProductOptionGroup;
  addProduct: (referenceProductId: number) => void;
  removeProduct: (referenceProductId: number) => void;
};

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function HalfHalfProductSelector({
  products,
  group,
  addProduct,
  removeProduct,
}: HalfHalfProductSelectorProps) {
  const selectedProductIds = new Set(
    group.options.flatMap((option) =>
      option.referenceProductId ? [Number(option.referenceProductId)] : [],
    ),
  );

  const availableProducts = products.filter(
    (candidate) =>
      candidate.active !== false &&
      candidate.kind !== 'COMBO' &&
      candidate.pricingMode !== 'HIGHEST_OPTION' &&
      !selectedProductIds.has(Number(candidate.id)),
  );

  return (
    <ProductSelector className="half-half-products">
      <legend>
        Produtos desta opção
        <span className="selection-count">{selectedProductIds.size} selecionado(s)</span>
      </legend>

      <p className="product-selector-hint">
        Escolha os produtos desta etapa. Os preços acompanham o cadastro do cardápio.
      </p>

      <div className="half-half-product-picker">
        <label>
          <span className="product-picker-label">Adicionar produto</span>
          <div className="product-picker-control">
            <Plus aria-hidden="true" />
            <select
              aria-label="Adicionar produto ao meio a meio"
              defaultValue=""
              disabled={!availableProducts.length}
              onChange={(event) => {
                const referenceProductId = Number(event.target.value);
                if (!referenceProductId) return;
                addProduct(referenceProductId);
                event.currentTarget.value = '';
              }}
            >
              <option value="">
                {availableProducts.length
                  ? 'Selecione um produto cadastrado'
                  : 'Nenhum outro produto disponível'}
              </option>
              {availableProducts.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name} — {money(Number(candidate.price || 0))}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" />
          </div>
        </label>
      </div>

      <ul className="half-half-product-list" aria-label="Produtos selecionados nesta etapa">
        {group.options
          .filter((option) => option.referenceProductId)
          .map((option) => {
            const linkedProduct = products.find(
              (candidate) => Number(candidate.id) === Number(option.referenceProductId),
            );
            const image = String(linkedProduct?.image || '').trim();

            return (
              <li className="half-half-product-card" key={option.referenceProductId}>
                <div className="half-half-product-image" aria-hidden="true">
                  <span>
                    <ImageOff />
                  </span>
                  {image && (
                    <img
                      key={image}
                      src={image}
                      alt=""
                      width={48}
                      height={48}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.hidden = true;
                      }}
                    />
                  )}
                </div>

                <div className="half-half-product-copy">
                  <b title={linkedProduct?.name}>{linkedProduct?.name || 'Produto indisponível'}</b>
                  {linkedProduct ? (
                    <div className="half-half-product-price">
                      <strong>{money(Number(linkedProduct.price || 0))}</strong>
                      <small>Preço atual</small>
                    </div>
                  ) : (
                    <small>O produto vinculado não está mais disponível.</small>
                  )}
                </div>

                <button
                  className="half-half-product-remove"
                  type="button"
                  aria-label={`Remover ${linkedProduct?.name || 'produto'}`}
                  onClick={() => removeProduct(Number(option.referenceProductId))}
                >
                  <Trash2 aria-hidden="true" />
                  <span>Remover</span>
                </button>
              </li>
            );
          })}
      </ul>

      {!group.options.some((option) => option.referenceProductId) && (
        <div className="product-selector-empty">
          Nenhum produto adicionado nesta etapa. Escolha um produto acima para começar.
        </div>
      )}
    </ProductSelector>
  );
}
