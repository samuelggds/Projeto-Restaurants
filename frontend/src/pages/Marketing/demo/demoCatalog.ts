import type { HomeData, HomeProduct } from '../../Home/types';

const catalog = [
  [
    'burger-classic',
    'Burger Clássico',
    'Pão brioche, carne 160g, queijo e molho da casa.',
    32.9,
    'Burgers',
    'burger-hero',
  ],
  [
    'combo-nexa',
    'Combo Nexa',
    'Burger especial, batata crocante e refrigerante.',
    44.9,
    'Combos',
    'burger-hero',
  ],
  [
    'pizza-house',
    'Pizza da Casa',
    'Massa artesanal, molho da casa e muçarela.',
    59.9,
    'Pizzas',
    'pizza',
  ],
  [
    'fries',
    'Batata crocante',
    'Batata sequinha com páprica e molho especial.',
    16.9,
    'Acompanhamentos',
    'fries',
  ],
  ['soda', 'Refrigerante', 'Lata 350 ml gelada.', 8.9, 'Bebidas', 'soda'],
  [
    'dessert',
    'Brigadeiro da casa',
    'Brigadeiro de chocolate cremoso, feito na casa.',
    18.9,
    'Sobremesas',
    'dessert',
  ],
] as const;

export const demoProducts: HomeProduct[] = catalog.map(
  ([id, name, description, price, categoryId, image], index) => ({
    id,
    name,
    description,
    price,
    categoryId,
    image: `/demo/${image}.webp`,
    originalPrice: index < 2 ? Math.round((price / 0.8) * 100) / 100 : price,
    promotion:
      index < 2
        ? {
            active: true,
            discountAmount: Math.round((price / 0.8) * 100) / 100 - price,
            discountPercentage: 20,
            badgeLabel: '20% OFF',
          }
        : undefined,
    rating: 0,
    available: true,
    saleMode: 'COMPLETE',
  }),
);

export const demoHomeData: HomeData = {
  brand: {
    name: 'GastroNexa Burger',
    monogram: 'GB',
    primaryColor: '#ba2de1',
    address: 'Rua Exemplo, 100 · endereço fictício',
  },
  hero: {
    title: 'Destaque',
    highlight: '20% OFF',
    description: 'Aproveite essa oferta',
    image: '/demo/pizza-hero.webp',
  },
  banners: [
    {
      id: 1,
      title: 'Destaque',
      highlight: '20% OFF',
      description: 'Aproveite essa oferta',
      buttonLabel: 'Ver cardápio',
      image: '/demo/pizza-hero.webp',
      active: true,
      position: 0,
    },
    {
      id: 2,
      title: 'Seu próximo favorito',
      highlight: 'feito na hora',
      description: 'Escolha seu burger e monte seu pedido.',
      buttonLabel: 'Ver cardápio',
      image: '/demo/burger-hero.webp',
      active: true,
      position: 1,
    },
    {
      id: 3,
      title: 'Para acompanhar',
      highlight: 'cada momento',
      description: 'Batatas crocantes e muito sabor.',
      buttonLabel: 'Ver cardápio',
      image: '/demo/fries-hero.webp',
      active: true,
      position: 2,
    },
  ],
  categories: [
    { id: 'todos', name: 'Todos', image: '' },
    ...catalog.map(([, , , , name, image]) => ({ id: name, name, image: `/demo/${image}.webp` })),
  ],
  products: demoProducts,
  deliveryTime: '30–45 min',
  minimumOrder: 0,
  freeDeliveryFrom: 0,
  acceptsDelivery: true,
  acceptsPickup: true,
  acceptsPix: true,
  acceptsCard: true,
  fontFamily: 'Inter',
  seoTitle: 'Demonstração | GastroNexa',
  seoDescription: 'Experimente um restaurante fictício.',
  isOpen: true,
  isOpenForOrders: true,
  about: 'Venha saborear seus favoritos, preparados para cada momento!',
};
