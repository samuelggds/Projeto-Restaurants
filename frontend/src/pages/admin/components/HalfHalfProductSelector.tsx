import { ImageOff, Trash2 } from 'lucide-react';
import * as S from '../Admin.styles';
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
      !selectedProductIds.has(Number(candidate.id)),
  );

  return (
    <fieldset className="group-options half-half-products">
      <legend>
        <span>Produtos desta opção · {group.options.length} selecionado(s)</span>
      </legend>

      <p className="group-options-hint">
        Adicione somente os produtos que deverão aparecer nesta etapa. Cada etapa é configurada
        separadamente e o preço sempre vem do produto cadastrado.
      </p>

      <div className="half-half-product-picker">
        <S.Field $full>
          Adicionar produto
          <select
            aria-label="Adicionar produto ao meio a meio"
            defaultValue=""
            onChange={(event) => {
              const referenceProductId = Number(event.target.value);
              if (!referenceProductId) return;
              addProduct(referenceProductId);
              event.currentTarget.value = '';
            }}
          >
            <option value="">Selecione um produto cadastrado</option>
            {availableProducts.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name} — {money(Number(candidate.price || 0))}
              </option>
            ))}
          </select>
        </S.Field>
      </div>

      <div className="half-half-product-list">
        {group.options
          .filter((option) => option.referenceProductId)
          .map((option) => {
            const linkedProduct = products.find(
              (candidate) => Number(candidate.id) === Number(option.referenceProductId),
            );
            const image = String(linkedProduct?.image || '').trim();

            return (
              <article className="half-half-product-card" key={option.referenceProductId}>
                <div className="half-half-product-image">
                  {image ? (
                    <img src={image} alt="" loading="lazy" />
                  ) : (
                    <span aria-hidden="true">
                      <ImageOff />
                    </span>
                  )}
                </div>

                <div className="half-half-product-copy">
                  <b>{linkedProduct?.name || 'Produto indisponível'}</b>
                  <small>
                    {linkedProduct
                      ? `Preço atual: ${money(Number(linkedProduct.price || 0))}`
                      : 'O produto vinculado não está mais disponível.'}
                  </small>
                </div>

                <button
                  className="half-half-product-remove"
                  type="button"
                  aria-label={`Remover ${linkedProduct?.name || 'produto'}`}
                  onClick={() => removeProduct(Number(option.referenceProductId))}
                >
                  <Trash2 />
                  <span>Remover</span>
                </button>
              </article>
            );
          })}
      </div>

      {!group.options.some((option) => option.referenceProductId) && (
        <div className="source-category-empty">
          Nenhum produto adicionado nesta etapa. Escolha um produto acima para começar.
        </div>
      )}
    </fieldset>
  );
}
