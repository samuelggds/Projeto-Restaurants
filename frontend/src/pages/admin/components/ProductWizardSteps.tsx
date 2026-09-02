import type { RefObject } from 'react';
import {
  Boxes,
  CheckCircle2,
  Eye,
  ImagePlus,
  Layers3,
  PackageOpen,
  UploadCloud,
} from 'lucide-react';
import * as S from '../Admin.styles';
import type { AdminCategory, AdminProductOptionGroup } from '../types';
import type { ProductWizardStep } from '../domain/productWizard';

type SaleMode = 'COMPLETE' | 'BUILDABLE';

export type ProductFieldErrors = Partial<Record<'name' | 'price' | 'category' | 'stock', string>>;

type StepHeadingRef = RefObject<HTMLHeadingElement | null>;

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ProductTypeStep({
  confirmDiscardConfiguration,
  hasPersistedConfiguration,
  headingRef,
  onConfirmDiscardConfigurationChange,
  onSaleModeChange,
  saleMode,
}: {
  confirmDiscardConfiguration: boolean;
  hasPersistedConfiguration: boolean;
  headingRef: StepHeadingRef;
  onConfirmDiscardConfigurationChange: (confirmed: boolean) => void;
  onSaleModeChange: (saleMode: SaleMode) => void;
  saleMode: SaleMode;
}) {
  return (
    <S.ProductWizardStepSection aria-labelledby="product-step-type">
      <div className="section-heading">
        <span>1</span>
        <div>
          <small>TIPO DO PRODUTO</small>
          <h3 id="product-step-type" ref={headingRef} tabIndex={-1}>
            O que você quer cadastrar?
          </h3>
          <p>Escolha a opção que melhor descreve este produto.</p>
        </div>
      </div>

      <S.ProductSaleModeSelector role="radiogroup" aria-label="Tipo do produto">
        <button
          aria-checked={saleMode === 'COMPLETE'}
          className={saleMode === 'COMPLETE' ? 'active' : ''}
          role="radio"
          type="button"
          onClick={() => onSaleModeChange('COMPLETE')}
        >
          <PackageOpen />
          <span>
            <b>Produto pronto</b>
            <small>É vendido do jeito que está, sem escolhas.</small>
            <em>Ex.: refrigerante, prato feito, sobremesa</em>
          </span>
          {saleMode === 'COMPLETE' && <CheckCircle2 />}
        </button>
        <button
          aria-checked={saleMode === 'BUILDABLE'}
          className={saleMode === 'BUILDABLE' ? 'active' : ''}
          role="radio"
          type="button"
          onClick={() => onSaleModeChange('BUILDABLE')}
        >
          <Layers3 />
          <span>
            <b>Produto personalizável</b>
            <small>O cliente poderá fazer escolhas antes de adicionar à sacola.</small>
            <em>Ex.: pizza, hambúrguer montável, açaí, poke</em>
          </span>
          {saleMode === 'BUILDABLE' && <CheckCircle2 />}
        </button>
      </S.ProductSaleModeSelector>

      {saleMode === 'COMPLETE' && hasPersistedConfiguration && (
        <S.ProductSimpleMode>
          <CheckCircle2 />
          <div>
            <b>A personalização atual só será removida ao salvar.</b>
            <p>Você pode voltar para produto personalizável sem perder a configuração.</p>
            <label>
              <input
                type="checkbox"
                checked={confirmDiscardConfiguration}
                onChange={(event) => onConfirmDiscardConfigurationChange(event.target.checked)}
              />
              Confirmo que etapas, composição e porções serão removidas ao salvar.
            </label>
          </div>
        </S.ProductSimpleMode>
      )}
    </S.ProductWizardStepSection>
  );
}

