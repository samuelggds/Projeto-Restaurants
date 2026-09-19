import type { Dispatch, SetStateAction } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers3,
  PackageOpen,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import * as S from '../Admin.styles';
import type {
  AdminIngredient,
  AdminProductCompositionItem,
  AdminProductOptionGroup,
  AdminProductPortionConfiguration,
} from '../types';
import {
  MIXED_INGREDIENT_CATEGORY,
  groupIngredientsByCategory,
  inferGroupIngredientCategory,
  ingredientBelongsToCategory,
  type IngredientCategorySection,
} from '../domain/ingredientCategoryGroups';
import { IngredientThumbnail } from './IngredientThumbnail';
import * as C from '../styles/AdminProductConfigurationExperience.styles';

export type PendingCategoryChange = {
  groupIndex: number;
  nextCategory: string;
  incompatibleIds: number[];
  incompatibleNames: string[];
};

type ProductConfigurationWorkspaceProps = {
  name: string;
  description: string;
  image: string;
  price: string;
  showComposition?: boolean;
  ingredients: AdminIngredient[];
  activeIngredients: AdminIngredient[];
  activeIngredientSections: IngredientCategorySection[];
  ingredientCategories: string[];
  optionGroups: AdminProductOptionGroup[];
  editingGroupIndex: number | null;
  setEditingGroupIndex: Dispatch<SetStateAction<number | null>>;
  groupCategories: string[];
  compositionItems: AdminProductCompositionItem[];
  portionConfiguration: AdminProductPortionConfiguration | null;
  pendingCategoryChange: PendingCategoryChange | null;
  canCreateIngredient: boolean;
  openIngredientWizard: (groupIndex: number) => void;
  updateGroup: (
    groupIndex: number,
    update: (group: AdminProductOptionGroup) => AdminProductOptionGroup,
  ) => void;
  updateGroupOption: (
    groupIndex: number,
    ingredientId: number,
    patch: Partial<AdminProductOptionGroup['options'][number]>,
  ) => void;
  moveGroup: (groupIndex: number, direction: -1 | 1) => void;
  removeGroup: (groupIndex: number) => void;
  selectGroupCategory: (groupIndex: number, nextCategory: string) => void;
  confirmGroupCategoryChange: () => void;
  toggleGroupIngredient: (groupIndex: number, ingredientId: number, selected: boolean) => void;
  toggleCompositionIngredient: (ingredientId: number, selected: boolean) => void;
  setPendingCategoryChange: Dispatch<SetStateAction<PendingCategoryChange | null>>;
  setCompositionItems: Dispatch<SetStateAction<AdminProductCompositionItem[]>>;
  setPortionConfiguration: Dispatch<SetStateAction<AdminProductPortionConfiguration | null>>;
};

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function customerSelectionHint(group: AdminProductOptionGroup) {
  if (group.selectionType === 'SINGLE') return 'Escolha 1 opção';
  if (group.minSelections > 0 && group.minSelections !== group.maxSelections) {
    return `Escolha de ${group.minSelections} até ${group.maxSelections}`;
  }
  if (group.minSelections > 0) return `Escolha pelo menos ${group.minSelections}`;
  return `Escolha até ${group.maxSelections}`;
}

function customerOptionPrice(
  option: AdminProductOptionGroup['options'][number],
  ingredient: AdminIngredient | undefined,
) {
  if (option.pricingMode === 'ABSOLUTE') {
    return `Preço final ${money(Number(option.absolutePrice ?? option.additionalPrice ?? 0))}`;
  }
  const additionalPrice = Number(option.additionalPrice ?? ingredient?.price ?? 0);
  return additionalPrice > 0 ? `+ ${money(additionalPrice)}` : 'Incluso';
}

