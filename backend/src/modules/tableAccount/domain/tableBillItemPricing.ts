import { assertMoneyCents, sumMoneyCents } from './tableAccountRules.js';

type DecimalLike = string | number | bigint | { toString(): string };

export type TableBillUnitSeed = {
  orderItemIndex: number;
  unitIndex: number;
  unitPriceCents: number;
};

/** Converte Decimal(10,2) para centavos sem usar aritmética de ponto flutuante. */
export function decimalMoneyToCents(value: DecimalLike, fieldName = 'valor'): number {
  const normalized = String(value).trim();
  const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(normalized);

  if (!match) {
    throw new RangeError(`${fieldName} possui formato monetário inválido.`);
  }

  const [, sign, whole, fraction = ''] = match;
  if (sign === '-') {
    throw new RangeError(`${fieldName} não pode ser negativo.`);
  }
  if (fraction.length > 2 && /[1-9]/.test(fraction.slice(2))) {
    throw new RangeError(`${fieldName} deve possuir no máximo duas casas decimais.`);
  }

  const cents = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`${fieldName} ultrapassa o limite monetário seguro.`);
  }

  return assertMoneyCents(Number(cents), fieldName);
}

/**
 * Distribui um desconto proporcionalmente e entrega os centavos restantes às
 * primeiras unidades elegíveis. O resultado nunca fica negativo e sempre
 * fecha exatamente com subtotal - desconto.
 */
export function allocateDiscountAcrossUnitPrices(
  unitPricesCents: readonly number[],
  discountCents: number,
): number[] {
  const prices = unitPricesCents.map((value, index) =>
    assertMoneyCents(value, `preço da unidade ${index + 1}`),
  );
  const safeDiscount = assertMoneyCents(discountCents, 'desconto');
  const subtotal = sumMoneyCents(prices);

  if (safeDiscount > subtotal) {
    throw new RangeError('O desconto não pode ser maior que o subtotal das unidades.');
  }
  if (safeDiscount === 0) {
    return [...prices];
  }
  if (subtotal === 0) {
    throw new RangeError('Não é possível aplicar desconto a um subtotal zerado.');
  }

  const subtotalBigInt = BigInt(subtotal);
  const discountBigInt = BigInt(safeDiscount);
  const shares = prices.map((price) =>
    Number((BigInt(price) * discountBigInt) / subtotalBigInt),
  );
  let remaining = safeDiscount - sumMoneyCents(shares);

  for (let index = 0; index < shares.length && remaining > 0; index += 1) {
    if (shares[index] < prices[index]) {
      shares[index] += 1;
      remaining -= 1;
    }
  }

  if (remaining !== 0) {
    throw new RangeError('Não foi possível distribuir todos os centavos do desconto.');
  }

  return prices.map((price, index) => price - shares[index]);
}

export function buildTableBillUnitSeeds(
  orderItems: readonly { price: DecimalLike; quantity: number }[],
  couponDiscount: DecimalLike,
): TableBillUnitSeed[] {
  const rawUnits = orderItems.flatMap((item, orderItemIndex) => {
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new RangeError(`Quantidade inválida no item ${orderItemIndex + 1}.`);
    }

    const unitPriceCents = decimalMoneyToCents(
      item.price,
      `preço do item ${orderItemIndex + 1}`,
    );
    return Array.from({ length: quantity }, (_, index) => ({
      orderItemIndex,
      unitIndex: index + 1,
      unitPriceCents,
    }));
  });
  const discountedPrices = allocateDiscountAcrossUnitPrices(
    rawUnits.map((unit) => unit.unitPriceCents),
    decimalMoneyToCents(couponDiscount, 'desconto do cupom'),
  );

  return rawUnits.map((unit, index) => ({
    ...unit,
    unitPriceCents: discountedPrices[index],
  }));
}
