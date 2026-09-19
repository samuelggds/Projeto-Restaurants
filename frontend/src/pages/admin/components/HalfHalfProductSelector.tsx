import { Trash2 } from 'lucide-react';
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
    <fieldset className="group-options">
      <legend>
        <span>Produtos disponíveis · {group.options.length} selecionado(s)</span>
      </legend>

      <p className="group-options-hint">
        Escolha um produto por vez. Você pode usar este seletor quantas vezes quiser. O preço é
        sempre lido do produto cadastrado.
      </p>

      <S.Field $full>
        Adicionar produto ao meio a meio
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
          <option value="">Selecione um produto</option>
          {availableProducts.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name} — {money(Number(candidate.price || 0))}
            </option>
          ))}
        </select>
      </S.Field>

      <div className="configured-option-list">
        {group.options
          .filter((option) => option.referenceProductId)
          .map((option) => {
            const linkedProduct = products.find(
              (candidate) => Number(candidate.id) === Number(option.referenceProductId),
            );
            return (
              <article key={option.referenceProductId}>
                <div className="configured-option-title">
                  <span>
                    <b>{linkedProduct?.name || 'Produto indisponível'}</b>
                    <small>
                      {linkedProduct
                        ? `Preço atual: ${money(Number(linkedProduct.price || 0))}`
                        : 'O produto vinculado não está mais disponível.'}
                    </small>
                  </span>
                </div>
                <button
                  className="remove-group"
                  type="button"
                  onClick={() => removeProduct(Number(option.referenceProductId))}
                >
                  <Trash2 /> Remover
                </button>
              </article>
            );
          })}
      </div>

      {!group.options.some((option) => option.referenceProductId) && (
        <div className="source-category-empty">Adicione pelo menos uma pizza cadastrada.</div>
      )}
    </fieldset>
  );
}