export function ProductConfigurationWorkspace({
  name,
  description,
  image,
  price,
  showComposition = true,
  ingredients,
  activeIngredients,
  activeIngredientSections,
  ingredientCategories,
  optionGroups,
  editingGroupIndex,
  setEditingGroupIndex,
  groupCategories,
  compositionItems,
  portionConfiguration,
  pendingCategoryChange,
  canCreateIngredient,
  openIngredientWizard,
  updateGroup,
  updateGroupOption,
  moveGroup,
  removeGroup,
  selectGroupCategory,
  confirmGroupCategoryChange,
  toggleGroupIngredient,
  toggleCompositionIngredient,
  setPendingCategoryChange,
  setCompositionItems,
  setPortionConfiguration,
}: ProductConfigurationWorkspaceProps) {
  const moveGroupAndEditor = (groupIndex: number, direction: -1 | 1) => {
    const destinationIndex = groupIndex + direction;
    moveGroup(groupIndex, direction);
    setEditingGroupIndex((current) => {
      if (current === groupIndex) return destinationIndex;
      if (current === destinationIndex) return groupIndex;
      return current;
    });
  };

  const removeGroupAndEditor = (groupIndex: number) => {
    removeGroup(groupIndex);
    setEditingGroupIndex((current) => {
      if (current === null || current < groupIndex) return current;
      if (current === groupIndex) return null;
      return current - 1;
    });
  };

  return (
    <C.ProductConfigurationLayout>
      <div className="configuration-groups">
        {!activeIngredients.length ? (
          <S.ProductCustomizationEmpty>
            <Layers3 />
            <div>
              <b>Cadastre ingredientes antes de montar o produto</b>
              <p>
                Feche este formulário, abra a aba Ingredientes e registre as opções com seus
                valores.
              </p>
            </div>
          </S.ProductCustomizationEmpty>
        ) : !optionGroups.length ? (
          <S.ProductCustomizationEmpty>
            <Layers3 />
            <div>
              <b>Este produto ainda não possui categorias de escolha</b>
              <p>Use “Adicionar etapa” e vincule apenas opções do mesmo tipo em cada uma.</p>
            </div>
          </S.ProductCustomizationEmpty>
        ) : (
          <S.ProductOptionGroupList className="configuration-list">
            {optionGroups.map((group, groupIndex) => {
              const selectedIds = new Set(group.options.map((option) => option.ingredientId));
              const sourceCategory = groupCategories[groupIndex] || '';
              const legacyCategory = inferGroupIngredientCategory(group, ingredients);
              const isLegacyMixed = sourceCategory === MIXED_INGREDIENT_CATEGORY;
              const visibleIngredients = isLegacyMixed
                ? ingredients.filter((ingredient) => selectedIds.has(ingredient.id))
                : sourceCategory
                  ? ingredients.filter((ingredient) =>
                      ingredientBelongsToCategory(ingredient, sourceCategory),
                    )
                  : [];
              const visibleSections = groupIngredientsByCategory(visibleIngredients);
              const categoryChange =
                pendingCategoryChange?.groupIndex === groupIndex ? pendingCategoryChange : null;
              return (
                <article
                  data-testid="product-option-group"
                  aria-label={`Etapa ${groupIndex + 1}: ${group.name || 'sem nome'}`}
                  className={
                    group.name.trim() && sourceCategory && group.options.length
                      ? 'group-complete'
                      : ''
                  }
                  key={group.id ?? `new-${groupIndex}`}
                >
                  <header>
                    <div className="group-number">{groupIndex + 1}</div>
                    <div className="group-copy">
                      <small className="group-kicker">ETAPA {groupIndex + 1} PARA O CLIENTE</small>
                      <b>{group.name || `Etapa ${groupIndex + 1}`}</b>
                      <span>
                        {group.selectionType === 'SINGLE' ? 'Somente 1 opção' : 'Várias opções'}
                        {' · '}
                        {group.required ? 'Obrigatório' : 'Opcional'}
                      </span>
                      <small className="group-summary">
                        {group.options.length
                          ? `Cliente escolhe de ${group.minSelections} a ${
                              group.selectionType === 'SINGLE' ? 1 : group.maxSelections
                            } entre ${group.options.length} opção(ões)`
                          : 'Nenhuma opção vinculada nesta categoria'}
                      </small>
                    </div>
                    <div className="group-selection-summary">
                      <small>Seleção</small>
                      <span>
                        Min. {group.minSelections} · Máx.{' '}
                        {group.selectionType === 'SINGLE' ? 1 : group.maxSelections}
                      </span>
                    </div>
                    <div className="group-option-preview" aria-hidden="true">
                      {group.options.slice(0, 3).map((option) => (
                        <span key={option.ingredientId}>
                          {ingredients.find((item) => item.id === option.ingredientId)?.name ||
                            `Opção ${option.ingredientId}`}
                        </span>
                      ))}
                      {group.options.length > 3 && <span>+{group.options.length - 3}</span>}
                    </div>
                    <div className="group-state">
                      {group.name.trim() && sourceCategory && group.options.length ? (
                        <>
                          <CheckCircle2 /> Pronta
                        </>
                      ) : (
                        'Incompleta'
                      )}
                    </div>
                    <div className="group-tools">
                      <div className="group-order-actions">
                        <button
                          aria-label={`Subir etapa ${groupIndex + 1}`}
                          disabled={groupIndex === 0}
                          type="button"
                          onClick={() => moveGroupAndEditor(groupIndex, -1)}
                        >
                          <ChevronUp />
                        </button>
                        <button
                          aria-label={`Descer etapa ${groupIndex + 1}`}
                          disabled={groupIndex === optionGroups.length - 1}
                          type="button"
                          onClick={() => moveGroupAndEditor(groupIndex, 1)}
                        >
                          <ChevronDown />
                        </button>
                      </div>
                      <button
                        aria-controls={`product-option-group-editor-${groupIndex}`}
                        aria-expanded={editingGroupIndex === groupIndex}
                        className="edit-group"
                        type="button"
                        onClick={() =>
                          setEditingGroupIndex((current) =>
                            current === groupIndex ? null : groupIndex,
                          )
                        }
                      >
                        {editingGroupIndex === groupIndex ? 'Concluir' : 'Editar'}
                      </button>
                      <button
                        aria-label={`Remover etapa ${groupIndex + 1}`}
                        className="remove-group"
                        type="button"
                        onClick={() => removeGroupAndEditor(groupIndex)}
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </header>

                  {editingGroupIndex === groupIndex && (
                    <div className="group-editor" id={`product-option-group-editor-${groupIndex}`}>
                      <div className="group-editor-intro">
                        <i>{groupIndex + 1}</i>
                        <span>
                          <b>Configure a etapa {groupIndex + 1} seguindo a ordem abaixo</b>
                          <small>Cada alteração aparece na prévia do cliente ao lado.</small>
                        </span>
                      </div>
                      <div className="guided-step-heading">
                        <i>1</i>
                        <span>
                          <b>Escreva a pergunta que o cliente verá</b>
                          <small>
                            Dê um nome direto e escolha a categoria onde estão as respostas. Ex.:
                            “Escolha o tamanho” + categoria “Tamanhos”.
                          </small>
                        </span>
                        <em>
                          {group.name.trim() && sourceCategory ? 'Pronto' : 'Preencha os campos'}
                        </em>
                      </div>
                      <div className="group-fields">
                        <S.Field>
                          Nome da etapa (pergunta para o cliente)
                          <input
                            maxLength={60}
                            value={group.name}
                            onChange={(event) => {
                              const nextName = event.target.value;
                              setPortionConfiguration((current) =>
                                current?.optionGroupName === group.name
                                  ? { ...current, optionGroupName: nextName }
                                  : current,
                              );
                              updateGroup(groupIndex, (current) => ({
                                ...current,
                                name: nextName,
                              }));
                            }}
                            placeholder="Ex.: Escolha o tamanho"
                          />
                          <small>Use poucas palavras e comece com um verbo.</small>
                        </S.Field>
                        <S.Field>
                          Categoria das opções
                          <select
                            value={sourceCategory}
                            onChange={(event) =>
                              selectGroupCategory(groupIndex, event.target.value)
                            }
                          >
                            <option value="">Selecione uma categoria</option>
                            {isLegacyMixed && (
                              <option disabled value={MIXED_INGREDIENT_CATEGORY}>
                                Etapa antiga com categorias misturadas
                              </option>
                            )}
                            {ingredientCategories.map((ingredientCategory) => (
                              <option key={ingredientCategory} value={ingredientCategory}>
                                {ingredientCategory}
                              </option>
                            ))}
                          </select>
                          <small>
                            Mostra somente os ingredientes que poderão responder a esta pergunta.
                          </small>
                        </S.Field>
                        <S.Field $full>
                          Ajuda abaixo da pergunta (opcional)
                          <input
                            maxLength={180}
                            value={group.description ?? ''}
                            onChange={(event) =>
                              updateGroup(groupIndex, (current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            placeholder="Ex.: Selecione uma opção para continuar"
                          />
                          <small>Use apenas quando o título não explicar tudo sozinho.</small>
                        </S.Field>
                      </div>

                      {isLegacyMixed && (
                        <div className="legacy-category-warning" role="status">
                          <b>Esta etapa antiga mistura categorias</b>
                          <span>
                            {legacyCategory.categories.length
                              ? `Encontradas: ${legacyCategory.categories.join(', ')}.`
                              : 'As opções vinculadas não estão mais disponíveis no catálogo.'}{' '}
                            Escolha uma categoria de ingredientes para organizar a etapa. Nada será
                            removido sem sua confirmação.
                          </span>
                        </div>
                      )}

                      {categoryChange && (
                        <div className="category-change-confirm" role="alert">
                          <div>
                            <b>Trocar para “{categoryChange.nextCategory}”?</b>
                            <span>
                              {categoryChange.incompatibleIds.length}{' '}
                              {categoryChange.incompatibleIds.length === 1
                                ? 'opção incompatível será removida'
                                : 'opções incompatíveis serão removidas'}
                              : {categoryChange.incompatibleNames.slice(0, 3).join(', ')}
                              {categoryChange.incompatibleNames.length > 3 ? '…' : ''}.
                            </span>
                          </div>
                          <button type="button" onClick={() => setPendingCategoryChange(null)}>
                            Manter atual
                          </button>
                          <button
                            className="confirm-category-change"
                            type="button"
                            onClick={confirmGroupCategoryChange}
                          >
                            Trocar e remover
                          </button>
                        </div>
                      )}

                      <div className="guided-step-heading">
                        <i>2</i>
                        <span>
                          <b>Defina como a escolha funcionará</b>
                          <small>
                            Use “Somente uma” para tamanho ou massa. Use “Várias opções” para
                            adicionais e informe se o cliente pode pular esta etapa.
                          </small>
                        </span>
                        <em>Regra definida</em>
                      </div>
                      <div className="choice-mode-field">
                        <b>Quantas opções poderão ser escolhidas?</b>
                        <div role="group" aria-label="Quantidade de opções permitidas">
                          {(['SINGLE', 'MULTIPLE'] as const).map((selectionType) => (
                            <button
                              className={group.selectionType === selectionType ? 'active' : ''}
                              key={selectionType}
                              type="button"
                              onClick={() =>
                                updateGroup(groupIndex, (current) => ({
                                  ...current,
                                  selectionType,
                                  maxSelections:
                                    selectionType === 'SINGLE'
                                      ? 1
                                      : Math.max(1, current.maxSelections),
                                }))
                              }
                            >
                              <i>{selectionType === 'SINGLE' ? '1' : '+'}</i>
                              <span>
                                <b>
                                  {selectionType === 'SINGLE' ? 'Somente uma' : 'Várias opções'}
                                </b>
                                <small>
                                  {selectionType === 'SINGLE'
                                    ? 'Ex.: o cliente escolhe uma massa'
                                    : 'Ex.: o cliente marca vários adicionais'}
                                </small>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="required-choice">
                        <b>A escolha será obrigatória?</b>
                        <div role="group" aria-label="O cliente precisa escolher">
                          <button
                            className={group.required ? 'active' : ''}
                            type="button"
                            onClick={() =>
                              updateGroup(groupIndex, (current) => ({
                                ...current,
                                required: true,
                                minSelections: Math.max(1, current.minSelections),
                              }))
                            }
                          >
                            <b>Sim, o cliente precisa escolher</b>
                            <small>Ele só continua depois de selecionar.</small>
                          </button>
                          <button
                            className={!group.required ? 'active' : ''}
                            type="button"
                            onClick={() =>
                              updateGroup(groupIndex, (current) => ({
                                ...current,
                                required: false,
                                minSelections: 0,
                              }))
                            }
                          >
                            <b>Não, ele pode continuar sem escolher</b>
                            <small>Esta etapa fica opcional.</small>
                          </button>
                        </div>
                      </div>

                      <details className="advanced-settings group-limits">
                        <summary>Configurações avançadas da etapa</summary>
                        <div className="group-rules">
                          <div className="rule-heading">
                            <b>Limites de escolha</b>
                            <span>Ajuste somente quando a regra simples não for suficiente.</span>
                          </div>
                          <label>
                            Mínimo de escolhas
                            <input
                              type="number"
                              min={group.required ? 1 : 0}
                              max={Math.max(1, group.options.length)}
                              value={group.minSelections}
                              onChange={(event) =>
                                updateGroup(groupIndex, (current) => ({
                                  ...current,
                                  minSelections: Number(event.target.value),
                                  required: Number(event.target.value) > 0,
                                }))
                              }
                            />
                          </label>
                          <label>
                            Máximo de escolhas
                            <input
                              type="number"
                              min="1"
                              max={Math.max(1, group.options.length)}
                              disabled={group.selectionType === 'SINGLE'}
                              value={group.selectionType === 'SINGLE' ? 1 : group.maxSelections}
                              onChange={(event) =>
                                updateGroup(groupIndex, (current) => ({
                                  ...current,
                                  maxSelections: Number(event.target.value),
                                }))
                              }
                            />
                          </label>
                        </div>
                      </details>

                      <div className="customer-rule-summary">
                        <Eye />
                        <span>
                          Na prévia, o cliente verá{' '}
                          <b>“{group.name || `Etapa ${groupIndex + 1}`}”</b> e poderá escolher{' '}
                          <b>
                            {group.selectionType === 'SINGLE'
                              ? '1 opção'
                              : `de ${group.minSelections} a ${group.maxSelections} opções`}
                          </b>{' '}
                          entre <b>{group.options.length} vinculada(s)</b>.
                        </span>
                      </div>

                      <div className="guided-step-heading">
                        <i>3</i>
                        <span>
                          <b>Marque as respostas que aparecerão</b>
                          <small>
                            Selecione os ingredientes desta categoria. O nome e o preço de cada um
                            serão mostrados ao cliente na mesma ordem.
                          </small>
                        </span>
                        <em className={group.options.length ? '' : 'pending'}>
                          {group.options.length
                            ? `${group.options.length} selecionada(s)`
                            : 'Selecione ao menos 1'}
                        </em>
                      </div>
                      <fieldset className="group-options">
                        <legend>
                          <span>Opções disponíveis · {group.options.length} selecionada(s)</span>
                          {canCreateIngredient && (
                            <button
                              type="button"
                              disabled={!sourceCategory || isLegacyMixed}
                              onClick={() => openIngredientWizard(groupIndex)}
                            >
                              <Plus /> Cadastrar novo ingrediente
                            </button>
                          )}
                        </legend>
                        <p className="group-options-hint">
                          {isLegacyMixed
                            ? 'Por segurança, abaixo aparecem somente as opções antigas já vinculadas, separadas por categoria.'
                            : sourceCategory
                              ? `Exibindo os ingredientes de “${sourceCategory}”. O nome da etapa continua independente.`
                              : 'Escolha uma categoria de ingredientes acima para visualizar as opções disponíveis.'}
                        </p>
                        {visibleSections.map((section) => (
                          <section className="source-category-section" key={section.key}>
                            <header>
                              <b>{section.category}</b>
                              <span>{section.ingredients.length} opção(ões)</span>
                            </header>
                            <div>
                              {section.ingredients.map((ingredient) => {
                                const selected = selectedIds.has(ingredient.id);
                                return (
                                  <label
                                    className={`${selected ? 'selected' : ''} ${ingredient.active ? '' : 'inactive'}`}
                                    key={ingredient.id}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selected}
                                      disabled={!ingredient.active && !selected}
                                      onChange={(event) =>
                                        toggleGroupIngredient(
                                          groupIndex,
                                          ingredient.id,
                                          event.target.checked,
                                        )
                                      }
                                    />
                                    <IngredientThumbnail ingredient={ingredient} />
                                    <span>
                                      <b>{ingredient.name}</b>
                                      <small>
                                        {!ingredient.active
                                          ? 'Inativo'
                                          : ingredient.price > 0
                                            ? `+ ${money(ingredient.price)}`
                                            : 'Sem acréscimo'}
                                      </small>
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </section>
                        ))}
                        {!visibleSections.length && (
                          <div className="source-category-empty">
                            Nenhum ingrediente disponível nesta categoria.
                          </div>
                        )}
                      </fieldset>

                      {!!group.options.length && (
                        <details className="advanced-settings option-settings">
                          <summary>Configurações avançadas das opções</summary>
                          <S.ProductOptionConfiguration>
                            <header>
                              <div>
                                <b>Preço e comportamento neste produto</b>
                                <span>
                                  Ajustes feitos aqui não alteram o ingrediente no restante do
                                  cardápio.
                                </span>
                              </div>
                              <small>{group.options.length} opção(ões)</small>
                            </header>
                            <div className="configured-option-list">
                              {group.options.map((option) => {
                                const ingredient = ingredients.find(
                                  (item) => item.id === option.ingredientId,
                                );
                                const additionalPrice = Number(
                                  option.additionalPrice ?? ingredient?.price ?? 0,
                                );
                                const quantityEnabled = option.allowQuantity === true;
                                return (
                                  <article key={option.ingredientId}>
                                    <div className="configured-option-title">
                                      <span>
                                        <b>
                                          {ingredient?.name ||
                                            `Ingrediente #${option.ingredientId}`}
                                        </b>
                                        <small>{ingredient?.category || 'Opção vinculada'}</small>
                                      </span>
                                      <label className="active-option-toggle">
                                        <input
                                          type="checkbox"
                                          checked={option.active !== false}
                                          onChange={(event) =>
                                            updateGroupOption(groupIndex, option.ingredientId, {
                                              active: event.target.checked,
                                            })
                                          }
                                        />
                                        Ativa
                                      </label>
                                    </div>

                                    <div
                                      className="pricing-mode"
                                      role="group"
                                      aria-label={`Preço de ${ingredient?.name || 'opção'}`}
                                    >
                                      <span className="advanced-question">
                                        Como este valor altera o preço?
                                      </span>
                                      <button
                                        className={
                                          option.pricingMode !== 'ABSOLUTE' ? 'active' : ''
                                        }
                                        type="button"
                                        onClick={() =>
                                          updateGroupOption(groupIndex, option.ingredientId, {
                                            pricingMode: 'ADDITIVE',
                                            absolutePrice: null,
                                          })
                                        }
                                      >
                                        <b>Acréscimo</b>
                                        <small>Soma ao preço inicial</small>
                                      </button>
                                      <button
                                        className={
                                          option.pricingMode === 'ABSOLUTE' ? 'active' : ''
                                        }
                                        type="button"
                                        onClick={() =>
                                          updateGroupOption(groupIndex, option.ingredientId, {
                                            pricingMode: 'ABSOLUTE',
                                            absolutePrice:
                                              option.absolutePrice ??
                                              Number(price || 0) + additionalPrice,
                                          })
                                        }
                                      >
                                        <b>Preço final</b>
                                        <small>Substitui o preço inicial</small>
                                      </button>
                                    </div>

                                    <label className="option-price-field">
                                      {option.pricingMode === 'ABSOLUTE'
                                        ? 'Preço final desta escolha'
                                        : 'Acréscimo desta escolha'}
                                      <span>
                                        R$
                                        <input
                                          type="number"
                                          min="0"
                                          max="99999"
                                          step="0.01"
                                          value={
                                            option.pricingMode === 'ABSOLUTE'
                                              ? (option.absolutePrice ?? '')
                                              : additionalPrice
                                          }
                                          onChange={(event) =>
                                            updateGroupOption(groupIndex, option.ingredientId, {
                                              ...(option.pricingMode === 'ABSOLUTE'
                                                ? { absolutePrice: Number(event.target.value) }
                                                : { additionalPrice: Number(event.target.value) }),
                                            })
                                          }
                                        />
                                      </span>
                                    </label>

                                    <div className="option-behavior">
                                      <label>
                                        <input
                                          type="checkbox"
                                          checked={option.defaultSelected === true}
                                          disabled={option.locked === true}
                                          onChange={(event) =>
                                            updateGroupOption(groupIndex, option.ingredientId, {
                                              defaultSelected: event.target.checked,
                                            })
                                          }
                                        />
                                        <span>
                                          <b>Já vem selecionado</b>
                                          <small>Já aparece marcada para o cliente.</small>
                                        </span>
                                      </label>
                                      <label>
                                        <input
                                          type="checkbox"
                                          checked={option.locked === true}
                                          onChange={(event) =>
                                            updateGroupOption(groupIndex, option.ingredientId, {
                                              locked: event.target.checked,
                                              defaultSelected: event.target.checked
                                                ? true
                                                : option.defaultSelected,
                                            })
                                          }
                                        />
                                        <span>
                                          <b>Cliente não pode remover</b>
                                          <small>Vem marcada e não pode ser desmarcada.</small>
                                        </span>
                                      </label>
                                      <label>
                                        <input
                                          type="checkbox"
                                          checked={quantityEnabled}
                                          onChange={(event) =>
                                            updateGroupOption(groupIndex, option.ingredientId, {
                                              allowQuantity: event.target.checked,
                                              ...(!event.target.checked
                                                ? {
                                                    minQuantity: 1,
                                                    maxQuantity: 1,
                                                    defaultQuantity: 1,
                                                  }
                                                : {
                                                    minQuantity: 1,
                                                    maxQuantity: 5,
                                                    defaultQuantity: 1,
                                                  }),
                                            })
                                          }
                                        />
                                        <span>
                                          <b>Cliente pode escolher quantidade</b>
                                          <small>Exibe botões de menos e mais.</small>
                                        </span>
                                      </label>
                                    </div>

                                    {quantityEnabled && (
                                      <div className="quantity-rules">
                                        <label>
                                          Mínima
                                          <input
                                            type="number"
                                            min="1"
                                            max="99"
                                            value={option.minQuantity ?? 1}
                                            onChange={(event) =>
                                              updateGroupOption(groupIndex, option.ingredientId, {
                                                minQuantity: Number(event.target.value),
                                              })
                                            }
                                          />
                                        </label>
                                        <label>
                                          Inicial
                                          <input
                                            type="number"
                                            min="1"
                                            max="99"
                                            value={option.defaultQuantity ?? 1}
                                            onChange={(event) =>
                                              updateGroupOption(groupIndex, option.ingredientId, {
                                                defaultQuantity: Number(event.target.value),
                                              })
                                            }
                                          />
                                        </label>
                                        <label>
                                          Máxima
                                          <input
                                            type="number"
                                            min="1"
                                            max="99"
                                            value={option.maxQuantity ?? 1}
                                            onChange={(event) =>
                                              updateGroupOption(groupIndex, option.ingredientId, {
                                                maxQuantity: Number(event.target.value),
                                              })
                                            }
                                          />
                                        </label>
                                      </div>
                                    )}
                                  </article>
                                );
                              })}
                            </div>
                          </S.ProductOptionConfiguration>
                        </details>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </S.ProductOptionGroupList>
        )}

        <S.ProductAdvancedConfiguration>
          {showComposition && (
            <section>
              <header>
                <div>
                  <small>COMPOSIÇÃO</small>
                  <h4>O que já acompanha o produto?</h4>
                  <p>
                    Registre a receita incluída no preço e marque somente o que o cliente pode
                    retirar.
                  </p>
                </div>
                <span>{compositionItems.length} item(ns)</span>
              </header>
              {!activeIngredients.length ? (
                <div className="advanced-empty">
                  Cadastre ingredientes para definir a composição.
                </div>
              ) : (
                <div className="composition-catalog">
                  {activeIngredientSections.map((section) => (
                    <fieldset key={section.key}>
                      <legend>{section.category}</legend>
                      <div>
                        {section.ingredients.map((ingredient) => {
                          const item = compositionItems.find(
                            (entry) => entry.ingredientId === ingredient.id,
                          );
                          return (
                            <div className={item ? 'selected' : ''} key={ingredient.id}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={Boolean(item)}
                                  onChange={(event) =>
                                    toggleCompositionIngredient(ingredient.id, event.target.checked)
                                  }
                                />
                                <IngredientThumbnail ingredient={ingredient} />
                                <span>
                                  <b>{ingredient.name}</b>
                                  <small>Incluído na receita</small>
                                </span>
                              </label>
                              {item && (
                                <label className="removable-toggle">
                                  <input
                                    type="checkbox"
                                    checked={item.removable}
                                    onChange={(event) =>
                                      setCompositionItems((current) =>
                                        current.map((entry) =>
                                          entry.ingredientId === ingredient.id
                                            ? { ...entry, removable: event.target.checked }
                                            : entry,
                                        ),
                                      )
                                    }
                                  />
                                  Cliente pode retirar
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              )}
            </section>
          )}

          <details className="advanced-settings portion-settings">
            <summary>
              Configurações avançadas de divisão em porções
              <span>{portionConfiguration?.enabled ? 'Ativada' : 'Desativada'}</span>
            </summary>
            <section>
              <header>
                <div>
                  <small>PORÇÕES</small>
                  <h4>O produto pode ser dividido?</h4>
                  <p>Use uma das etapas acima como catálogo para cada parte do produto.</p>
                </div>
                <label className="feature-switch">
                  <input
                    type="checkbox"
                    checked={portionConfiguration?.enabled === true}
                    disabled={!optionGroups.length}
                    onChange={(event) =>
                      setPortionConfiguration(
                        event.target.checked
                          ? {
                              enabled: true,
                              optionGroupName: optionGroups[0]?.name ?? '',
                              minPortions: 2,
                              maxPortions: 2,
                              pricingStrategy: 'HIGHEST',
                              allowPortionObservations: true,
                            }
                          : null,
                      )
                    }
                  />
                  {portionConfiguration?.enabled ? 'Ativada' : 'Desativada'}
                </label>
              </header>
              {portionConfiguration?.enabled ? (
                <div className="portion-admin-grid">
                  <S.Field $full>
                    Etapa usada em cada porção
                    <select
                      value={portionConfiguration.optionGroupName}
                      onChange={(event) =>
                        setPortionConfiguration((current) =>
                          current ? { ...current, optionGroupName: event.target.value } : current,
                        )
                      }
                    >
                      <option value="">Selecione uma etapa</option>
                      {optionGroups.map((group, index) => (
                        <option key={group.id ?? `portion-group-${index}`} value={group.name}>
                          {group.name || `Etapa ${index + 1}`}
                        </option>
                      ))}
                    </select>
                    <small>As opções vinculadas a essa etapa serão oferecidas em cada parte.</small>
                  </S.Field>
                  <S.Field>
                    Mínimo de porções
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={portionConfiguration.minPortions}
                      onChange={(event) =>
                        setPortionConfiguration((current) =>
                          current
                            ? { ...current, minPortions: Number(event.target.value) }
                            : current,
                        )
                      }
                    />
                  </S.Field>
                  <S.Field>
                    Máximo de porções
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={portionConfiguration.maxPortions}
                      onChange={(event) =>
                        setPortionConfiguration((current) =>
                          current
                            ? { ...current, maxPortions: Number(event.target.value) }
                            : current,
                        )
                      }
                    />
                  </S.Field>
                  <S.Field $full>
                    Como calcular o valor das porções?
                    <select
                      value={portionConfiguration.pricingStrategy}
                      onChange={(event) =>
                        setPortionConfiguration((current) =>
                          current
                            ? {
                                ...current,
                                pricingStrategy: event.target
                                  .value as AdminProductPortionConfiguration['pricingStrategy'],
                              }
                            : current,
                        )
                      }
                    >
                      <option value="HIGHEST">Usar a opção de maior valor</option>
                      <option value="AVERAGE">Usar a média das opções</option>
                      <option value="PROPORTIONAL">Dividir proporcionalmente</option>
                      <option value="ADD">Somar todas as opções</option>
                      <option value="FIXED">Manter somente o preço inicial</option>
                    </select>
                    <small>
                      O total exibido ao cliente é uma estimativa; o servidor recalcula antes do
                      pedido.
                    </small>
                  </S.Field>
                  <label className="portion-observation-toggle">
                    <input
                      type="checkbox"
                      checked={portionConfiguration.allowPortionObservations}
                      onChange={(event) =>
                        setPortionConfiguration((current) =>
                          current
                            ? { ...current, allowPortionObservations: event.target.checked }
                            : current,
                        )
                      }
                    />
                    Permitir uma observação diferente em cada porção
                  </label>
                </div>
              ) : (
                <div className="advanced-empty">
                  {optionGroups.length
                    ? 'Ative para permitir que o cliente escolha opções diferentes por parte.'
                    : 'Crie ao menos uma etapa antes de ativar porções.'}
                </div>
              )}
            </section>
          </details>
        </S.ProductAdvancedConfiguration>
      </div>

      <div className="configuration-preview">
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
              <strong>A partir de {Number(price) > 0 ? money(Number(price)) : 'R$ 0,00'}</strong>
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
                      const ingredient = ingredients.find(
                        (item) => item.id === option.ingredientId,
                      );
                      return (
                        <div key={option.ingredientId}>
                          <i className={group.selectionType === 'SINGLE' ? 'radio' : ''} />
                          <span>
                            <b>{ingredient?.name || `Opção ${option.ingredientId}`}</b>
                            {option.locked && <small>Já acompanha o produto</small>}
                          </span>
                          <strong>{customerOptionPrice(option, ingredient)}</strong>
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
              <strong>{Number(price) > 0 ? money(Number(price)) : 'R$ 0,00'}</strong>
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
      </div>
    </C.ProductConfigurationLayout>
  );
}
