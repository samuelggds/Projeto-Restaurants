import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoyaltyProgramProps, LoyaltyRewardProgress } from '../types';
import { LoyaltyProgramCard } from './LoyaltyProgramCard';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

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

  it('mostra benefícios diretamente no painel móvel, sem outro recolhimento ou arraste', () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    try {
      const markup = renderToStaticMarkup(<LoyaltyProgramCard embedded loyalty={loyalty()} />);
      expect(markup).toContain('Faltam 3 pedidos');
      expect(markup).toContain('data-embedded="true"');
      expect(markup).not.toContain('customer-coupon-status-toggle');
      expect(markup).not.toContain('data-floating-drag-handle');
      expect(markup).not.toContain('arraste para mover');

      const guestMarkup = renderToStaticMarkup(
        <LoyaltyProgramCard embedded loyalty={loyalty({ loggedIn: false, summary: null })} />,
      );
      expect(guestMarkup).toContain('data-guest="true"');
      expect(guestMarkup).toContain('data-embedded="true"');
      expect(guestMarkup).toContain('<strong>Ganhe descontos</strong>');
      expect(guestMarkup).toContain('Entre para acompanhar sua fidelidade');
      expect(guestMarkup).not.toContain('role="progressbar"');
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it('apresenta o progresso e as compras que realmente contam para a recompensa', () => {
    const markup = renderToStaticMarkup(<LoyaltyProgramCard embedded loyalty={loyalty()} />);
    const content = document.createElement('div');
    content.innerHTML = markup;
    const progress = content.querySelector('[role="progressbar"]');
    expect(progress?.getAttribute('aria-valuenow')).toBe('40');
    expect(progress?.getAttribute('aria-valuetext')).toBe('2 de 5 pedidos pagos e entregues');
    expect(progress?.querySelector('i')?.style.width).toBe('40%');
    expect(content.textContent).toContain('2 de 5 pedidos pagos e entregues');
    expect(content.querySelector('button')?.getAttribute('aria-label')).toContain(
      '2 de 5 pedidos pagos e entregues',
    );
  });

  it.each([
    ['carregando', { loading: true }],
    ['erro', { error: 'Consulta indisponível' }],
    ['sem campanha', { summary: null }],
    [
      'cupom pronto para resgate',
      { summary: { purchasesCompleted: 5, rewards: [reward({ canRedeem: true })] } },
    ],
    [
      'carteira cheia',
      { summary: { purchasesCompleted: 5, rewards: [reward({ limitReached: true })] } },
    ],
    [
      'cupom aplicado',
      {
        summary: {
          purchasesCompleted: 5,
          rewards: [
            reward({
              redemptions: [{ id: 71, cycle: 1, status: 'RESERVED', coupon: reward().coupon }],
            }),
          ],
        },
      },
    ],
  ] satisfies [string, Partial<LoyaltyProgramProps>][])(
    'não confunde %s com progresso em andamento',
    (_, overrides) => {
      const markup = renderToStaticMarkup(
        <LoyaltyProgramCard embedded loyalty={loyalty(overrides)} />,
      );
      expect(markup).not.toContain('role="progressbar"');
    },
  );
});

describe('ações de fidelidade no painel do cliente', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it.each(['login', 'retry', 'redeem'] as const)(
    'preserva a ação de %s ao abrir pelo painel',
    async (action) => {
      const onLogin = vi.fn();
      const onRetry = vi.fn();
      const onRedeem = vi.fn();
      const data = loyalty({
        loggedIn: action !== 'login',
        error: action === 'retry' ? 'Consulta indisponível' : undefined,
        summary:
          action === 'redeem'
            ? {
                purchasesCompleted: 5,
                rewards: [reward({ canRedeem: true, remaining: 0, progressPercent: 100 })],
              }
            : null,
        onLogin,
        onRetry,
        onRedeem,
      });
      await act(async () => root.render(<LoyaltyProgramCard embedded loyalty={data} />));
      await act(async () => container.querySelector('button')?.click());
      const expectedAction = {
        login: 'Entrar e acompanhar',
        retry: 'Tentar novamente',
        redeem: 'Resgatar cupom',
      }[action];
      const actionButton = Array.from(
        document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'),
      ).find((button) => button.textContent?.includes(expectedAction));
      expect(actionButton).toBeDefined();
      await act(async () => actionButton?.click());
      expect(onLogin).toHaveBeenCalledTimes(action === 'login' ? 1 : 0);
      expect(onRetry).toHaveBeenCalledTimes(action === 'retry' ? 1 : 0);
      expect(onRedeem).toHaveBeenCalledTimes(action === 'redeem' ? 1 : 0);
      if (action === 'redeem') expect(onRedeem).toHaveBeenCalledWith(7);
    },
  );
});
