import { describe, expect, it } from 'vitest';
import { buildAdminTableQrUrl, mapAdminTableQrs, tableDisplayName } from './tableQr';

describe('tableQr', () => {
  it('mapeia somente mesas válidas e mantém o token seguro do admin', () => {
    expect(
      mapAdminTableQrs([
        {
          id: 7,
          number: 12,
          seatCapacity: 6,
          restaurantId: 4,
          restaurantSlug: 'restaurante-teste',
          menuBaseUrl: null,
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
        seatCapacity: 6,
        restaurantId: 4,
        restaurantSlug: 'restaurante-teste',
        menuBaseUrl: null,
        token: 'token/&=',
        active: true,
        status: 'OCCUPIED',
      },
    ]);
  });

  it('não inventa lugares nas mesas antigas nem aceita capacidades inválidas', () => {
    const base = {
      id: 7, number: 1, restaurantId: 4, restaurantSlug: 'restaurante-teste',
      menuBaseUrl: null, token: 'qr-opaco', active: true,
    };
    const items = mapAdminTableQrs([
      { ...base, seatCapacity: undefined },
      { ...base, id: 8, number: 2, seatCapacity: 0 },
      { ...base, id: 9, number: 3, seatCapacity: 51 },
      { ...base, id: 10, number: 4, seatCapacity: 4 },
    ]);
    expect(items.map(table => table.seatCapacity)).toEqual([null, null, null, 4]);
    expect(items.map(table => table.token)).toEqual(Array(4).fill('qr-opaco'));
  });

  it('gera URL tenant-safe com restaurante e token codificado', () => {
    expect(
      buildAdminTableQrUrl(
        {
          id: '7',
          number: 12,
          restaurantId: 4,
          restaurantSlug: 'restaurante-teste',
          menuBaseUrl: null,
          token: 'token/&=',
        },
        'https://cardapio.example',
      ),
    ).toBe(
      'https://cardapio.example/restaurante-teste/mesa/12?tk=token%2F%26%3D&rid=4',
    );
    expect(tableDisplayName(1)).toBe('Mesa 01');
  });

  it('usa o domínio personalizado ativo sem expor o slug na URL da mesa', () => {
    expect(
      buildAdminTableQrUrl({
        id: '7',
        number: 12,
        restaurantId: 4,
        restaurantSlug: 'restaurante-teste',
        menuBaseUrl: 'https://cardapio.northpizza.com.br',
        token: 'token/&=',
      }),
    ).toBe(
      'https://cardapio.northpizza.com.br/mesa/12?tk=token%2F%26%3D&rid=4',
    );
  });
});