export function ProductInformationStep({
  categories,
  categoryId,
  description,
  fieldErrors,
  headingRef,
  image,
  name,
  onCategoryIdChange,
  onClearFieldError,
  onDescriptionChange,
  onImageChange,
  onNameChange,
  onPriceChange,
  onUploadImage,
  price,
  saleMode,
  selectedProductCategory,
}: {
  categories: AdminCategory[];
  categoryId: number;
  description: string;
  fieldErrors: ProductFieldErrors;
  headingRef: StepHeadingRef;
  image: string;
  name: string;
  onCategoryIdChange: (categoryId: number) => void;
  onClearFieldError: (field: keyof ProductFieldErrors) => void;
  onDescriptionChange: (description: string) => void;
  onImageChange: (image: string) => void;
  onNameChange: (name: string) => void;
  onPriceChange: (price: string) => void;
  onUploadImage: (file?: File) => void;
  price: string;
  saleMode: SaleMode;
  selectedProductCategory: string;
}) {
  return (
    <S.ProductWizardStepSection aria-labelledby="product-step-information">
      <div className="section-heading">
        <span>2</span>
        <div>
          <small>INFORMAÇÕES</small>
          <h3 id="product-step-information" ref={headingRef} tabIndex={-1}>
            Apresente o produto
          </h3>
          <p>Defina as informações que aparecem na página inicial e no cardápio digital.</p>
        </div>
      </div>
      <div className="product-basics-layout">
        <div className="basic-fields">
          <S.Field $full>
            Nome do produto
            <input
              aria-describedby={fieldErrors.name ? 'product-name-error' : 'product-name-help'}
              aria-invalid={Boolean(fieldErrors.name)}
              required
              maxLength={100}
              value={name}
              onChange={(event) => {
                onNameChange(event.target.value);
                onClearFieldError('name');
              }}
              placeholder="Ex.: Pizza personalizada, massa artesanal ou poke"
            />
            <small
              id={fieldErrors.name ? 'product-name-error' : 'product-name-help'}
              className={fieldErrors.name ? 'field-error' : ''}
            >
              {fieldErrors.name || 'Use o mesmo nome que o cliente verá no cardápio.'}
            </small>
          </S.Field>
          <S.Field>
            Preço inicial
            <input
              aria-describedby={fieldErrors.price ? 'product-price-error' : 'product-price-help'}
              aria-invalid={Boolean(fieldErrors.price)}
              required
              type="number"
              min="0"
              max="999999"
              step="0.01"
              value={price}
              onChange={(event) => {
                onPriceChange(event.target.value);
                onClearFieldError('price');
              }}
              placeholder="0,00"
            />
            <small
              id={fieldErrors.price ? 'product-price-error' : 'product-price-help'}
              className={fieldErrors.price ? 'field-error' : ''}
            >
              {fieldErrors.price ||
                (saleMode === 'BUILDABLE'
                  ? 'Este é o preço inicial. As escolhas do cliente podem aumentar o valor.'
                  : 'Este será o preço do produto.')}
            </small>
          </S.Field>
          <S.Field>
            Categoria no cardápio
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
              <option value={0}>Selecione</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <small
              id={fieldErrors.category ? 'product-category-error' : 'product-category-help'}
              className={fieldErrors.category ? 'field-error' : ''}
            >
              {fieldErrors.category || 'Organiza o produto na seção correta do cardápio.'}
            </small>
          </S.Field>
          <S.Field $full>
            Descrição para o cliente
            <textarea
              maxLength={500}
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="Explique a proposta do produto e o que já está incluído no preço inicial."
            />
            <small>Conte o que torna o produto especial. {description.length}/500 caracteres</small>
          </S.Field>
        </div>

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
              <small>{selectedProductCategory || 'Categoria do produto'}</small>
              <b>{name || 'Nome do produto'}</b>
              <strong>{Number(price) > 0 ? money(Number(price)) : 'Preço inicial'}</strong>
            </div>
          </div>
          <label className="image-upload-action" htmlFor="product-image-upload">
            <UploadCloud />
            <span>
              <b>{image ? 'Trocar imagem' : 'Selecionar imagem'}</b>
              <small>Recomendado: formato quadrado</small>
            </span>
            <input
              id="product-image-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => onUploadImage(event.target.files?.[0])}
            />
          </label>
          <S.Field>
            Ou cole uma URL
            <input
              value={image}
              onChange={(event) => onImageChange(event.target.value)}
              placeholder="https://..."
            />
            <small>Use uma imagem clara que mostre o produto real.</small>
          </S.Field>
        </div>
      </div>
    </S.ProductWizardStepSection>
  );
}

