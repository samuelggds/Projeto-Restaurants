export const RESTAURANT_CATEGORIES = [
  'RESTAURANTE',
  'PIZZARIA',
  'HAMBURGUERIA',
  'ACAITERIA',
  'CAFETERIA',
  'JAPONESA',
  'CHURRASCARIA',
  'DOCERIA',
  'LANCHONETE',
  'PADARIA',
  'OUTRO',
] as const;

export type RestaurantCategory = (typeof RESTAURANT_CATEGORIES)[number];

export const RESTAURANT_CATEGORY_OPTIONS: Array<{
  value: RestaurantCategory;
  label: string;
}> = [
  { value: 'RESTAURANTE', label: 'Restaurante' },
  { value: 'PIZZARIA', label: 'Pizzaria' },
  { value: 'HAMBURGUERIA', label: 'Hamburgueria' },
  { value: 'ACAITERIA', label: 'Açaíteria' },
  { value: 'CAFETERIA', label: 'Cafeteria' },
  { value: 'JAPONESA', label: 'Japonês / Sushi' },
  { value: 'CHURRASCARIA', label: 'Churrascaria' },
  { value: 'DOCERIA', label: 'Doceria / Confeitaria' },
  { value: 'LANCHONETE', label: 'Lanchonete' },
  { value: 'PADARIA', label: 'Padaria' },
  { value: 'OUTRO', label: 'Outro estabelecimento' },
];

const CATEGORY_SET = new Set<string>(RESTAURANT_CATEGORIES);

export function normalizeRestaurantCategory(value: unknown): RestaurantCategory {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (CATEGORY_SET.has(normalized)) return normalized as RestaurantCategory;
  if (normalized === 'ACAI' || normalized === 'ACAITERIA') return 'ACAITERIA';
  if (normalized.includes('PIZZA')) return 'PIZZARIA';
  if (normalized.includes('HAMBUR')) return 'HAMBURGUERIA';
  if (normalized.includes('CAFE')) return 'CAFETERIA';
  if (normalized.includes('SUSHI') || normalized.includes('JAP')) return 'JAPONESA';
  if (normalized.includes('CHURR')) return 'CHURRASCARIA';
  if (normalized.includes('DOCE') || normalized.includes('CONFEIT')) return 'DOCERIA';
  if (normalized.includes('LANCHE')) return 'LANCHONETE';
  if (normalized.includes('PADAR')) return 'PADARIA';
  return 'RESTAURANTE';
}

export function getRestaurantCategoryLabel(category: RestaurantCategory) {
  return (
    RESTAURANT_CATEGORY_OPTIONS.find((option) => option.value === category)?.label || 'Restaurante'
  );
}

export type AuthHeroMode = 'login' | 'register' | 'recover';

type CategoryPresentation = {
  iconLabel: string;
  noun: string;
  loginHeadline: string;
  loginSupport: string;
  registerHeadline: string;
  registerSupport: string;
  recoverHeadline: string;
  recoverSupport: string;
};

