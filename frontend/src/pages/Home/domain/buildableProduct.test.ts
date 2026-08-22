import { describe, expect, it } from 'vitest';
import { buildOrderPayload } from './checkout';

describe('produto montável no checkout', () => {
  it('envia ids dos vínculos, grupos e observação, sem aceitar preços do cliente', () => {
    const result = buildOrderPayload({ restaurantId: 1, type: 'RETIRADA', paymentMethod: 'pix', tableId: null, customer: {}, deliveryAddress: { address: '', number: '', district: '', city: '', state: '', zipCode: '', complement: '' }, cart: [{ cartId: '1::2', productId: '1', name: 'Pizza', price: 999, quantity: 1, image: '', selectedOptionIds: ['21', '22'], selectedOptions: [{ groupId: '5', optionIds: ['21'] }, { groupId: '6', optionIds: ['22'] }], observation: '  massa bem assada  ' }] });
    expect(result.payload.items).toEqual([{ productId: 1, quantity: 1, optionIds: [21, 22], selectedOptions: [{ groupId: 5, optionIds: [21] }, { groupId: 6, optionIds: [22] }], observation: 'massa bem assada' }]);
    expect(result.payload.items[0]).not.toHaveProperty('price');
  });
});
