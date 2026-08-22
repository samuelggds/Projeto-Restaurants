import { FormEvent, useMemo, useState } from 'react';
import { Layers3, Plus, Trash2, X } from 'lucide-react';
import { createPersistentImageDataUrl } from '../../../utils/persistentImage';
import * as S from '../Admin.styles';
import type {
  AdminCategory,
  AdminIngredient,
  AdminProduct,
  AdminProductOptionGroup,
} from '../types';
import {
  normalizeOptionGroup,
  validateOptionGroups,
} from '../domain/productCustomizationValidation';
import {
  MIXED_INGREDIENT_CATEGORY,
  groupIngredientsByCategory,
  incompatibleOptionsForCategory,
  inferGroupIngredientCategory,
  ingredientBelongsToCategory,
  listIngredientCategories,
} from '../domain/ingredientCategoryGroups';
import {
  isProductActiveFromStock,
  isUnlimitedStock,
  normalizeProductStock,
} from '../domain/productStock';

type ProductDrawerProps = {
  product: AdminProduct | null;
  categories: AdminCategory[];
  ingredients: AdminIngredient[];
  close: () => void;
  save: (product: AdminProduct) => Promise<void>;
};

type PendingCategoryChange = {
  groupIndex: number;
  nextCategory: string;
  incompatibleIds: number[];
  incompatibleNames: string[];
};

const emptyGroup = (): AdminProductOptionGroup => ({
  name: '',
  description: '',
  required: true,
  selectionType: 'SINGLE',
  minSelections: 1,
  maxSelections: 1,
  options: [],
});

