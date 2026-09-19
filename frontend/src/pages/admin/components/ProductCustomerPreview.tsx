import { Eye, PackageOpen, ShoppingBag } from 'lucide-react';
import * as S from '../Admin.styles';
import type { AdminIngredient, AdminProduct, AdminProductOptionGroup } from '../types';
import {
  customerOptionPrice,
  customerSelectionHint,
  money,
} from './productConfigurationWorkspaceUtils';

type Props = {
  name: string;
  description: string;
  image: string;
  price: string;
  dynamicPrice: boolean;
  optionGroups: AdminProductOptionGroup[];
  ingredients: AdminIngredient[];
  products: AdminProduct[];
};
export function ProductCustomerPreview({
  name,
  description,
  image,
  price,
  dynamicPrice,
  optionGroups,
  ingredients,
  products,
}: Props) {
  return (
    <S.ProductCustomerPreview aria-label="Prévia do produto para o cliente" role="region">
      <header>
        <Eye />
        <div>
          <b>Como ficará para o cliente</b>
          <span>Resumo da experiência do cliente, atualizado em tempo real</span>
        </div>
        <em>PRÉVIA</em>
      </header>
      <div className="customer-preview-screen">
        <div className="customer-preview-cover">
          {image ? <img src={image} alt={`Foto de ${name || 'produto'}`} /> : <PackageOpen />}
          <span>VISÃO DO CLIENTE</span>
        </div>
        <div className="customer-preview-product">
          <small>PERSONALIZE SEU PEDIDO</small>
          <b>{name || 'Seu produto'}</b>
          <p>{description || 'Escolha as opções disponíveis para montar este produto.'}</p>
          <strong>
            {dynamicPrice ? '' : 'A partir de '}
            {dynamicPrice
              ? 'Preço conforme as escolhas'
              : Number(price) > 0
                ? money(Number(price))
                : 'R$ 0,00'}
          </strong>
        </div>
        <div className="customer-preview-intro">
          <div>
            <b>Monte seu produto</b>
            <span>Faça as escolhas abaixo para continuar.</span>
          </div>
          <small>
            {optionGroups.length} {optionGroups.length === 1 ? 'etapa' : 'etapas'}
          </small>
        </div>
        <div className="customer-preview-steps">
          {optionGroups.map((group, groupIndex) => (
            <section
              className={group.name.trim() && group.options.length ? 'ready' : 'pending'}
              key={group.id ?? `preview-${groupIndex}`}
            >
              <header>
                <div>
                  <span>ETAPA {groupIndex + 1}</span>
                  <b>{group.name || `Etapa ${groupIndex + 1}`}</b>
                  {group.description && <p>{group.description}</p>}
                </div>
                <em className={group.required ? 'required' : ''}>
                  {group.required ? 'Obrigatório' : 'Opcional'}
                </em>
              </header>
              <div className="customer-selection-rule">
                <span>{customerSelectionHint(group)}</span>
                <small>
                  {group.options.length} {group.options.length === 1 ? 'opção' : 'opções'}
                </small>
              </div>
              <div className="customer-option-list">
                {group.options.map((option) => {
                  const ingredient = ingredients.find((item) => item.id === option.ingredientId);
                  const referenceProduct = products.find(
                    (item) => Number(item.id) === Number(option.referenceProductId),
                  );
                  return (
                    <div key={option.id ?? option.referenceProductId ?? option.ingredientId}>
                      <i className={group.selectionType === 'SINGLE' ? 'radio' : ''} />
                      <span>
                        <b>
                          {referenceProduct?.name ||
                            ingredient?.name ||
                            `Opção ${option.referenceProductId || option.ingredientId}`}
                        </b>
                        {option.locked && <small>Já acompanha o produto</small>}
                      </span>
                      <strong>{customerOptionPrice(option, ingredient, referenceProduct)}</strong>
                    </div>
                  );
                })}
                {!group.options.length && (
                  <p className="customer-options-empty">As opções aparecerão aqui.</p>
                )}
              </div>
            </section>
          ))}
        </div>
        <div className="customer-preview-footer">
          <span>
            <ShoppingBag />
            <b>Adicionar ao pedido</b>
          </span>
          <strong>
            {dynamicPrice
              ? 'Escolha os sabores'
              : Number(price) > 0
                ? money(Number(price))
                : 'R$ 0,00'}
          </strong>
        </div>
      </div>
      <div className="customer-preview-note">
        <Eye />
        <div>
          <b>Esta é uma simulação</b>
          <small>O cliente verá esta sequência no cardápio após você salvar.</small>
        </div>
      </div>
    </S.ProductCustomerPreview>
  );
}
