import { ArrowLeft, Check, CircleAlert, Minus, Plus, UtensilsCrossed } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  buildProductConfiguration,
  createInitialSelections,
  normalizeProductOptionGroups,
  productConfigurationTotal,
  toggleProductOption,
  validateProductSelections,
  type ConfigurableProduct,
  type ProductConfiguration,
  type OptionQuantityState,
  type PortionSelection,
  type SelectionErrors,
} from '../domain/productCustomization';
import * as S from './ProductConfigurator.styles';

type ProductConfiguratorProduct = ConfigurableProduct & {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  originalPrice?: number;
  promotion?: {
    active: boolean;
    badgeLabel: string;
    endsAt?: string;
  };
  rating?: number;
};

type ProductConfiguratorProps = {
  product: ProductConfiguratorProduct;
  primaryColor?: string;
  onClose: () => void;
  enableProductQuantity?: boolean;
  tableMenuVariant?: boolean;
  embedded?: boolean;
  customerPageVariant?: boolean;
  onConfirm: (configuration: ProductConfiguration, quantity?: number) => void;
};

const brl = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function selectionHint(minimum: number, maximum: number | null) {
  if (maximum === 1) return 'Escolha 1 opção';
  if (minimum > 0 && maximum != null && minimum !== maximum)
    return `Escolha de ${minimum} até ${maximum}`;
  if (minimum > 0) return `Escolha pelo menos ${minimum}`;
  if (maximum != null) return `Escolha até ${maximum}`;
  return 'Escolha como preferir';
}

