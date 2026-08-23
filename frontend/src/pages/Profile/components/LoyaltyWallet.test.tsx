import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { LoyaltySummary } from '../../Home/types';
import { buildLoyaltyWalletEntries } from '../domain/loyaltyWallet';
import { LoyaltyWallet } from './LoyaltyWallet';

function summary(
  redemption: {
    id: number;
    status: 'CLAIMED' | 'RESERVED' | 'USED' | 'EXPIRED';
    cycle: number;
    expiresAt?: string | null;
  } | null = {
    id: 44,
    status: 'CLAIMED',
    cycle: 1,
    expiresAt: '2099-12-31T23:59:00.000Z',
  },
): LoyaltySummary {
  const coupon = {
    id: 7,
    code: 'CLIENTE10',
    title: '10% de desconto',
    description: 'Recompensa por dez pedidos entregues.',
    discountType: 'PERCENTAGE' as const,
    discount: 10,
    minimumSubtotal: 30,
    maxDiscount: null,
    expiration: '2099-12-31T23:59:00.000Z',
  };

  return {
    purchasesCompleted: 0,
    rewards: [
      {
        coupon,
        purchasesCompleted: 0,
        purchasesRequired: 10,
        remaining: 10,
        progressPercent: 0,
        canRedeem: false,
        redemptions: redemption ? [{ ...redemption, coupon }] : [],
      },
    ],
  };
}

describe('LoyaltyWallet', () => {
  it('usa a validade individual do resgate antes da validade atual da regra', () => {
    const entries = buildLoyaltyWalletEntries(
      summary({
        id: 44,
        status: 'CLAIMED',
        cycle: 1,
        expiresAt: '2025-01-01T00:00:00.000Z',
      }),
      'North Pizza',
      Date.parse('2026-01-01T00:00:00.000Z'),
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      restaurantName: 'North Pizza',
      status: 'expired',
      expiration: '2025-01-01T00:00:00.000Z',
    });
  });

  it('mantém cupom utilizado no histórico mesmo antes da validade', () => {
    const [entry] = buildLoyaltyWalletEntries(
      summary({
        id: 45,
        status: 'USED',
        cycle: 2,
        expiresAt: '2099-01-01T00:00:00.000Z',
      }),
      'North Pizza',
      Date.parse('2026-01-01T00:00:00.000Z'),
    );

    expect(entry.status).toBe('used');
  });

  it('preserva na carteira o histórico de uma campanha que não está mais ativa', () => {
    const pausedCoupon = {
      id: 8,
      code: 'ANTIGO5',
      title: 'Benefício anterior',
      description: 'Campanha encerrada.',
      discountType: 'PERCENTAGE' as const,
      discount: 5,
      minimumSubtotal: 0,
    };
    const entries = buildLoyaltyWalletEntries(
      {
        ...summary(null),
        redemptions: [
          {
            id: 90,
            status: 'EXPIRED',
            expired: true,
            cycle: 1,
            expiresAt: '2025-01-01T00:00:00.000Z',
            coupon: pausedCoupon,
          },
        ],
      },
      'North Pizza',
      Date.parse('2026-01-01T00:00:00.000Z'),
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ code: 'ANTIGO5', status: 'expired' });
  });

  it('mantém como em uso uma reserva vinculada mesmo após o prazo do cupom', () => {
    const [entry] = buildLoyaltyWalletEntries(
      summary({
        id: 46,
        status: 'RESERVED',
        cycle: 3,
        expiresAt: '2025-01-01T00:00:00.000Z',
      }),
      'North Pizza',
      Date.parse('2026-01-01T00:00:00.000Z'),
    );

    expect(entry.status).toBe('reserved');
  });

  it('mostra o cupom válido guardado e o novo ciclo reiniciado em zero', () => {
    const markup = renderToStaticMarkup(
      <LoyaltyWallet summary={summary()} restaurantName="North Pizza" />,
    );

    expect(markup).toContain('CLIENTE10');
    expect(markup).toContain('North Pizza');
    expect(markup).toContain('Disponível');
    expect(markup).toContain('0/10');
    expect(markup).toContain('Faltam 10 pedidos pagos e entregues');
  });

  it('explica os estados vazio, carregando e de erro sem quebrar a carteira', () => {
    const empty = renderToStaticMarkup(
      <LoyaltyWallet summary={summary(null)} restaurantName="North Pizza" />,
    );
    const loading = renderToStaticMarkup(
      <LoyaltyWallet loading summary={null} restaurantName="North Pizza" />,
    );
    const error = renderToStaticMarkup(
      <LoyaltyWallet error="Tente novamente." summary={null} restaurantName="North Pizza" />,
    );

    expect(empty).toContain('Nenhum cupom válido agora');
    expect(loading).toContain('Carregando cupons');
    expect(error).toContain('Não foi possível carregar seus cupons');
  });
});
