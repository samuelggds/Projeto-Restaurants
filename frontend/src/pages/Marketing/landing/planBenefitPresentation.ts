export type PlanBenefitCategory =
  | 'operation'
  | 'setup'
  | 'management'
  | 'presence'
  | 'support';

export type PlanBenefit = {
  original: string;
  title: string;
  detail?: string;
};

export type PlanBenefitSection = {
  category: PlanBenefitCategory;
  label: string;
  items: PlanBenefit[];
};

export type PlanBenefitPresentation = {
  includesPremium: boolean;
  sections: PlanBenefitSection[];
  bonuses: PlanBenefit[];
  upcoming: PlanBenefit[];
};

const sectionLabels: Record<PlanBenefitCategory, string> = {
  operation: 'Recursos do plano',
  setup: 'Implantação',
  management: 'Gestão e atualizações',
  presence: 'Seu restaurante online',
  support: 'Suporte',
};

const sectionOrder: PlanBenefitCategory[] = [
  'operation',
  'setup',
  'management',
  'presence',
  'support',
];

function normalized(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function describeFeature(original: string): PlanBenefit {
  const text = normalized(original);

  if (text.startsWith('cadastro inicial de ate 50 produtos')) {
    return {
      original,
      title: 'Cadastro inicial de até 50 produtos',
      detail: 'Inclui categorias, combos, banners e configurações.',
    };
  }
  if (text.startsWith('cadastro inicial de ate 100 produtos')) {
    return { original, title: 'Cadastro inicial de até 100 produtos' };
  }
  if (text.startsWith('cadastro assistido de produtos') && text.includes('sem limite')) {
    return {
      original,
      title: 'Cadastro assistido sem limite de quantidade',
      detail: 'Produtos, categorias e combos.',
    };
  }
  if (text.includes('implantacao inicial assistida uma unica vez')) {
    return {
      original,
      title: 'Implantação inicial assistida',
      detail: 'Acompanhamento na configuração inicial, uma única vez.',
    };
  }
  if (text.startsWith('apos a implantacao')) {
    return {
      original,
      title: 'Autonomia para gerenciar seu restaurante',
      detail: 'Depois da implantação, o administrador cuida do cardápio e das configurações.',
    };
  }
  if (text.includes('gestao assistida continua')) {
    return {
      original,
      title: 'Gestão assistida contínua',
      detail: text.includes('diarias')
        ? 'Inclui atualizações diárias quando solicitadas.'
        : 'Acompanhamento sob solicitação.',
    };
  }
  if (text.startsWith('atualizacoes de produtos, precos')) {
    return {
      original,
      title: 'Atualização de cardápio e configurações',
      detail: 'Produtos, preços, categorias, combos e banners.',
    };
  }
  if (text.includes('solicitacoes de atualizacao ilimitadas')) {
    return { original, title: 'Solicitações de atualização ilimitadas' };
  }
  if (text.startsWith('endereco publico gastronexa')) {
    return {
      original,
      title: 'Link público do restaurante',
      detail: 'Endereço personalizado dentro da GastroNexa.',
    };
  }
  if (text.includes('dominio proprio opcional')) {
    return {
      original,
      title: 'Domínio próprio opcional',
      detail: text.includes('gestao tecnica')
        ? 'Com gestão técnica da GastroNexa.'
        : 'Com configuração pela GastroNexa.',
    };
  }
  if (text.includes('pagina personalizada do restaurante')) {
    return {
      original,
      title: 'Página personalizada opcional',
      detail: 'No domínio próprio do restaurante.',
    };
  }
  if (text.includes('cardapio em subdominio')) {
    return {
      original,
      title: 'Cardápio em subdomínio',
      detail: 'Quando a página personalizada estiver ativa.',
    };
  }
  if (text.startsWith('gastronexa ia com')) {
    return {
      original,
      title: 'GastroNexa IA',
      detail: text.includes('us$ 2,00')
        ? 'Com US$ 2,00 de créditos iniciais.'
        : 'Com créditos iniciais.',
    };
  }
  if (text.includes('maquina termica') || text.includes('impressora termica')) {
    const free = text.includes('gratis') || text.includes('de graca') || text.includes('gratuita');
    return {
      original,
      title: free ? 'Impressora térmica de 58 mm grátis' : 'Impressora térmica de 58 mm',
      detail: text.includes('primeira mensalidade')
        ? 'Após o pagamento da primeira mensalidade.'
        : undefined,
    };
  }
  if (text.includes('motoboys parceiros') && text.includes('em breve')) {
    return {
      original,
      title: 'Entregas com motoboys parceiros',
      detail: 'Recurso previsto para o futuro.',
    };
  }
  return { original, title: original };
}

function classifyFeature(
  original: string,
): PlanBenefitCategory | 'bonus' | 'upcoming' | 'premium' {
  const text = normalized(original);

  if (text === 'tudo do plano premium') return 'premium';
  if (text.includes('em breve')) return 'upcoming';
  if (text.includes('maquina termica') || text.includes('impressora termica')) return 'bonus';
  if (text.includes('suporte')) return 'support';
  if (
    text.includes('gestao assistida') ||
    text.includes('solicitacoes de atualizacao') ||
    text.startsWith('atualizacoes de ')
  ) {
    return 'management';
  }
  if (
    text.includes('dominio proprio') ||
    text.includes('subdominio') ||
    text.includes('pagina personalizada') ||
    text.includes('endereco publico') ||
    text.includes('link publico')
  ) {
    return 'presence';
  }
  if (
    text.includes('implantacao') ||
    text.includes('cadastro inicial') ||
    text.includes('cadastro assistido') ||
    text.includes('configuracao inicial') ||
    text.includes('configuracao visual e operacional inicial') ||
    text.includes('organizacao inicial') ||
    text.includes('revisao antes da publicacao')
  ) {
    return 'setup';
  }
  return 'operation';
}

export function presentPlanBenefits(features: readonly string[]): PlanBenefitPresentation {
  const groups = new Map<PlanBenefitCategory, PlanBenefit[]>();
  const bonuses: PlanBenefit[] = [];
  const upcoming: PlanBenefit[] = [];
  let includesPremium = false;

  for (const value of features) {
    const feature = value.trim();
    if (!feature) continue;

    const category = classifyFeature(feature);
    if (category === 'premium') {
      includesPremium = true;
      continue;
    }

    const item = describeFeature(feature);
    if (category === 'bonus') {
      bonuses.push(item);
    } else if (category === 'upcoming') {
      upcoming.push(item);
    } else {
      groups.set(category, [...(groups.get(category) ?? []), item]);
    }
  }

  return {
    includesPremium,
    sections: sectionOrder
      .filter((category) => groups.has(category))
      .map((category) => ({
        category,
        label: sectionLabels[category],
        items: groups.get(category) ?? [],
      })),
    bonuses,
    upcoming,
  };
}
