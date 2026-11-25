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
export const toggleStorefrontTheme = 'gastronexa:toggle-storefront-theme';

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
      {
        id: 'calabresa-cebola',
        name: 'Calabresa com cebola',
        description: 'Pizza de oito fatias com molho de tomate, muçarela, calabresa fatiada e cebola.',
        price: 4690,
        image: `${demoPhotoPath}/calabresa-cebola.webp`,
        category: 'Pizzas',
      },
      {
        id: 'quatro-queijos',
        name: 'Pizza quatro queijos',
        description: 'Muçarela, gorgonzola, parmesão e requeijão gratinados. Serve duas pessoas.',
        price: 5290,
        image: `${demoPhotoPath}/quatro-queijos.webp`,
        category: 'Pizzas',
      },
      {
        id: 'pao-de-alho',
        name: 'Pão de alho com ervas',
        description: 'Pão tostado no forno com manteiga de alho e salsinha, servido em fatias.',
        price: 1490,
        image: `${demoPhotoPath}/pao-de-alho.webp`,
        category: 'Entradas',
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
      {
        id: 'smash-duplo',
        name: 'Smash duplo',
        description: 'Dois discos de carne prensados na chapa, cheddar derretido e pão tostado.',
        price: 3290,
        image: `${demoPhotoPath}/smash-duplo.webp`,
        category: 'Burgers',
      },
      {
        id: 'frango-crocante',
        name: 'Burger de frango crocante',
        description: 'Filé de frango empanado, alface e maionese da casa no pão macio.',
        price: 2790,
        image: `${demoPhotoPath}/frango-crocante.webp`,
        category: 'Burgers',
      },
      fries,
      {
        id: 'onion-rings',
        name: 'Anéis de cebola',
        description: 'Porção de cebolas empanadas e fritas até dourar. Serve duas pessoas.',
        price: 1690,
        image: `${demoPhotoPath}/onion-rings.webp`,
        category: 'Porções',
      },
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
      {
        id: 'acai-pacoca',
        name: 'Açaí com paçoca',
        description: 'Tigela de 400 ml de açaí gelado com paçoca de amendoim esfarelada.',
        price: 2490,
        image: `${demoPhotoPath}/acai-pacoca.webp`,
        category: 'Tigelas de açaí',
      },
      {
        id: 'creme-cupuacu',
        name: 'Creme de cupuaçu',
        description: 'Creme gelado de polpa de cupuaçu, servido no copo de 300 ml.',
        price: 1890,
        image: `${demoPhotoPath}/creme-cupuacu.webp`,
        category: 'Cremes',
      },
      {
        id: 'vitamina-acai',
        name: 'Vitamina de açaí com banana',
        description: 'Açaí batido com banana e leite. Copo de 400 ml.',
        price: 1790,
        image: `${demoPhotoPath}/vitamina-acai.webp`,
        category: 'Bebidas',
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
      {
        id: 'nhoque-sugo',
        name: 'Nhoque ao sugo',
        description: 'Nhoque de batata com molho de tomate da casa e manjericão fresco.',
        price: 3690,
        image: `${demoPhotoPath}/nhoque-sugo.webp`,
        category: 'Massas',
      },
      {
        id: 'risoto-cogumelos',
        name: 'Risoto de cogumelos',
        description: 'Arroz arbóreo com cogumelos salteados e parmesão. Porção individual.',
        price: 4490,
        image: `${demoPhotoPath}/risoto-cogumelos.webp`,
        category: 'Risotos',
      },
      {
        id: 'bruschetta',
        name: 'Bruschetta de tomate',
        description: 'Fatias de pão rústico tostado com tomate fresco, manjericão e azeite.',
        price: 1990,
        image: `${demoPhotoPath}/bruschetta.webp`,
        category: 'Entradas',
      },
      flan,
      soda,
    ],
  },
};