export function ProductAvailabilityStep({
  fieldErrors,
  headingRef,
  onClearFieldError,
  onStockChange,
  onUnlimitedStockChange,
  stock,
  unlimitedStock,
}: {
  fieldErrors: ProductFieldErrors;
  headingRef: StepHeadingRef;
  onClearFieldError: (field: keyof ProductFieldErrors) => void;
  onStockChange: (stock: string) => void;
  onUnlimitedStockChange: (unlimited: boolean) => void;
  stock: string;
  unlimitedStock: boolean;
}) {
  return (
    <S.ProductWizardStepSection aria-labelledby="product-step-availability">
      <div className="section-heading">
        <span>5</span>
        <div>
          <small>DISPONIBILIDADE</small>
          <h3 id="product-step-availability" ref={headingRef} tabIndex={-1}>
            Como ele é vendido?
          </h3>
          <p>Escolha se ele é feito sob demanda ou se possui uma quantidade limitada.</p>
        </div>
      </div>
      <div className="availability-layout">
        <div className="stock-configuration">
          <b className="field-title">Como este produto é preparado?</b>
          <div className="stock-mode-cards" role="group" aria-label="Controle de estoque">
            <button
              className={unlimitedStock ? 'active' : ''}
              type="button"
              onClick={() => onUnlimitedStockChange(true)}
            >
              <PackageOpen />
              <span>
                <b>Feito sob demanda</b>
                <small>Sem limite fixo de unidades</small>
              </span>
              {unlimitedStock && <CheckCircle2 />}
            </button>
            <button
              className={!unlimitedStock ? 'active' : ''}
              type="button"
              onClick={() => onUnlimitedStockChange(false)}
            >
              <Boxes />
              <span>
                <b>Quantidade limitada</b>
                <small>Controle quantas unidades estão disponíveis</small>
              </span>
              {!unlimitedStock && <CheckCircle2 />}
            </button>
          </div>
          {!unlimitedStock && (
            <S.Field>
              Quantidade disponível
              <input
                aria-describedby={fieldErrors.stock ? 'product-stock-error' : 'product-stock-help'}
                aria-invalid={Boolean(fieldErrors.stock)}
                required
                type="number"
                min="0"
                step="1"
                placeholder="Quantidade disponível"
                value={stock}
                onChange={(event) => {
                  onStockChange(event.target.value.replace(/\D/g, ''));
                  onClearFieldError('stock');
                }}
              />
              <small
                id={fieldErrors.stock ? 'product-stock-error' : 'product-stock-help'}
                className={fieldErrors.stock ? 'field-error' : ''}
              >
                {fieldErrors.stock || 'Informe quantas unidades podem ser vendidas.'}
              </small>
            </S.Field>
          )}
        </div>
      </div>
    </S.ProductWizardStepSection>
  );
}

