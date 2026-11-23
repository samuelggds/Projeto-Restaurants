import { homeMockData } from '../../../Home/data';
import type { ProductOptionGroup } from '../../../Home/domain/productCustomization';
import type { HomeData, PublicPromotionalCoupon } from '../../../Home/types';
import { demoPhotoPath, demoStores, type DemoSlug } from './catalog';
import { couponCode } from './demoSession';

export const demoPromotionalCoupon: PublicPromotionalCoupon = {
  id: 1,
  code: couponCode,
  title: '10% de desconto',
  description: 'Economize 10% no valor dos produtos.',
  discountType: 'PERCENTAGE',
  discount: 10,
  minimumSubtotal: 0,
  audience: 'ALL',
  allowDelivery: true,
  allowPickup: true,
  allowTable: false,
};

const bannerCopy: Record<DemoSlug, { title: string; highlight: string; description: string }> = {
  'forno-alto': {
    title: 'Margherita',
    highlight: 'do nosso forno',
    description: 'Massa de longa fermentação, manjericão e muçarela.',
  },
  'braseiro-burger': {
    title: 'Brasa Bacon',
    highlight: 'com cheddar',
    description: 'Burger na chapa, cheddar e bacon crocante.',
  },
  'acai-da-mata': {
    title: 'Açaí da mata',
    highlight: 'com frutas',
    description: 'Açaí gelado, banana, morangos e granola.',
  },
  'salvia-trattoria': {
    title: 'Massa fresca',
    highlight: 'ao ragù',
    description: 'Fitas de massa fresca e ragù cozido lentamente.',
  },
};

const customizations: Partial<Record<string, { group: string; choices: string[] }>> = {
  'margherita-individual': { group: 'Finalização', choices: ['Manjericão fresco', 'Orégano'] },
  'burger-classico': { group: 'Molho', choices: ['Molho da casa', 'Maionese verde'] },
  'acai-grande': { group: 'Cobertura', choices: ['Granola crocante', 'Leite em pó'] },
  'tagliatelle-duo': { group: 'Parmesão', choices: ['Por cima da massa', 'Embalado à parte'] },
};

function getOptionGroups(productId: string): ProductOptionGroup[] {
  const customization = customizations[productId];
  if (!customization) return [];
  return [
    {
      id: productId + '-escolha',
      name: customization.group,
      selectionType: 'SINGLE',
      required: true,
      minSelections: 1,
      maxSelections: 1,
      options: customization.choices.map((name, index) => ({
        id: productId + '-opcao-' + index,
        name,
        price: 0,
        active: true,
      })),
    },
  ];
}

export function getDemoHomeData(slug: DemoSlug): HomeData {
  const store = demoStores[slug];
  const hero = { ...bannerCopy[slug], image: store.cover };
  const categories = [...new Set(store.products.map((product) => product.category))];
  return {
    ...homeMockData,
    brand: {
      name: store.name,
      category: store.category.toLocaleUpperCase('pt-BR'),
      logoUrl: `${demoPhotoPath}/logo-${slug}.svg`,
      primaryColor: store.color,
      coverUrl: store.cover,
      address: 'Praça do Mercado, 42 · Centro',
    },
    hero,
    banners: [{ ...hero, id: 1, active: true, position: 0, buttonLabel: 'Ver cardápio' }],
    categories: categories.map((name) => ({
      id: name,
      name,
      image: store.products.find((product) => product.category === name)!.image,
    })),
    products: store.products.map((product, index) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      categoryId: product.category,
      price: product.price / 100,
      originalPrice: product.price / 100,
      image: product.image,
      rating: 0,
      available: true,
      featured: index === 0,
      kind: 'STANDARD',
      saleMode: customizations[product.id] ? 'BUILDABLE' : 'COMPLETE',
      optionGroups: getOptionGroups(product.id),
    })),
    isOpen: true,
    isOpenForOrders: true,
    deliveryTime: '30–40 min',
    deliveryFeeMode: 'FIXED',
    deliveryFee: 5,
  };
}
