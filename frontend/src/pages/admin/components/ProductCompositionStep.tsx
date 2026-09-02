import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';

import * as S from '../Admin.styles';
import { groupIngredientsByCategory } from '../domain/ingredientCategoryGroups';
import type { AdminIngredient, AdminProductCompositionItem } from '../types';
import { IngredientThumbnail } from './IngredientThumbnail';

type ProductCompositionStepProps = {
  ingredients: AdminIngredient[];
  compositionItems: AdminProductCompositionItem[];
  onToggleIngredient: (ingredientId: number, selected: boolean) => void;
  onToggleRemovable: (ingredientId: number, removable: boolean) => void;
  onCreateIngredient?: () => void;
};

export function ProductCompositionStep({
  ingredients,
  compositionItems,
  onToggleIngredient,
  onToggleRemovable,
  onCreateIngredient,
}: ProductCompositionStepProps) {
  const [search, setSearch] = useState('');
  const activeIngredients = useMemo(
    () => ingredients.filter((ingredient) => ingredient.active),
    [ingredients],
  );
  const sections = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');
    return groupIngredientsByCategory(
      normalizedSearch
        ? activeIngredients.filter((ingredient) =>
            ingredient.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch),
          )
        : activeIngredients,
    );
  }, [activeIngredients, search]);

  return (
    <S.ProductAdvancedConfiguration className="composition-only">
      <section>
        <header>
          <div>
            <small>O QUE JÁ VEM NO PRODUTO</small>
            <h4>Selecione os ingredientes da receita</h4>
            <p>Depois, marque somente aqueles que o cliente poderá retirar.</p>
          </div>
          <span>{compositionItems.length} selecionado(s)</span>
        </header>

        <div className="composition-toolbar">
          <label>
            <Search />
            <input
              aria-label="Pesquisar ingredientes da composição"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar bacon, queijo, molho..."
            />
          </label>
          {onCreateIngredient && (
            <button type="button" onClick={onCreateIngredient}>
              <Plus /> Cadastrar novo ingrediente
            </button>
          )}
        </div>

        {!activeIngredients.length ? (
          <div className="advanced-empty">Cadastre ingredientes para definir a composição.</div>
        ) : !sections.length ? (
          <div className="advanced-empty">Nenhum ingrediente corresponde à busca.</div>
        ) : (
          <div className="composition-catalog">
            {sections.map((section) => (
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
                              onToggleIngredient(ingredient.id, event.target.checked)
                            }
                          />
                          <IngredientThumbnail ingredient={ingredient} />
                          <span>
                            <b>{ingredient.name}</b>
                            <small>{section.category}</small>
                          </span>
                        </label>
                        {item && (
                          <label className="removable-toggle">
                            <input
                              type="checkbox"
                              checked={item.removable}
                              onChange={(event) =>
                                onToggleRemovable(ingredient.id, event.target.checked)
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
    </S.ProductAdvancedConfiguration>
  );
}
