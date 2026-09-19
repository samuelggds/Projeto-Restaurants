import type { RefObject } from 'react';
import { ImagePlus, PackageOpen, UploadCloud } from 'lucide-react';

import * as S from '../Admin.styles';
import type { AdminCategory } from '../types';
import type { ProductFieldErrors } from './ProductWizardSteps';

type StepHeadingRef = RefObject<HTMLHeadingElement | null>;

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ProductBasicStep({
  categories,
  categoryId,
  fieldErrors,
  headingRef,
  name,
  onCategoryIdChange,
  onClearFieldError,
  onNameChange,
}: {
  categories: AdminCategory[];
  categoryId: number;
  fieldErrors: ProductFieldErrors;
  headingRef: StepHeadingRef;
  name: string;
  onCategoryIdChange: (categoryId: number) => void;
  onClearFieldError: (field: keyof ProductFieldErrors) => void;
  onNameChange: (name: string) => void;
}) {
  return (
    <S.ProductWizardStepSection aria-labelledby="product-step-basic">
      <div className="section-heading">
        <span>2</span>
        <div>
          <h3 id="product-step-basic" ref={headingRef} tabIndex={-1}>
            Qual é o produto?
          </h3>
          <p>Esse é o nome que aparecerá para o cliente.</p>
        </div>
      </div>

      <div className="guided-fields">
        <S.Field $full>
          Nome do produto
          <input
            aria-describedby={fieldErrors.name ? 'product-name-error' : 'product-name-help'}
            aria-invalid={Boolean(fieldErrors.name)}
            autoFocus
            maxLength={100}
            placeholder="Ex.: Macarrão de Carne"
            required
            value={name}
            onChange={(event) => {
              onNameChange(event.target.value);
              onClearFieldError('name');
            }}
          />
          <small
            className={fieldErrors.name ? 'field-error' : ''}
            id={fieldErrors.name ? 'product-name-error' : 'product-name-help'}
          >
            {fieldErrors.name || 'Use um nome curto e fácil de reconhecer.'}
          </small>
        </S.Field>

        <S.Field $full>
          Categoria
          <select
            aria-describedby={
              fieldErrors.category ? 'product-category-error' : 'product-category-help'
            }
            aria-invalid={Boolean(fieldErrors.category)}
            required
            value={categoryId}
            onChange={(event) => {
              onCategoryIdChange(Number(event.target.value));
              onClearFieldError('category');
            }}
          >
            <option value={0}>Selecione uma categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <small
            className={fieldErrors.category ? 'field-error' : ''}
            id={fieldErrors.category ? 'product-category-error' : 'product-category-help'}
          >
            {fieldErrors.category || 'A categoria organiza o produto no cardápio.'}
          </small>
        </S.Field>
      </div>
    </S.ProductWizardStepSection>
  );
}

