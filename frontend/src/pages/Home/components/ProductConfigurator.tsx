import { ArrowLeft, Check, CircleAlert, Minus, Plus, UtensilsCrossed } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
};

type ProductConfiguratorProps = {
  product: ProductConfiguratorProduct;
  primaryColor?: string;
  onClose: () => void;
  onConfirm: (configuration: ProductConfiguration) => void;
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
  onConfirm,
}: ProductConfiguratorProps) {
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
  const [errors, setErrors] = useState<SelectionErrors>({});

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

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
    optionQuantities,
    portionConfiguration,
    portions,
  });
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
    if (!configurable || Object.keys(nextErrors).length) {
      const firstInvalidGroup = Object.keys(nextErrors)[0];
      if (firstInvalidGroup) {
        document.getElementById(`product-group-${firstInvalidGroup}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
      return;
    }
    onConfirm(
      buildProductConfiguration(regularGroups, selections, observation, {
        optionQuantities,
        removedCompositionItemIds,
        portions,
        configurationVersion: product.configurationVersion,
      }),
    );
  };

  return createPortal(
    <S.Page
      $primary={primaryColor}
      role="dialog"
      aria-modal="true"
      aria-label={`Montar ${product.name}`}
      data-testid="product-configurator"
    >
      <S.Header>
        <S.HeaderInner>
          <button type="button" onClick={onClose}>
            <ArrowLeft size={19} /> Voltar ao cardápio
          </button>
          <span>Monte do seu jeito e confira antes de adicionar</span>
        </S.HeaderInner>
      </S.Header>

      <S.Layout>
        <S.ProductSummary>
          <img src={product.image} alt={product.name} decoding="async" />
          <div>
            <small>Personalize seu pedido</small>
            <h1>{product.name}</h1>
            <p>
              {product.description || 'Escolha as opções disponíveis para montar este produto.'}
            </p>
            {product.promotion?.active &&
              Number(product.originalPrice || 0) > Number(product.price || 0) && (
                <S.PromotionPrice>
                  <span>{product.promotion.badgeLabel}</span>
                  <del>{brl(Number(product.originalPrice))}</del>
                </S.PromotionPrice>
              )}
            <strong>A partir de {brl(product.price)}</strong>
            {product.promotion?.active && (
              <S.PromotionHint>
                O desconto já está aplicado ao produto-base. Adicionais mantêm o valor informado.
              </S.PromotionHint>
            )}
          </div>
        </S.ProductSummary>

        <S.Form onSubmit={submit} noValidate>
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

          {!configurable && (
            <S.Empty role="alert">
              <CircleAlert size={21} />
              <div>
                <b>Produto aguardando configuração</b>
                <p>Este restaurante ainda não cadastrou as opções deste produto.</p>
              </div>
            </S.Empty>
          )}

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
                id={`product-group-${group.id}`}
                key={group.id}
                $error={Boolean(errors[group.id])}
                aria-describedby={errors[group.id] ? `product-group-error-${group.id}` : undefined}
              >
                <S.GroupHeader>
                  <div>
                    <h3>{group.name}</h3>
                    {group.description && <p>{group.description}</p>}
                  </div>
                  <S.Badge $required={group.minSelections > 0}>
                    {group.minSelections > 0 ? 'Obrigatório' : 'Opcional'}
                  </S.Badge>
                </S.GroupHeader>

                <S.OptionList>
                  {group.options.map((option) => {
                    const isSelected = selected.includes(option.id);
                    const disabled = Boolean(
                      option.locked ||
                      (!isSelected && atLimit && group.selectionType === 'MULTIPLE'),
                    );
                    return (
                      <S.Option
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
                          <span>
                            <b>{option.name}</b>
                            {option.locked && <small>Já acompanha o produto</small>}
                          </span>
                          <strong>
                            {option.pricingMode === 'ABSOLUTE'
                              ? `Preço final ${brl(Number(option.absolutePrice ?? option.price))}`
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

          <S.Observation data-testid="product-configurator-observation">
            <div>
              <b>Alguma observação?</b>
              <span>Opcional</span>
            </div>
            <textarea
              value={observation}
              maxLength={500}
              onChange={(event) => setObservation(event.target.value)}
              placeholder="Ex.: Adicione aqui uma observação do produto..."
            />
            <small>{observation.length}/500 caracteres</small>
          </S.Observation>

          <S.BottomBar data-testid="product-configurator-footer">
            <div>
              <small>Total deste item</small>
              <strong>{brl(total)}</strong>
            </div>
            <button type="submit" disabled={!configurable}>
              Adicionar — {brl(total)}
            </button>
          </S.BottomBar>
        </S.Form>
      </S.Layout>
    </S.Page>,
    document.body,
  );
}