const PRESENTATIONS: Record<RestaurantCategory, CategoryPresentation> = {
  RESTAURANTE: {
    iconLabel: 'restaurante',
    noun: 'restaurante',
    loginHeadline: 'Tudo o que seu restaurante precisa para atender melhor.',
    loginSupport: 'Pedidos, cardápio e operação conectados em um só lugar.',
    registerHeadline: 'Crie sua conta e continue sua experiência no restaurante.',
    registerSupport: 'Acompanhe pedidos, benefícios e seus dados com praticidade.',
    recoverHeadline: 'Recupere seu acesso de forma simples e segura.',
    recoverSupport: 'Use seu e-mail ou telefone cadastrado para redefinir sua senha.',
  },
  PIZZARIA: {
    iconLabel: 'pizza',
    noun: 'pizzaria',
    loginHeadline: 'A experiência digital da sua pizzaria começa aqui.',
    loginSupport: 'Acesse pedidos, cardápio e atendimento em poucos segundos.',
    registerHeadline: 'Sua conta para aproveitar tudo da pizzaria.',
    registerSupport: 'Cadastre-se para pedir, acompanhar e voltar sempre que quiser.',
    recoverHeadline: 'Volte a pedir sua pizza sem complicação.',
    recoverSupport: 'Recupere seu acesso com segurança por e-mail ou telefone.',
  },
  HAMBURGUERIA: {
    iconLabel: 'hamburguer',
    noun: 'hamburgueria',
    loginHeadline: 'Sua hamburgueria favorita, agora ainda mais perto.',
    loginSupport: 'Entre para acompanhar pedidos, cardápio e novidades.',
    registerHeadline: 'Crie sua conta e deixe o próximo burger mais fácil.',
    registerSupport: 'Tenha seus pedidos e dados sempre à mão.',
    recoverHeadline: 'Recupere seu acesso e volte para o seu pedido.',
    recoverSupport: 'Receba um código seguro por e-mail ou telefone.',
  },
  ACAITERIA: {
    iconLabel: 'acai sobremesa',
    noun: 'açaíteria',
    loginHeadline: 'Seu açaí do seu jeito, com uma experiência mais simples.',
    loginSupport: 'Entre para acessar pedidos, combinações e benefícios.',
    registerHeadline: 'Crie sua conta e monte seus favoritos com facilidade.',
    registerSupport: 'Salve seus dados e acompanhe seus pedidos em um só lugar.',
    recoverHeadline: 'Recupere seu acesso sem perder seus favoritos.',
    recoverSupport: 'Use e-mail ou telefone para redefinir sua senha com segurança.',
  },
  CAFETERIA: {
    iconLabel: 'cafe bebida',
    noun: 'cafeteria',
    loginHeadline: 'Seu café, seus pedidos e sua experiência em um só lugar.',
    loginSupport: 'Entre para pedir mais rápido e acompanhar cada pedido.',
    registerHeadline: 'Crie sua conta e deixe sua próxima pausa mais simples.',
    registerSupport: 'Acesse pedidos, novidades e benefícios da cafeteria.',
    recoverHeadline: 'Recupere seu acesso com segurança.',
    recoverSupport: 'Receba um código por e-mail ou telefone para redefinir sua senha.',
  },
  JAPONESA: {
    iconLabel: 'sushi japones peixe',
    noun: 'restaurante japonês',
    loginHeadline: 'Uma experiência digital à altura do seu pedido.',
    loginSupport: 'Entre para acessar cardápio, pedidos e benefícios.',
    registerHeadline: 'Crie sua conta e peça seus favoritos com mais facilidade.',
    registerSupport: 'Acompanhe pedidos e mantenha seus dados organizados.',
    recoverHeadline: 'Recupere seu acesso de forma segura.',
    recoverSupport: 'Use seu e-mail ou telefone cadastrado para redefinir a senha.',
  },
  CHURRASCARIA: {
    iconLabel: 'churrasco carne',
    noun: 'churrascaria',
    loginHeadline: 'Sua experiência na churrascaria começa antes da primeira mesa.',
    loginSupport: 'Entre para acessar pedidos, cardápio e atendimento.',
    registerHeadline: 'Crie sua conta e facilite suas próximas experiências.',
    registerSupport: 'Tenha pedidos e dados sempre disponíveis.',
    recoverHeadline: 'Recupere seu acesso em poucos passos.',
    recoverSupport: 'Receba um código seguro por e-mail ou telefone.',
  },
  DOCERIA: {
    iconLabel: 'sobremesa doce bolo',
    noun: 'doceria',
    loginHeadline: 'Seus doces favoritos a poucos cliques de distância.',
    loginSupport: 'Entre para acompanhar pedidos, novidades e benefícios.',
    registerHeadline: 'Crie sua conta e deixe seus favoritos mais perto.',
    registerSupport: 'Acompanhe pedidos e aproveite uma experiência mais rápida.',
    recoverHeadline: 'Recupere seu acesso de forma simples.',
    recoverSupport: 'Use e-mail ou telefone para redefinir sua senha com segurança.',
  },
  LANCHONETE: {
    iconLabel: 'lanche sanduiche',
    noun: 'lanchonete',
    loginHeadline: 'Seu lanche favorito com uma experiência mais rápida.',
    loginSupport: 'Entre para acessar cardápio, pedidos e benefícios.',
    registerHeadline: 'Crie sua conta e agilize seus próximos pedidos.',
    registerSupport: 'Mantenha seus dados e histórico sempre disponíveis.',
    recoverHeadline: 'Recupere seu acesso e volte para o cardápio.',
    recoverSupport: 'Receba um código por e-mail ou telefone para redefinir a senha.',
  },
  PADARIA: {
    iconLabel: 'padaria pao trigo',
    noun: 'padaria',
    loginHeadline: 'Sua padaria de sempre com uma experiência digital mais simples.',
    loginSupport: 'Entre para acessar pedidos, produtos e novidades.',
    registerHeadline: 'Crie sua conta e facilite seus próximos pedidos.',
    registerSupport: 'Tenha seus dados, histórico e favoritos em um só lugar.',
    recoverHeadline: 'Recupere seu acesso com segurança.',
    recoverSupport: 'Use e-mail ou telefone para receber seu código de recuperação.',
  },
  OUTRO: {
    iconLabel: 'restaurante',
    noun: 'estabelecimento',
    loginHeadline: 'Uma experiência digital feita para atender você melhor.',
    loginSupport: 'Entre para acessar cardápio, pedidos e atendimento.',
    registerHeadline: 'Crie sua conta e aproveite uma experiência mais simples.',
    registerSupport: 'Acompanhe pedidos e mantenha seus dados em um só lugar.',
    recoverHeadline: 'Recupere seu acesso de forma segura.',
    recoverSupport: 'Receba um código por e-mail ou telefone para redefinir sua senha.',
  },
};

export function getRestaurantCategoryPresentation(value: unknown) {
  const category = normalizeRestaurantCategory(value);
  return { category, ...PRESENTATIONS[category] };
}

export function getAuthHeroCopy(value: unknown, mode: AuthHeroMode) {
  const presentation = getRestaurantCategoryPresentation(value);
  if (mode === 'register') {
    return { headline: presentation.registerHeadline, support: presentation.registerSupport };
  }
  if (mode === 'recover') {
    return { headline: presentation.recoverHeadline, support: presentation.recoverSupport };
  }
  return { headline: presentation.loginHeadline, support: presentation.loginSupport };
}