export function ProductPriceStep({
  fieldErrors,
  headingRef,
  onClearFieldError,
  onPriceChange,
  price,
  saleMode,
  pricingMode,
  onPricingModeChange,
}: {
  fieldErrors: ProductFieldErrors;
  headingRef: StepHeadingRef;
  onClearFieldError: (field: keyof ProductFieldErrors) => void;
  onPriceChange: (price: string) => void;
  price: string;
  saleMode: 'COMPLETE' | 'BUILDABLE';
  pricingMode: 'BASE' | 'HIGHEST_OPTION';
  onPricingModeChange: (mode: 'BASE' | 'HIGHEST_OPTION') => void;
}) {
  return (
    <S.ProductWizardStepSection aria-labelledby="product-step-price">
      <div className="section-heading">
        <span>3</span>
        <div>
          <h3 id="product-step-price" ref={headingRef} tabIndex={-1}>
            Quanto custa?
          </h3>
          <p>Escolha como o preço será calculado para o cliente.</p>
        </div>
      </div>

      {saleMode === 'BUILDABLE' && (
        <fieldset className="pricing-mode-options">
          <legend>Como cobrar este produto?</legend>
          {(
            [
              [
                'BASE',
                'Preço fixo',
                'Informe o preço inicial. Adicionais seguem as regras das etapas.',
              ],
              [
                'HIGHEST_OPTION',
                'Meio a meio',
                'O cliente paga o maior preço entre os produtos escolhidos.',
              ],
            ] as const
          ).map(([mode, label, description]) => (
            <label key={mode} className={pricingMode === mode ? 'selected' : ''}>
              <input
                type="radio"
                name="product-pricing-mode"
                value={mode}
                checked={pricingMode === mode}
                onChange={() => onPricingModeChange(mode)}
              />
              <span>
                <b>{label}</b>
                <small>{description}</small>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {pricingMode === 'HIGHEST_OPTION' ? (
        <div className="dynamic-price-info" role="status">
          <b>Preço definido pelas escolhas do cliente</b>
          <p>
            Não é necessário preencher um valor. Nas próximas etapas, selecione os produtos de cada
            metade.
          </p>
          <small>
            Exemplo: sabores de R$ 35,00 e R$ 42,00 → preço de R$ 42,00. Adicionais opcionais são
            cobrados à parte.
          </small>
        </div>
      ) : (
        <div className="guided-price-field">
          <S.Field $full>
            Preço
            <div className="guided-money-input">
              <span>R$</span>
              <input
                aria-describedby={fieldErrors.price ? 'product-price-error' : 'product-price-help'}
                aria-invalid={Boolean(fieldErrors.price)}
                inputMode="decimal"
                min="0"
                max="999999"
                placeholder="29,90"
                required
                step="0.01"
                type="number"
                value={price}
                onChange={(event) => {
                  onPriceChange(event.target.value);
                  onClearFieldError('price');
                }}
              />
            </div>
            <small
              className={fieldErrors.price ? 'field-error' : ''}
              id={fieldErrors.price ? 'product-price-error' : 'product-price-help'}
            >
              {fieldErrors.price ||
                (saleMode === 'COMPLETE'
                  ? 'Esse é o preço final deste produto.'
                  : 'Esse é o preço inicial. As escolhas podem alterar o valor.')}
            </small>
          </S.Field>
        </div>
      )}
    </S.ProductWizardStepSection>
  );
}

export function ProductAppearanceStep({
  description,
  headingRef,
  image,
  name,
  onDescriptionChange,
  onUploadImage,
  price,
  dynamicPrice = false,
  selectedProductCategory,
}: {
  description: string;
  headingRef: StepHeadingRef;
  image: string;
  name: string;
  onDescriptionChange: (description: string) => void;
  onUploadImage: (file?: File) => void;
  price: string;
  dynamicPrice?: boolean;
  selectedProductCategory: string;
}) {
  return (
    <S.ProductWizardStepSection aria-labelledby="product-step-appearance">
      <div className="section-heading">
        <span>4</span>
        <div>
          <h3 id="product-step-appearance" ref={headingRef} tabIndex={-1}>
            Como ele aparece no cardápio?
          </h3>
          <p>Adicione uma foto e uma descrição para o cliente.</p>
        </div>
      </div>

      <div className="product-basics-layout appearance-layout">
        <div className="image-studio">
          <div className={image ? 'image-preview has-image' : 'image-preview'}>
            {image ? (
              <img src={image} alt={`Prévia de ${name || 'produto'}`} />
            ) : (
              <div>
                <ImagePlus />
                <b>Adicione uma foto</b>
                <span>JPG, PNG ou WEBP</span>
              </div>
            )}
            <div className="preview-caption">
              <small>{selectedProductCategory || 'Categoria'}</small>
              <b>{name || 'Nome do produto'}</b>
              <strong>
                {dynamicPrice
                  ? 'Preço conforme as escolhas'
                  : Number(price) >= 0
                    ? money(Number(price))
                    : 'R$ 0,00'}
              </strong>
            </div>
          </div>
          <label className="image-upload-action" htmlFor="product-image-upload">
            <UploadCloud />
            <span>
              <b>{image ? 'Trocar foto' : 'Adicionar foto'}</b>
              <small>Imagem quadrada funciona melhor</small>
            </span>
            <input
              accept="image/jpeg,image/png,image/webp"
              id="product-image-upload"
              type="file"
              onChange={(event) => onUploadImage(event.target.files?.[0])}
            />
          </label>
        </div>

        <div className="guided-fields">
          <S.Field $full>
            Descrição (opcional)
            <textarea
              maxLength={500}
              placeholder="Conte de forma simples o que vem neste produto."
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
            />
            <small>{description.length}/500 caracteres</small>
          </S.Field>
          <div className="appearance-card-preview" aria-label="Prévia do produto no cardápio">
            {image ? <img src={image} alt="" /> : <PackageOpen />}
            <span>
              <b>{name || 'Nome do produto'}</b>
              <small>{description || 'Descrição opcional'}</small>
              <strong>
                {dynamicPrice ? 'Preço conforme as escolhas' : money(Number(price) || 0)}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </S.ProductWizardStepSection>
  );
}
