import type { Dispatch, SetStateAction } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers3,
  PackageOpen,
  Plus,
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

export function ProductConfigurationWorkspace({
  name,
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
                      <div className="group-fields">
                        <S.Field>
                          <span className="guided-question">A. O que o cliente vai escolher?</span>
                          Nome da etapa
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
                            placeholder="Ex.: Escolha o tipo ou Adicione complementos"
                          />
                        </S.Field>
                        <S.Field>
                          <span className="guided-question">B. De onde vêm as opções?</span>
                          Categoria de ingredientes
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
                            Somente ingredientes desta categoria poderão ser vinculados.
                          </small>
                        </S.Field>
                        <div className="choice-mode-field">
                          <b>C. Quantas opções o cliente pode escolher?</b>
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
                                      ? 'Ex.: tipo de massa'
                                      : 'Ex.: adicionais'}
                                  </small>
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                        <S.Field $full>
                          Instrução para o cliente (opcional)
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

                      <div className="required-choice">
                        <b>D. Essa escolha é obrigatória?</b>
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
                          O cliente verá <b>“{group.name || `Etapa ${groupIndex + 1}`}”</b> e poderá
                          escolher{' '}
                          <b>
                            {group.selectionType === 'SINGLE'
                              ? '1 opção'
                              : `de ${group.minSelections} a ${group.maxSelections} opções`}
                          </b>{' '}
                          entre <b>{group.options.length} vinculada(s)</b>.
                        </span>
                      </div>

                      <fieldset className="group-options">
                        <legend>
                          <span>
                            E. Quais opções aparecerão? — {group.options.length} vinculada(s)
                          </span>
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
        <S.ProductCustomerPreview>
          <header>
            <Eye />
            <div>
              <b>Resumo da experiência do cliente</b>
              <span>Prévia das etapas configuradas</span>
            </div>
          </header>
          <div className="customer-preview-product">
            <span>
              <PackageOpen />
            </span>
            <div>
              <b>{name || 'Seu produto'}</b>
              <small>A partir de {Number(price) > 0 ? money(Number(price)) : 'R$ 0,00'}</small>
            </div>
          </div>
          <div className="customer-preview-steps">
            {optionGroups.length ? (
              optionGroups.map((group, index) => (
                <div
                  className={group.name.trim() && group.options.length ? 'ready' : ''}
                  key={group.id ?? `preview-${index}`}
                >
                  <i>{index + 1}</i>
                  <span>
                    <b>{group.name || `Etapa ${index + 1}`}</b>
                    <small>
                      {group.options.length} opção(ões) ·{' '}
                      {group.required ? 'Obrigatória' : 'Opcional'}
                    </small>
                  </span>
                  {group.name.trim() && group.options.length ? (
                    <CheckCircle2 />
                  ) : (
                    <span className="pending">Configurar</span>
                  )}
                </div>
              ))
            ) : (
              <p>Adicione a primeira categoria para visualizar a sequência de montagem.</p>
            )}
          </div>
        </S.ProductCustomerPreview>
      </div>
    </C.ProductConfigurationLayout>
  );
}
