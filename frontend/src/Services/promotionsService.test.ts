import { describe, expect, it } from 'vitest';
import { toProductDiscountApiPayload } from './promotionsService';

describe('promotionsService', () => {
  it('traduz os nomes visuais para o contrato autoritativo do backend', () => {
    expect(
      toProductDiscountApiPayload({
        type: 'PERCENTAGE',
        value: 20,
        badgeLabel: 'Oferta da semana',
        active: true,
        startsAt: '2026-08-24T10:00:00.000Z',
      }),
    ).toEqual({
      kind: 'PERCENTAGE',
      value: 20,
      label: 'Oferta da semana',
      active: true,
      startsAt: '2026-08-24T10:00:00.000Z',
    });
  });
});
