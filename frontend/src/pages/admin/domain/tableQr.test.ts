import { describe, expect, it } from 'vitest';
import { buildAdminTableQrUrl, mapAdminTableQrs, tableDisplayName } from './tableQr';

describe('tableQr', () => {
  it('mapeia somente mesas válidas e mantém o token seguro do admin', () => {
    expect(
      mapAdminTableQrs([
        {
          id: 7,
          number: 12,
          restaurantId: 4,
          token: 'token/&=',
          active: true,
          operational: { status: 'OCCUPIED' },
        },
        { id: 8, number: 0, restaurantId: 4, token: 'invalido' },
      ]),
    ).toEqual([
      {
        id: '7',
        number: 12,
        restaurantId: 4,
        token: 'token/&=',
        active: true,
        status: 'OCCUPIED',
      },
    ]);
  });

  it('gera URL tenant-safe com restaurante e token codificado', () => {
    expect(
      buildAdminTableQrUrl(
        { id: '7', number: 12, restaurantId: 4, token: 'token/&=' },
        'https://cardapio.example',
      ),
    ).toBe('https://cardapio.example/mesa/12?tk=token%2F%26%3D&rid=4');
    expect(tableDisplayName(1)).toBe('Mesa 01');
  });
});
