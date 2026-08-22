import { ArrowLeft, Check, CircleAlert } from 'lucide-react';
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
  type SelectionErrors,
} from '../domain/productCustomization';
import * as S from './ProductConfigurator.styles';

type ProductConfiguratorProduct = ConfigurableProduct & {
  id: string;
  name: string;
  description: string;
  image: string;
  price: number;
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
  const [selections, setSelections] = useState(() => createInitialSelections(groups));
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

  const requiredGroups = groups.filter((group) => group.minSelections > 0);
  const completedRequiredGroups = requiredGroups.filter(
    (group) => (selections[group.id] || []).length >= group.minSelections,
  ).length;
  const progress = requiredGroups.length
    ? Math.round((completedRequiredGroups / requiredGroups.length) * 100)
    : 100;
  const total = productConfigurationTotal(product.price, groups, selections);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateProductSelections(groups, selections);
    setErrors(nextErrors);
    if (!groups.length || Object.keys(nextErrors).length) {
      const firstInvalidGroup = Object.keys(nextErrors)[0];
      if (firstInvalidGroup) {
        document.getElementById(`product-group-${firstInvalidGroup}`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
      return;
    }
    onConfirm(buildProductConfiguration(groups, selections, observation));
  };

  return createPortal(
    <S.Page $primary={primaryColor} role="dialog" aria-modal="true" aria-label={`Montar ${product.name}`}>
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
          <img src={product.image} alt={product.name} />
          <div>
            <small>Personalize seu pedido</small>
            <h1>{product.name}</h1>
            <p>{product.description || 'Escolha as opções disponíveis para montar este produto.'}</p>
            <strong>A partir de {brl(product.price)}</strong>
          </div>
        </S.ProductSummary>

        <S.Form onSubmit={submit} noValidate>
          <S.Intro>
            <div>
              <h2>Monte seu produto</h2>
              <p>Faça uma escolha em cada categoria e personalize os itens opcionais.</p>
            </div>
            <S.Progress $value={progress} aria-label={`${progress}% das escolhas obrigatórias concluídas`}>
              <div />
              <small>
                {requiredGroups.length
                  ? `${completedRequiredGroups} de ${requiredGroups.length} obrigatórios`
                  : 'Sem escolhas obrigatórias'}
              </small>
            </S.Progress>
          </S.Intro>

          {!groups.length && (
            <S.Empty role="alert">
              <CircleAlert size={21} />
              <div>
                <b>Produto aguardando configuração</b>
                <p>Este restaurante ainda não cadastrou as opções deste produto.</p>
              </div>
            </S.Empty>
          )}

          {groups.map((group) => {
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
                      option.locked || (!isSelected && atLimit && group.selectionType === 'MULTIPLE'),
                    );
                    return (
                      <S.Option
                        key={option.id}
                        $selected={isSelected}
                        $disabled={disabled && !option.locked}
                      >
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
                              toggleProductOption(groups, current, group.id, option.id),
                            );
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
                        <strong>{option.price > 0 ? `+ ${brl(option.price)}` : 'Incluso'}</strong>
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

          <S.Observation>
            <div>
              <b>Alguma observação?</b>
              <span>Opcional</span>
            </div>
            <textarea
              value={observation}
              maxLength={500}
              onChange={(event) => setObservation(event.target.value)}
              placeholder="Ex.: cortar ao meio, molho à parte, ponto da carne..."
            />
            <small>{observation.length}/500 caracteres</small>
          </S.Observation>

          <S.BottomBar>
            <div>
              <small>Total deste item</small>
              <strong>{brl(total)}</strong>
            </div>
            <button type="submit" disabled={!groups.length}>
              Adicionar à sacola
            </button>
          </S.BottomBar>
        </S.Form>
      </S.Layout>
    </S.Page>,
    document.body,
  );
}
