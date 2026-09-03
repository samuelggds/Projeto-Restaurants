import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { LoyaltyProgramProps, LoyaltyRewardProgress } from '../types';
import { LoyaltyProgramCard } from './LoyaltyProgramCard';

function reward(overrides: Partial<LoyaltyRewardProgress> = {}): LoyaltyRewardProgress {
  return {
    coupon: {
      id: 7,
      code: 'FIEL10',
      title: 'Cliente fiel',
      description: 'Seu presente por voltar.',
      discountType: 'PERCENTAGE',
      discount: 10,
      minimumSubtotal: 0,
    },
    purchasesCompleted: 2,
    purchasesRequired: 5,
    remaining: 3,
    progressPercent: 40,
    canRedeem: false,
    redemptions: [],
    ...overrides,
  };
}

function loyalty(overrides: Partial<LoyaltyProgramProps> = {}): LoyaltyProgramProps {
  return {
    primaryColor: '#c95d3d',
    loading: false,
    loggedIn: true,
    summary: { purchasesCompleted: 2, rewards: [reward()] },
    onLogin: () => undefined,
    onRetry: () => undefined,
    onRedeem: () => undefined,
    ...overrides,
  };
}

describe('LoyaltyProgramCard', () => {
  it('resume um cupom resgatado em um aviso compacto', () => {
    const markup = renderToStaticMarkup(
      <LoyaltyProgramCard
        loyalty={loyalty({
          summary: {
            purchasesCompleted: 5,
            rewards: [
              reward({
                purchasesCompleted: 0,
                remaining: 5,
                progressPercent: 0,
                redemptions: [
                  {
                    id: 71,
                    cycle: 1,
                    status: 'CLAIMED',
                    coupon: reward().coupon,
                  },
                ],
              }),
            ],
          },
        })}
      />,
    );

    expect(markup).toContain('Cupom disponível');
    expect(markup).toContain('10% de desconto');
    expect(markup).not.toContain('Compre, complete e ganhe');
  });

  it('explica que a carteira está cheia sem tratar o benefício como encerrado', () => {
    const markup = renderToStaticMarkup(
      <LoyaltyProgramCard
        loyalty={loyalty({
          summary: {
            purchasesCompleted: 5,
            rewards: [
              reward({
                purchasesCompleted: 0,
                remaining: 0,
                progressPercent: 0,
                limitReached: true,
              }),
            ],
          },
        })}
      />,
    );

    expect(markup).toContain('Cupom já guardado');
    expect(markup).toContain('Use ou aguarde o vencimento para resgatar outro');
    expect(markup).not.toContain('Faltam 0');
  });

  it('oferece acesso ao programa para o cliente deslogado em tela móvel', () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    let markup: string;
    try {
      markup = renderToStaticMarkup(
        <LoyaltyProgramCard loyalty={loyalty({ loggedIn: false, summary: null })} />,
      );
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    }

    expect(markup).toContain('Ganhe descontos');
    expect(markup).toContain('Entre para acompanhar sua fidelidade');
    expect(markup).toContain('data-floating-drag-handle="true"');
  });

  it('diferencia falha de consulta de ausência de benefícios', () => {
    const markup = renderToStaticMarkup(
      <LoyaltyProgramCard
        loyalty={loyalty({
          error: 'Não foi possível consultar seus benefícios agora.',
          summary: null,
          onRetry: () => undefined,
        })}
      />,
    );

    expect(markup).toContain('Fidelidade indisponível');
    expect(markup).toContain('Toque para tentar novamente');
  });

  it('mantém o atalho visível quando ainda não há campanha ativa', () => {
    const markup = renderToStaticMarkup(
      <LoyaltyProgramCard
        loyalty={loyalty({
          summary: { purchasesCompleted: 0, rewards: [] },
        })}
      />,
    );

    expect(markup).toContain('Clube de vantagens');
    expect(markup).toContain('Toque para verificar novos cupons');
    expect(markup).toContain('Atualizar');
  });
});
