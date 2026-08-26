import { describe, expect, it } from 'vitest';
import { adminMockSettings } from '../data';
import { validateTableAccountSettings } from './tableAccountSettingsValidation';

describe('validação da conta e pagamento da mesa', () => {
  it('aceita uma configuração operacional coerente', () => {
    expect(
      validateTableAccountSettings({
        ...adminMockSettings.tableAccount,
        enabled: true,
        serviceFeeMode: 'OPTIONAL',
        serviceFeeBasisPoints: 1_000,
        requirePrepaymentAboveCents: 20_000,
        prepaymentWindows: [
          { weekdays: [1, 2, 3, 4, 5], startsAtMinute: 1080, endsAtMinute: 1380 },
        ],
      }),
    ).toEqual({});
  });

  it('rejeita taxa incoerente, reserva inválida e período sem regra útil', () => {
    expect(
      validateTableAccountSettings({
        ...adminMockSettings.tableAccount,
        serviceFeeMode: 'DISABLED',
        serviceFeeBasisPoints: 500,
        reservationTimeoutMinutes: 0,
        prepaymentWindows: [{ weekdays: [], startsAtMinute: 600, endsAtMinute: 600 }],
      }),
    ).toMatchObject({
      serviceFeeBasisPoints: expect.any(String),
      reservationTimeoutMinutes: expect.any(String),
      prepaymentWindows: expect.any(String),
    });
  });
});
