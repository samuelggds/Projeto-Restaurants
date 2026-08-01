import type { MenuCategory } from "../types/menu.types";

type CategoryRailProps = {
  categories: MenuCategory[];
  activeCategory: string;
  onSelect: (categoryId: string) => void;
};

export function CategoryRail({
  categories,
  activeCategory,
  onSelect,
}: CategoryRailProps) {
  return (
    <nav className="category-rail" aria-label="Categorias do cardápio">
      {categories.map((category) => (
        <button
          key={category.id}
          className={activeCategory === category.id ? "active" : ""}
          type="button"
          onClick={() => onSelect(category.id)}
        >
          <span aria-hidden="true">{category.icon}</span>
          {category.name}
        </button>
      ))}
    </nav>
  );
}