export function ProductConfigurator({
  product,
  primaryColor = '#d64d08',
  onClose,
  enableProductQuantity = false,
  tableMenuVariant = false,
  embedded = false,
  customerPageVariant = false,
  onConfirm,
}: ProductConfiguratorProps) {
  const totalDescriptionId = useId();
  const groups = useMemo(() => normalizeProductOptionGroups(product), [product]);
  const portionConfiguration = product.portionConfiguration?.enabled
    ? product.portionConfiguration
    : null;
  const portionGroup = portionConfiguration
    ? groups.find((group) => group.id === portionConfiguration.optionGroupId)
    : undefined;
  const regularGroups = useMemo(
    () => groups.filter((group) => group.id !== portionConfiguration?.optionGroupId),
    [groups, portionConfiguration?.optionGroupId],
  );
  const [selections, setSelections] = useState(() => createInitialSelections(regularGroups));
  const [optionQuantities, setOptionQuantities] = useState<OptionQuantityState>(() =>
    Object.fromEntries(
      regularGroups.flatMap((group) =>
        group.options
          .filter((option) => option.defaultSelected || option.locked)
          .map((option) => [option.id, option.defaultQuantity ?? option.minQuantity ?? 1]),
      ),
    ),
  );
  const [removedCompositionItemIds, setRemovedCompositionItemIds] = useState<string[]>([]);
  const [portions, setPortions] = useState<PortionSelection[]>(() =>
    Array.from({ length: portionConfiguration?.minPortions ?? 0 }, () => ({ optionId: '' })),
  );
  const [observation, setObservation] = useState('');
  const [productQuantity, setProductQuantity] = useState(1);
  const [errors, setErrors] = useState<SelectionErrors>({});

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (!embedded) document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    return () => {
      if (!embedded) document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [embedded, onClose]);

  const requiredGroups = regularGroups.filter((group) => group.minSelections > 0);
  const completedRequiredGroups = requiredGroups.filter(
    (group) => (selections[group.id] || []).length >= group.minSelections,
  ).length;
  const portionsReady = !portionConfiguration || portions.every((portion) => portion.optionId);
  const requiredStepCount = requiredGroups.length + (portionConfiguration ? 1 : 0);
  const completedStepCount =
    completedRequiredGroups + (portionConfiguration && portionsReady ? 1 : 0);
  const progress = requiredStepCount
    ? Math.round((completedStepCount / requiredStepCount) * 100)
    : 100;
  const total = productConfigurationTotal(product.price, groups, selections, {
    pricingMode: product.pricingMode,
    optionQuantities,
    portionConfiguration,
    portions,
  });
  const dynamicPrice = product.pricingMode === 'HIGHEST_OPTION';
  const priceReady =
    !dynamicPrice ||
    regularGroups.some((group) =>
      group.options.some(
        (option) => option.referenceProductId && selections[group.id]?.includes(option.id),
      ),
    );
  const priceLabel = priceReady ? brl(total) : 'Escolha os sabores';
  const configurable = Boolean(
    regularGroups.length ||
    product.compositionItems?.some((item) => item.active && item.removable) ||
    (portionConfiguration && portionGroup?.options.length),
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateProductSelections(regularGroups, selections);
    if (portionConfiguration && (!portionGroup || !portionsReady)) {
      nextErrors.portions = 'Escolha uma opção para cada porção.';
    }
    setErrors(nextErrors);
    if ((!configurable && !enableProductQuantity) || Object.keys(nextErrors).length) {
      const firstInvalidGroup = Object.keys(nextErrors)[0];
      if (firstInvalidGroup) {
        document.getElementById(`product-group-${firstInvalidGroup}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
      return;
    }
    const configuration = buildProductConfiguration(
      regularGroups,
      selections,
      observation,
      {
        optionQuantities,
        removedCompositionItemIds,
        portions,
        configurationVersion: product.configurationVersion,
      },
    );

    if (enableProductQuantity) {
      onConfirm(configuration, productQuantity);
      return;
    }

    onConfirm(configuration);
  };

  const configurator = (
    <S.Page
      $primary={primaryColor}
      $embedded={embedded}
      $customerPageVariant={customerPageVariant}
      role={embedded ? 'region' : 'dialog'}
      aria-modal={embedded ? undefined : 'true'}
      aria-label={`Montar ${product.name}`}
      data-testid="product-configurator"
      data-table-menu={tableMenuVariant ? 'true' : undefined}
    >
      {!tableMenuVariant && !customerPageVariant ? (
        <S.Header aria-hidden="true">
          <S.HeaderInner>
            <button type="button" onClick={onClose}>
              <ArrowLeft size={19} /> Voltar ao cardápio
            </button>
            <span>Monte do seu jeito e confira antes de adicionar</span>
          </S.HeaderInner>
        </S.Header>
      ) : null}

      <S.Layout className="product-layout">
        <S.ProductSummary className="product-summary" data-product-summary>
          <S.ProductBack type="button" aria-label="Voltar ao cardápio" onClick={onClose}>
            <ArrowLeft size={19} />
          </S.ProductBack>
          {tableMenuVariant ? <S.ProductFavorite aria-hidden="true">♡</S.ProductFavorite> : null}
          {product.image ? (
            <img src={product.image} alt={product.name} decoding="async" />
          ) : (
            <S.ProductImagePlaceholder aria-hidden="true">
              <UtensilsCrossed />
            </S.ProductImagePlaceholder>
          )}
          {customerPageVariant ? (
            <span className="product-image-caption">
              *Imagem ilustrativa de sugestão de consumo.
            </span>
          ) : null}
          <div>
            {!tableMenuVariant ? <small>Personalize seu pedido</small> : null}
            <S.ProductTitleRow>
              <h1>{product.name}</h1>
              {Number(product.rating || 0) > 0 ? (
                <S.ProductRating aria-label={`Avaliação ${Number(product.rating).toFixed(1)}`}>
                  ★ {Number(product.rating).toFixed(1)}
                </S.ProductRating>
              ) : null}
            </S.ProductTitleRow>
            {tableMenuVariant ? (
              <S.TableMenuProductPrice aria-live="polite">
                {product.promotion?.active &&
                Number(product.originalPrice || 0) > Number(product.price || 0) ? (
                  <del>{brl(Number(product.originalPrice))}</del>
                ) : null}
                <strong>
                  {dynamicPrice ? priceLabel : brl(product.price)}
                </strong>
              </S.TableMenuProductPrice>
            ) : null}
            <p>
              {product.description || 'Escolha as opções disponíveis para montar este produto.'}
            </p>
            {product.promotion?.active &&
              Number(product.originalPrice || 0) > Number(product.price || 0) && !tableMenuVariant && (
                <S.PromotionPrice>
                  <span>{product.promotion.badgeLabel}</span>
                  <del>{brl(Number(product.originalPrice))}</del>
                </S.PromotionPrice>
              )}
            {!tableMenuVariant ? (
              <strong aria-live="polite">
                {dynamicPrice ? priceLabel : `A partir de ${brl(product.price)}`}
              </strong>
            ) : null}
            {dynamicPrice && (
              <p>
                Vale o maior preço entre os produtos escolhidos. Adicionais são cobrados à parte.
              </p>
            )}
            {product.promotion?.active && (
              <S.PromotionHint>
                O desconto já está aplicado ao produto-base. Adicionais mantêm o valor informado.
              </S.PromotionHint>
            )}
          </div>
        </S.ProductSummary>

        <S.Form className="product-form" onSubmit={submit} noValidate>
          {!tableMenuVariant ? (
            <S.DesktopProductDetails className="product-details">
              <h1>{product.name}</h1>
              {product.description ? <p>{product.description}</p> : null}
              <strong aria-live="polite">
                {dynamicPrice ? priceLabel : brl(product.price)}
              </strong>
            </S.DesktopProductDetails>
          ) : null}

          {!tableMenuVariant && !customerPageVariant && (
            <S.Intro>
              <div>
                <h2>Monte seu produto</h2>
                <p>Faça uma escolha em cada categoria e personalize os itens opcionais.</p>
              </div>
              <S.Progress
                $value={progress}
                aria-label={`${progress}% das escolhas obrigatórias concluídas`}
              >
                <div />
                <small>
                  {requiredStepCount
                    ? `${completedStepCount} de ${requiredStepCount} etapas concluídas`
                    : 'Sem escolhas obrigatórias'}
                </small>
              </S.Progress>
            </S.Intro>
          )}

          {!configurable && !enableProductQuantity ? (
            <S.Empty role="alert">
              <CircleAlert size={21} />
              <div>
                <b>Produto aguardando configuração</b>
                <p>Este restaurante ainda não cadastrou as opções deste produto.</p>
              </div>
            </S.Empty>
          ) : null}

          {!!product.compositionItems?.length && (
            <S.Composition>
              <S.GroupHeader>
                <div>
                  <h3>O que já acompanha</h3>
                  <p>Itens da receita. Você pode retirar somente os marcados como removíveis.</p>
                </div>
                <S.Badge $required={false}>Incluído</S.Badge>
              </S.GroupHeader>
              <div className="composition-list">
                {product.compositionItems
                  .filter((item) => item.active)
                  .map((item) => {
                    const removed = removedCompositionItemIds.includes(item.id);
                    return (
                      <label className={removed ? 'removed' : ''} key={item.id}>
                        <span>
                          <b>{item.name}</b>
                          <small>{item.removable ? 'Pode retirar' : 'Faz parte da receita'}</small>
                        </span>
                        {item.removable ? (
                          <span className="remove-control">
                            <input
                              type="checkbox"
                              checked={removed}
                              onChange={(event) =>
                                setRemovedCompositionItemIds((current) =>
                                  event.target.checked
                                    ? [...current, item.id]
                                    : current.filter((id) => id !== item.id),
                                )
                              }
                            />
                            {removed ? 'Retirar' : 'Manter'}
                          </span>
                        ) : (
                          <span className="fixed-control">Fixo</span>
                        )}
                      </label>
                    );
                  })}
              </div>
            </S.Composition>
          )}

          {regularGroups.map((group) => {
            const selected = selections[group.id] || [];
            const atLimit = group.maxSelections != null && selected.length >= group.maxSelections;
            return (
              <S.Group
                className="product-group"
                id={`product-group-${group.id}`}
                key={group.id}
                $error={Boolean(errors[group.id])}
                aria-describedby={errors[group.id] ? `product-group-error-${group.id}` : undefined}
              >
                <S.GroupHeader className="product-group-header">
                  <div>
                    <h3>{group.name}</h3>
                    {group.description && <p>{group.description}</p>}
                  </div>
                  <S.Badge $required={group.minSelections > 0}>
                    {group.minSelections > 0 ? 'Obrigatório' : 'Opcional'}
                  </S.Badge>
                </S.GroupHeader>

                <S.OptionList
                  className="product-option-list"
                  data-selection={group.selectionType}
                >
                  {group.options.map((option) => {
                    const isSelected = selected.includes(option.id);
                    const disabled = Boolean(
                      option.locked ||
                      (!isSelected && atLimit && group.selectionType === 'MULTIPLE'),
                    );
                    return (
                      <S.Option
                        className="product-option"
                        key={option.id}
                        $selected={isSelected}
                        $disabled={disabled && !option.locked}
                      >
                        <label>
                          <input
                            type={
                              group.selectionType === 'SINGLE' && group.minSelections > 0
                                ? 'radio'
                                : 'checkbox'
                            }
                            name={`product-group-${group.id}`}
                            value={option.id}
                            checked={isSelected}
                            disabled={disabled}
                            onChange={() => {
                              setSelections((current) =>
                                toggleProductOption(regularGroups, current, group.id, option.id),
                              );
                              if (!isSelected) {
                                setOptionQuantities((current) => ({
                                  ...current,
                                  [option.id]: option.defaultQuantity ?? option.minQuantity ?? 1,
                                }));
                              }
                              setErrors((current) => {
                                if (!current[group.id]) return current;
                                const next = { ...current };
                                delete next[group.id];
                                return next;
                              });
                            }}
                          />
                          <i>{isSelected && <Check size={15} strokeWidth={3} />}</i>
                          <S.OptionIdentity>
                            {option.image && (
                              <S.OptionImage src={option.image} alt="" loading="lazy" />
                            )}
                            <span>
                              <b>{option.name}</b>
                              {option.locked && <small>Já acompanha o produto</small>}
                            </span>
                          </S.OptionIdentity>
                          <strong>
                            {option.pricingMode === 'ABSOLUTE'
                              ? `${dynamicPrice ? 'Valor da opção' : 'Preço final'} ${brl(Number(option.absolutePrice ?? option.price))}`
                              : option.price > 0
                                ? `+ ${brl(option.price)}`
                                : 'Incluso'}
                          </strong>
                        </label>
                        {isSelected && option.allowQuantity && (
                          <S.QuantityStepper aria-label={`Quantidade de ${option.name}`}>
                            <span>Quantidade</span>
                            <button
                              type="button"
                              aria-label={`Diminuir quantidade de ${option.name}`}
                              disabled={
                                (optionQuantities[option.id] ?? option.defaultQuantity ?? 1) <=
                                (option.minQuantity ?? 1)
                              }
                              onClick={() =>
                                setOptionQuantities((current) => ({
                                  ...current,
                                  [option.id]: Math.max(
                                    option.minQuantity ?? 1,
                                    (current[option.id] ?? option.defaultQuantity ?? 1) - 1,
                                  ),
                                }))
                              }
                            >
                              <Minus />
                            </button>
                            <b>{optionQuantities[option.id] ?? option.defaultQuantity ?? 1}</b>
                            <button
                              type="button"
                              aria-label={`Aumentar quantidade de ${option.name}`}
                              disabled={
                                (optionQuantities[option.id] ?? option.defaultQuantity ?? 1) >=
                                (option.maxQuantity ?? 1)
                              }
                              onClick={() =>
                                setOptionQuantities((current) => ({
                                  ...current,
                                  [option.id]: Math.min(
                                    option.maxQuantity ?? 1,
                                    (current[option.id] ?? option.defaultQuantity ?? 1) + 1,
                                  ),
                                }))
                              }
                            >
                              <Plus />
                            </button>
                          </S.QuantityStepper>
                        )}
                      </S.Option>
                    );
                  })}
                </S.OptionList>

                <S.GroupFooter>
                  <span>{selectionHint(group.minSelections, group.maxSelections)}</span>
                  {errors[group.id] && (
                    <span className="error" id={`product-group-error-${group.id}`} role="alert">
                      <CircleAlert size={13} /> {errors[group.id]}
                    </span>
                  )}
                </S.GroupFooter>
              </S.Group>
            );
          })}

          {portionConfiguration && portionGroup && (
            <S.PortionBuilder $error={Boolean(errors.portions)}>
              <S.GroupHeader>
                <div>
                  <h3>Divida em porções</h3>
                  <p>Escolha quantas porções deseja e defina uma opção para cada parte.</p>
                </div>
                <S.Badge $required>Obrigatório</S.Badge>
              </S.GroupHeader>
              <div className="portion-count" role="group" aria-label="Quantidade de porções">
                {Array.from(
                  {
                    length: portionConfiguration.maxPortions - portionConfiguration.minPortions + 1,
                  },
                  (_, index) => portionConfiguration.minPortions + index,
                ).map((count) => (
                  <button
                    className={portions.length === count ? 'active' : ''}
                    key={count}
                    type="button"
                    onClick={() => {
                      setPortions((current) =>
                        Array.from({ length: count }, (_, index) =>
                          current[index] ? current[index] : { optionId: '' },
                        ),
                      );
                      setErrors((current) => {
                        const next = { ...current };
                        delete next.portions;
                        return next;
                      });
                    }}
                  >
                    {count} {count === 1 ? 'porção' : 'porções'}
                  </button>
                ))}
              </div>
              <div className="portion-list">
                {portions.map((portion, index) => (
                  <div className="portion-row" key={`portion-${index}`}>
                    <span className="portion-number">
                      <UtensilsCrossed />
                      <b>Porção {index + 1}</b>
                      <small>1/{portions.length}</small>
                    </span>
                    <label>
                      Opção
                      <select
                        value={portion.optionId}
                        onChange={(event) => {
                          setPortions((current) =>
                            current.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, optionId: event.target.value }
                                : entry,
                            ),
                          );
                          setErrors((current) => {
                            const next = { ...current };
                            delete next.portions;
                            return next;
                          });
                        }}
                      >
                        <option value="">Escolha uma opção</option>
                        {portionGroup.options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                            {option.pricingMode === 'ABSOLUTE'
                              ? ` · ${brl(Number(option.absolutePrice ?? option.price))}`
                              : option.price > 0
                                ? ` · + ${brl(option.price)}`
                                : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                    {portionConfiguration.allowPortionObservations && (
                      <label>
                        Observação da porção
                        <input
                          maxLength={300}
                          value={portion.observation ?? ''}
                          onChange={(event) =>
                            setPortions((current) =>
                              current.map((entry, entryIndex) =>
                                entryIndex === index
                                  ? { ...entry, observation: event.target.value }
                                  : entry,
                              ),
                            )
                          }
                          placeholder="Opcional"
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
              {errors.portions && (
                <S.GroupFooter>
                  <span className="error" role="alert">
                    <CircleAlert size={13} /> {errors.portions}
                  </span>
                </S.GroupFooter>
              )}
            </S.PortionBuilder>
          )}

          <S.Observation className="product-observation" data-testid="product-configurator-observation">
            <div>
              <b>Alguma observação?</b>
              <span>Opcional</span>
            </div>
            <textarea
              value={observation}
              maxLength={500}
              onChange={(event) => setObservation(event.target.value)}
              placeholder="Ex: sem cebola, maionese à parte..."
            />
            <small>{observation.length}/500 caracteres</small>
          </S.Observation>

          <S.BottomBar
            className="product-bottom-bar"
            data-testid="product-configurator-footer"
            $stickyOnMobile={tableMenuVariant || enableProductQuantity}
          >
            <span className="total-description" id={totalDescriptionId}>
              {priceReady
                ? brl(total * (enableProductQuantity ? productQuantity : 1))
                : 'Escolha os sabores'}
            </span>
            {enableProductQuantity ? (
              <S.ProductQuantity className="product-quantity" aria-label="Quantidade do produto">
                <button
                  type="button"
                  aria-label="Diminuir quantidade do produto"
                  disabled={productQuantity <= 1}
                  onClick={() => setProductQuantity((quantity) => Math.max(1, quantity - 1))}
                >
                  <Minus size={15} />
                </button>
                <strong>{productQuantity}</strong>
                <button
                  type="button"
                  aria-label="Aumentar quantidade do produto"
                  onClick={() => setProductQuantity((quantity) => quantity + 1)}
                >
                  <Plus size={15} />
                </button>
              </S.ProductQuantity>
            ) : (
              <div>
                <small>Total deste item</small>
                <strong aria-live="polite">
                  {priceLabel}
                </strong>
              </div>
            )}
            <button
              type="submit"
              disabled={(!configurable && !enableProductQuantity) || !priceReady}
              aria-label="Adicionar à sacola"
              aria-describedby={totalDescriptionId}
            >
              {priceReady
                ? (tableMenuVariant ? `Adicionar — ${brl(total * (enableProductQuantity ? productQuantity : 1))}` : 'Continuar')
                : 'Escolha os sabores'}
            </button>
          </S.BottomBar>
        </S.Form>
      </S.Layout>
    </S.Page>
  );

  return embedded ? configurator : createPortal(configurator, document.body);
}
