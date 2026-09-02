import type { AdminIngredient } from '../types';

type IngredientThumbnailProps = {
  ingredient: AdminIngredient;
};

export function IngredientThumbnail({ ingredient }: IngredientThumbnailProps) {
  return (
    <span className="ingredient-option-thumb" aria-hidden="true">
      <span>{ingredient.name.trim().charAt(0).toLocaleUpperCase('pt-BR') || 'I'}</span>
      {ingredient.image && (
        <img
          src={ingredient.image}
          alt=""
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
    </span>
  );
}
