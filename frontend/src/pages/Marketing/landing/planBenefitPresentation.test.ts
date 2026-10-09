import { describe, expect, it } from 'vitest';

import { presentPlanBenefits } from './planBenefitPresentation';

describe('apresentação de benefícios dos planos', () => {
  it('mantém todos os benefícios com agrupamento e textos explicativos', () => {
    const originals = [
      'Sistema de delivery',
      'Implantação inicial assistida uma única vez',
      'Cadastro inicial de até 50 produtos, além de categorias, combos, banners e configurações',
      'Endereço público GastroNexa com /slug',
      'Suporte padrão',
    ];
    const presentation = presentPlanBenefits(originals);
    expect(presentation.sections.map((section) => section.label)).toEqual([
      'Recursos do plano',
      'Implantação',
      'Seu restaurante online',
      'Suporte',
    ]);
    expect(presentation.sections.flatMap((section) => section.items.map((item) => item.original))).toEqual(
      originals,
    );
    expect(presentation.sections[1].items[1]).toMatchObject({
      title: 'Cadastro inicial de até 50 produtos',
      detail: 'Inclui categorias, combos, banners e configurações.',
    });
  });

  it('destaca o bônus e identifica como futuro um recurso ainda indisponível', () => {
    const presentation = presentPlanBenefits([
      'Ganhe de graça uma máquina térmica de 58mm após o pagamento da primeira mensalidade',
      'Entregas com motoboys parceiros - Em breve',
      'Sistema de delivery',
    ]);
    expect(presentation.bonuses[0]).toMatchObject({
      title: 'Impressora térmica de 58 mm grátis',
      detail: 'Após o pagamento da primeira mensalidade.',
    });
    expect(presentation.upcoming[0].title).toBe('Entregas com motoboys parceiros');
    expect(presentation.sections).toHaveLength(1);
  });

  it('exibe herança do Premium sem duplicar recursos explícitos e preserva extras desconhecidos', () => {
    const presentation = presentPlanBenefits([
      'Tudo do Plano Premium',
      'Gestão assistida contínua, inclusive com atualizações diárias sob solicitação',
      'Solicitações de atualização ilimitadas',
      'Recurso customizado futuro',
    ]);
    expect(presentation.includesPremium).toBe(true);
    expect(presentation.sections.find((section) => section.category === 'management')?.items).toHaveLength(2);
    expect(presentation.sections.find((section) => section.category === 'operation')?.items[0].title).toBe(
      'Recurso customizado futuro',
    );
  });

  it('preserva fielmente valores e condições especiais de IA e domínio', () => {
    const presentation = presentPlanBenefits([
      'GastroNexa IA com US$ 2,00 de créditos iniciais',
      'Domínio próprio opcional com gestão técnica pela GastroNexa',
    ]);
    expect(presentation.sections[0].items[0]).toMatchObject({
      title: 'GastroNexa IA',
      detail: 'Com US$ 2,00 de créditos iniciais.',
    });
    expect(presentation.sections[1].items[0]).toMatchObject({
      title: 'Domínio próprio opcional',
      detail: 'Com gestão técnica da GastroNexa.',
    });
  });
});