const money = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function ProductDrawer({
  product,
  categories,
  ingredients,
  close,
  save,
}: ProductDrawerProps) {
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [image, setImage] = useState(product?.image ?? '');
  const [price, setPrice] = useState(String(product?.price ?? ''));
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? 0);
  const [stock, setStock] = useState(String(product?.stock ?? ''));
  const [unlimitedStock, setUnlimitedStock] = useState(isUnlimitedStock(product?.stock));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [optionGroups, setOptionGroups] = useState<AdminProductOptionGroup[]>(
    () => product?.optionGroups?.map((group) => ({ ...group, options: [...group.options] })) ?? [],
  );
  const [groupCategories, setGroupCategories] = useState<string[]>(() =>
    (product?.optionGroups || []).map(
      (group) => inferGroupIngredientCategory(group, ingredients).value,
    ),
  );
  const [pendingCategoryChange, setPendingCategoryChange] =
    useState<PendingCategoryChange | null>(null);
  const activeIngredients = useMemo(
    () => ingredients.filter((ingredient) => ingredient.active),
    [ingredients],
  );
  const ingredientCategories = useMemo(
    () => listIngredientCategories(ingredients),
    [ingredients],
  );

  const updateGroup = (
    groupIndex: number,
    update: (group: AdminProductOptionGroup) => AdminProductOptionGroup,
  ) => {
    setOptionGroups((current) =>
      current.map((group, index) => (index === groupIndex ? update(group) : group)),
    );
  };

  const toggleGroupIngredient = (groupIndex: number, ingredientId: number, selected: boolean) => {
    const sourceCategory = groupCategories[groupIndex];
    const ingredient = ingredients.find((item) => item.id === ingredientId);
    if (
      selected &&
      sourceCategory &&
      sourceCategory !== MIXED_INGREDIENT_CATEGORY &&
      (!ingredient || !ingredientBelongsToCategory(ingredient, sourceCategory))
    ) {
      return;
    }
    updateGroup(groupIndex, (group) => ({
      ...group,
      options: selected
        ? group.options.some((option) => option.ingredientId === ingredientId)
          ? group.options
          : [...group.options, { ingredientId, active: true }]
        : group.options.filter((option) => option.ingredientId !== ingredientId),
    }));
  };

  const addGroup = () => {
    setOptionGroups((current) => [...current, emptyGroup()]);
    setGroupCategories((current) => [...current, '']);
    setPendingCategoryChange(null);
  };

  const removeGroup = (groupIndex: number) => {
    setOptionGroups((current) => current.filter((_, index) => index !== groupIndex));
    setGroupCategories((current) => current.filter((_, index) => index !== groupIndex));
    setPendingCategoryChange(null);
  };

  const selectGroupCategory = (groupIndex: number, nextCategory: string) => {
    if (!nextCategory || nextCategory === MIXED_INGREDIENT_CATEGORY) return;
    const group = optionGroups[groupIndex];
    if (!group || groupCategories[groupIndex] === nextCategory) return;
    const incompatible = incompatibleOptionsForCategory(
      group.options,
      ingredients,
      nextCategory,
    );
    if (!incompatible.length) {
      setGroupCategories((current) =>
        current.map((category, index) => (index === groupIndex ? nextCategory : category)),
      );
      setPendingCategoryChange(null);
      return;
    }

    const ingredientsById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
    setPendingCategoryChange({
      groupIndex,
      nextCategory,
      incompatibleIds: incompatible.map((option) => option.ingredientId),
      incompatibleNames: incompatible.map(
        (option) =>
          ingredientsById.get(option.ingredientId)?.name ||
          `Ingrediente indisponível #${option.ingredientId}`,
      ),
    });
  };

  const confirmGroupCategoryChange = () => {
    if (!pendingCategoryChange) return;
    const { groupIndex, nextCategory, incompatibleIds } = pendingCategoryChange;
    const removedIds = new Set(incompatibleIds);
    updateGroup(groupIndex, (group) => {
      const options = group.options.filter((option) => !removedIds.has(option.ingredientId));
      const maxSelections =
        group.selectionType === 'SINGLE'
          ? 1
          : Math.min(Math.max(1, group.maxSelections), Math.max(1, options.length));
      const minSelections = group.required
        ? Math.min(Math.max(1, group.minSelections), options.length)
        : 0;
      return { ...group, options, minSelections, maxSelections };
    });
    setGroupCategories((current) =>
      current.map((category, index) => (index === groupIndex ? nextCategory : category)),
    );
    setPendingCategoryChange(null);
  };

  const uploadImage = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      setImage(await createPersistentImageDataUrl(file, 960));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : 'Não foi possível carregar a imagem.',
      );
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    const numericPrice = Number(price);
    if (!name.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0 || !categoryId) {
      setError('Preencha nome, preço base maior que zero e categoria.');
      return;
    }

    const unresolvedCategoryIndex = optionGroups.findIndex(
      (_, index) =>
        !groupCategories[index] ||
        groupCategories[index] === MIXED_INGREDIENT_CATEGORY,
    );
    if (unresolvedCategoryIndex >= 0) {
      setError(
        `Escolha uma categoria de ingredientes no grupo ${unresolvedCategoryIndex + 1} antes de salvar.`,
      );
      return;
    }

    const normalizedGroups = optionGroups.map(normalizeOptionGroup);
    const customizationErrors = validateOptionGroups(normalizedGroups, ingredients);
    if (customizationErrors.length) {
      setError(customizationErrors[0]);
      return;
    }

    setBusy(true);
    try {
      const normalizedStock = normalizeProductStock(stock, unlimitedStock);
      await save({
        id: product?.id ?? '',
        name: name.trim(),
        description: description.trim(),
        image: image.trim(),
        price: numericPrice,
        categoryId,
        category: categories.find((item) => item.id === categoryId)?.name ?? '',
        stock: normalizedStock,
        active: isProductActiveFromStock(normalizedStock),
        saleMode: 'BUILDABLE',
        optionGroups: normalizedGroups,
      });
    } catch (saveError) {
      const apiError = saveError as {
        response?: { data?: { error?: string; message?: string } };
      };
      setError(
        apiError.response?.data?.error ||
          apiError.response?.data?.message ||
          (saveError instanceof Error ? saveError.message : 'Não foi possível salvar o produto.'),
      );
      setBusy(false);
    }
  };

  return (
    <S.Overlay onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <S.ProductFormDrawer onSubmit={(event) => void submit(event)}>
        <header className="drawer-header">
          <div>
            <span>PRODUTO PERSONALIZÁVEL</span>
            <h2>{product ? 'Editar produto' : 'Novo produto'}</h2>
            <p>Cadastre o produto-base e organize as escolhas que o cliente fará.</p>
          </div>
          <button aria-label="Fechar cadastro" type="button" onClick={close}>
            <X />
          </button>
        </header>

        {error && <S.ProductFormError role="alert">{error}</S.ProductFormError>}

        <S.ProductFormSection>
          <div className="section-heading">
            <span>1</span>
            <div>
              <h3>Informações do produto-base</h3>
              <p>É assim que o item aparecerá na Home e no cardápio digital.</p>
            </div>
          </div>
          <div className="basic-fields">
            <S.Field>
              Nome do produto
              <input
                required
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ex.: Pizza personalizada, massa artesanal ou poke"
              />
            </S.Field>
            <S.Field>
              Preço base
              <input
                required
                type="number"
                min="0.01"
                max="999999"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="0,00"
              />
            </S.Field>
            <S.Field>
              Categoria
              <select
                required
                value={categoryId}
                onChange={(event) => setCategoryId(Number(event.target.value))}
              >
                <option value={0}>Selecione</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </S.Field>
            <S.Field $full>
              Descrição
              <textarea
                maxLength={500}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Explique a proposta do produto e o que já está incluído no preço base."
              />
            </S.Field>
            <S.Field>
              Foto do produto
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => void uploadImage(event.target.files?.[0])}
              />
            </S.Field>
            <S.Field>
              Ou use a URL da imagem
              <input value={image} onChange={(event) => setImage(event.target.value)} />
            </S.Field>
          </div>
          {image && (
            <img className="product-image-preview" src={image} alt={`Prévia de ${name || 'produto'}`} />
          )}
        </S.ProductFormSection>

        <S.ProductFormSection>
          <div className="section-heading customization-heading">
            <span>2</span>
            <div>
              <h3>Categorias de escolha</h3>
              <p>
                Dê um nome ao grupo, escolha a categoria-fonte e configure como o cliente decide.
              </p>
            </div>
            <button
              className="add-group"
              disabled={!activeIngredients.length}
              type="button"
              onClick={addGroup}
            >
              <Plus /> Adicionar categoria
            </button>
          </div>

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
                <p>
                  Use “Adicionar categoria” e vincule apenas opções do mesmo tipo em cada uma.
                </p>
              </div>
            </S.ProductCustomizationEmpty>
          ) : (
            <S.ProductOptionGroupList>
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
                  pendingCategoryChange?.groupIndex === groupIndex
                    ? pendingCategoryChange
                    : null;
                return (
                  <article key={group.id ?? `new-${groupIndex}`}>
                    <header>
                      <div className="group-number">{groupIndex + 1}</div>
                      <div>
                        <b>{group.name || `Grupo ${groupIndex + 1}`}</b>
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
                      <button
                        aria-label={`Remover grupo ${groupIndex + 1}`}
                        className="remove-group"
                        type="button"
                        onClick={() => removeGroup(groupIndex)}
                      >
                        <Trash2 />
                      </button>
                    </header>

                    <div className="group-fields">
                      <S.Field>
                        Nome do grupo
                        <input
                          maxLength={60}
                          value={group.name}
                          onChange={(event) =>
                            updateGroup(groupIndex, (current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          placeholder="Ex.: Escolha o tipo ou Adicione complementos"
                        />
                      </S.Field>
                      <S.Field>
                        Categoria-fonte dos ingredientes
                        <select
                          value={sourceCategory}
                          onChange={(event) =>
                            selectGroupCategory(groupIndex, event.target.value)
                          }
                        >
                          <option value="">Selecione uma categoria</option>
                          {isLegacyMixed && (
                            <option disabled value={MIXED_INGREDIENT_CATEGORY}>
                              Grupo antigo com categorias misturadas
                            </option>
                          )}
                          {ingredientCategories.map((ingredientCategory) => (
                            <option key={ingredientCategory} value={ingredientCategory}>
                              {ingredientCategory}
                            </option>
                          ))}
                        </select>
                        <small>Somente ingredientes desta categoria poderão ser vinculados.</small>
                      </S.Field>
                      <S.Field>
                        Quantas opções o cliente pode escolher?
                        <select
                          value={group.selectionType}
                          onChange={(event) => {
                            const selectionType = event.target.value as 'SINGLE' | 'MULTIPLE';
                            updateGroup(groupIndex, (current) => ({
                              ...current,
                              selectionType,
                              maxSelections:
                                selectionType === 'SINGLE'
                                  ? 1
                                  : Math.max(1, current.maxSelections),
                            }));
                          }}
                        >
                          <option value="SINGLE">Somente 1 opção</option>
                          <option value="MULTIPLE">Várias opções</option>
                        </select>
                      </S.Field>
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
                        <b>Este grupo antigo mistura categorias</b>
                        <span>
                          {legacyCategory.categories.length
                            ? `Encontradas: ${legacyCategory.categories.join(', ')}.`
                            : 'As opções vinculadas não estão mais disponíveis no catálogo.'}{' '}
                          Escolha uma categoria-fonte para organizar o grupo. Nada será removido sem
                          sua confirmação.
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

                    <div className="group-rules">
                      <label className="required-toggle" data-required={group.required}>
                        <input
                          type="checkbox"
                          checked={group.required}
                          onChange={(event) =>
                            updateGroup(groupIndex, (current) => ({
                              ...current,
                              required: event.target.checked,
                              minSelections: event.target.checked
                                ? Math.max(1, current.minSelections)
                                : 0,
                            }))
                          }
                        />
                        <span>
                          {group.required ? 'Categoria obrigatória' : 'Categoria opcional'}
                        </span>
                      </label>
                      <label>
                        Mínimo por cliente
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
                        Limite por cliente
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

                    <fieldset className="group-options">
                      <legend>
                        Opções do grupo — {group.options.length} vinculada(s)
                      </legend>
                      <p className="group-options-hint">
                        {isLegacyMixed
                          ? 'Por segurança, abaixo aparecem somente as opções antigas já vinculadas, separadas por categoria.'
                          : sourceCategory
                            ? `Exibindo o catálogo “${sourceCategory}”. O nome do grupo continua independente.`
                            : 'Escolha uma categoria-fonte acima para visualizar as opções disponíveis.'}
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
                  </article>
                );
              })}
            </S.ProductOptionGroupList>
          )}
        </S.ProductFormSection>

        <S.ProductFormSection>
          <div className="section-heading">
            <span>3</span>
            <div>
              <h3>Disponibilidade</h3>
              <p>Defina se o produto é feito sob demanda ou possui quantidade limitada.</p>
            </div>
          </div>
          <S.Field>
            Controle de estoque
            <label className="stock-toggle">
              <input
                type="checkbox"
                checked={unlimitedStock}
                onChange={(event) => setUnlimitedStock(event.target.checked)}
              />
              Estoque ilimitado (produto feito sob demanda)
            </label>
            {!unlimitedStock && (
              <input
                required
                type="number"
                min="0"
                step="1"
                placeholder="Quantidade disponível"
                value={stock}
                onChange={(event) => setStock(event.target.value.replace(/\D/g, ''))}
              />
            )}
          </S.Field>
        </S.ProductFormSection>

        <footer className="drawer-footer">
          <div>
            <b>{optionGroups.length} categoria(s) de escolha</b>
            <span>{activeIngredients.length} ingrediente(s) disponível(is)</span>
          </div>
          <button type="button" onClick={close}>Cancelar</button>
          <button className="primary" disabled={busy} type="submit">
            {busy ? 'Salvando...' : 'Salvar produto'}
          </button>
        </footer>
      </S.ProductFormDrawer>
    </S.Overlay>
  );
}