export function ProductReviewStep({
  description,
  headingRef,
  image,
  name,
  onEdit,
  onToggleCustomerPreview,
  optionGroups,
  price,
  saleMode,
  selectedProductCategory,
  showCustomerPreview,
  stock,
  unlimitedStock,
}: {
  description: string;
  headingRef: StepHeadingRef;
  image: string;
  name: string;
  onEdit: (step: ProductWizardStep) => void;
  onToggleCustomerPreview: () => void;
  optionGroups: AdminProductOptionGroup[];
  price: string;
  saleMode: SaleMode;
  selectedProductCategory: string;
  showCustomerPreview: boolean;
  stock: string;
  unlimitedStock: boolean;
}) {
  const linkedOptionCount = optionGroups.reduce((total, group) => total + group.options.length, 0);

  return (
    <S.ProductWizardStepSection aria-labelledby="product-step-review">
      <div className="section-heading">
        <span>6</span>
        <div>
          <small>REVISAR</small>
          <h3 id="product-step-review" ref={headingRef} tabIndex={-1}>
            Está tudo certo?
          </h3>
          <p>Revise as informações antes de criar o produto.</p>
        </div>
      </div>

      <div className="review-product-heading">
        {image ? <img src={image} alt="" /> : <PackageOpen />}
        <div>
          <small>{selectedProductCategory || 'Sem categoria'}</small>
          <h4>{name || 'Produto sem nome'}</h4>
          <strong>
            {saleMode === 'BUILDABLE' ? 'A partir de ' : ''}
            {money(Number(price) || 0)}
          </strong>
        </div>
        <span>{saleMode === 'BUILDABLE' ? 'Produto personalizável' : 'Produto pronto'}</span>
      </div>

      <div className="review-sections">
        <article>
          <CheckCircle2 />
          <div>
            <b>Produto</b>
            <span>{selectedProductCategory || 'Sem categoria'}</span>
          </div>
          <button type="button" onClick={() => onEdit('BASIC')}>
            Editar
          </button>
        </article>
        <article>
          <CheckCircle2 />
          <div>
            <b>Preço</b>
            <span>{money(Number(price) || 0)}</span>
          </div>
          <button type="button" onClick={() => onEdit('PRICE')}>
            Editar
          </button>
        </article>
        <article>
          <CheckCircle2 />
          <div>
            <b>Como aparece no cardápio</b>
            <span>{description || 'Sem descrição adicional'}</span>
          </div>
          <button type="button" onClick={() => onEdit('APPEARANCE')}>
            Editar
          </button>
        </article>
        {saleMode === 'BUILDABLE' && (
          <article>
            <CheckCircle2 />
            <div>
              <b>Personalização</b>
              <span>{`${optionGroups.length} escolha(s), ${linkedOptionCount} opção(ões)`}</span>
              {optionGroups.length > 0 && (
                <ol>
                  {optionGroups.map((group, index) => (
                    <li key={group.id ?? `review-group-${index}`}>
                      {group.name || `Escolha ${index + 1}`} — {group.options.length} opção(ões)
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <button type="button" onClick={() => onEdit('CUSTOMIZATION')}>
              Editar
            </button>
          </article>
        )}
        <article>
          <CheckCircle2 />
          <div>
            <b>Disponibilidade</b>
            <span>
              {unlimitedStock ? 'Feito sob demanda' : `${stock || 0} unidade(s) disponíveis`}
            </span>
          </div>
          <button type="button" onClick={() => onEdit('AVAILABILITY')}>
            Editar
          </button>
        </article>
      </div>

      <button
        aria-expanded={showCustomerPreview}
        className="customer-preview-toggle"
        type="button"
        onClick={onToggleCustomerPreview}
      >
        <Eye /> Visualizar como cliente
      </button>
      {showCustomerPreview && (
        <div className="customer-product-preview" role="region" aria-label="Prévia para o cliente">
          <div>
            {image ? <img src={image} alt={`Prévia de ${name}`} /> : <PackageOpen />}
            <span>
              <b>{name}</b>
              <small>{description}</small>
              <strong>
                {saleMode === 'BUILDABLE' ? 'A partir de ' : ''}
                {money(Number(price) || 0)}
              </strong>
            </span>
          </div>
          {saleMode === 'BUILDABLE' && (
            <ol>
              {optionGroups.map((group, index) => (
                <li key={group.id ?? `customer-group-${index}`}>
                  <b>{group.name || `Etapa ${index + 1}`}</b>
                  <span>
                    {group.required ? 'Escolha obrigatória' : 'Escolha opcional'} ·{' '}
                    {group.options.length} opção(ões)
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </S.ProductWizardStepSection>
  );
}
