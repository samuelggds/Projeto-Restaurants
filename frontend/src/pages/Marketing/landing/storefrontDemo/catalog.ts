export type DemoSlug = 'forno-alto' | 'braseiro-burger' | 'acai-da-mata' | 'salvia-trattoria';

export type DemoProduct = {
  id: string;
  name: string;
  description: string;
  /** Price in Brazilian centavos. */
  price: number;
  image: string;
  category: string;
};

type DemoStore = {
  slug: DemoSlug;
  name: string;
  category: string;
  color: string;
  cover: string;
  products: DemoProduct[];
};

export const demoPhotoPath = '/marketing-vitrines/cardapios';

const pizza = `${demoPhotoPath}/pizza.webp`;
const burger = `${demoPhotoPath}/burger.webp`;
const acai = `${demoPhotoPath}/acai.webp`;
const pasta = `${demoPhotoPath}/pasta.webp`;

const fries: DemoProduct = {
  id: 'batata-crocante',
  name: 'Batata crocante',
  price: 1290,
  description: 'Porção de batatas douradas com molho da casa.',
  image: '/demo/fries.webp',
  category: 'Porções',
};
const soda: DemoProduct = {
  id: 'refrigerante-lata',
  name: 'Refrigerante em lata',
  price: 600,
  description: 'Cola gelada, lata de 350 ml.',
  image: '/demo/soda.webp',
  category: 'Bebidas',
};
const flan: DemoProduct = {
  id: 'pudim',
  name: 'Pudim de leite',
  price: 1290,
  description: 'Fatia individual com calda de caramelo.',
  image: `${demoPhotoPath}/dessert.webp`,
  category: 'Sobremesas',
};
const brigadeiro: DemoProduct = {
  id: 'brigadeiro',
  name: 'Brigadeiro de colher',
  price: 1090,
  description: 'Chocolate cremoso com granulado, servido no potinho.',
  image: '/demo/dessert.webp',
  category: 'Sobremesas',
};

export const demoStores: Record<DemoSlug, DemoStore> = {
  'forno-alto': {
    slug: 'forno-alto',
    name: 'Forno Alto',
    category: 'Pizzaria',
    color: '#af3326',
    cover: pizza,
    products: [
      {
        id: 'margherita',
        name: 'Margherita da casa',
        description:
          'Massa de longa fermentação, tomate, muçarela e manjericão. Serve duas pessoas.',
        price: 4890,
        image: pizza,
        category: 'Pizzas',
      },
      {
        id: 'margherita-individual',
        name: 'Margherita individual',
        description: 'A clássica da casa em tamanho individual, assada no forno de pedra.',
        price: 2890,
        image: pizza,
        category: 'Pizzas',
      },
      brigadeiro,
      soda,
    ],
  },
  'braseiro-burger': {
    slug: 'braseiro-burger',
    name: 'Braseiro Burger',
    category: 'Hamburgueria',
    color: '#a13b19',
    cover: burger,
    products: [
      {
        id: 'brasa-bacon',
        name: 'Brasa Bacon',
        description:
          'Burger na chapa com cheddar, bacon crocante e cebola caramelizada no brioche.',
        price: 2990,
        image: burger,
        category: 'Burgers',
      },
      {
        id: 'burger-classico',
        name: 'Clássico da chapa',
        description: 'Pão brioche tostado, burger bovino, queijo e molho da casa.',
        price: 2590,
        image: '/demo/burger-hero.webp',
        category: 'Burgers',
      },
      fries,
      soda,
    ],
  },
  'acai-da-mata': {
    slug: 'acai-da-mata',
    name: 'Açaí da Mata',
    category: 'Açaiteria',
    color: '#733d80',
    cover: acai,
    products: [
      {
        id: 'acai-frutas',
        name: 'Açaí com frutas',
        description: 'Tigela de 400 ml com banana, morango e granola crocante.',
        price: 2290,
        image: acai,
        category: 'Tigelas de açaí',
      },
      {
        id: 'acai-grande',
        name: 'Tigela da Mata 600 ml',
        description: 'Açaí batido com banana e finalizado com morangos e granola. Porção grande.',
        price: 2990,
        image: acai,
        category: 'Tigelas de açaí',
      },
      brigadeiro,
      soda,
    ],
  },
  'salvia-trattoria': {
    slug: 'salvia-trattoria',
    name: 'Sálvia Trattoria',
    category: 'Restaurante',
    color: '#45643c',
    cover: pasta,
    products: [
      {
        id: 'tagliatelle',
        name: 'Tagliatelle ao ragù',
        description: 'Fitas de massa fresca com ragù bovino cozido lentamente.',
        price: 4200,
        image: pasta,
        category: 'Massas',
      },
      {
        id: 'tagliatelle-duo',
        name: 'Tagliatelle para dois',
        description: 'Porção para compartilhar, com o ragù da casa e queijo ralado.',
        price: 7490,
        image: pasta,
        category: 'Massas',
      },
      flan,
      soda,
    ],
  },
};
