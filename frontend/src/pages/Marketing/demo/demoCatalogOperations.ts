import type { DemoAdminData } from './demoAdminData';
import type { MenuImportSummary } from '../../../Services/menuImportService';

export type DemoCatalogAccess = {
  get: () => DemoAdminData;
  save: (patch: Partial<DemoAdminData>) => void;
};

/** A fixed fictitious result lets visitors try the import flow without contacting a provider. */
export function importDemoCatalog(
  catalog: DemoCatalogAccess,
  nextId: () => number,
): MenuImportSummary {
  const current = catalog.get();
  const existing = current.categories.find((category) => category.name === 'Importados · exemplo');
  const category = existing ?? { id: 950000 + nextId(), name: 'Importados · exemplo' };
  const names = ['Burger importado · exemplo', 'Combo importado · exemplo'];
  const products = names
    .filter((name) => !current.products.some((product) => product.name === name))
    .map((name, index) => ({
      id: String(950000 + nextId()),
      name,
      description: 'Produto fictício adicionado pela simulação de importação.',
      price: index ? 44.9 : 32.9,
      categoryId: category.id,
      category: category.name,
      image: new URL('/demo/burger-hero.webp', location.origin).href,
      active: true,
      stock: null,
      saleMode: 'COMPLETE' as const,
      optionGroups: [],
      compositionItems: [],
    }));
  catalog.save({
    categories: existing ? current.categories : [...current.categories, category],
    products: [...current.products, ...products],
  });
  return {
    restaurantName: current.settings.restaurantName,
    categoriesCreated: existing ? 0 : 1,
    productsCreated: products.length,
    createdCategories: existing ? [] : [category],
    createdProducts: products.map((product) => ({ id: Number(product.id), name: product.name })),
    demoNotice:
      'Importação simulada com produtos de exemplo. O link ou a imagem não foi enviado a nenhum serviço externo.',
  };
}
