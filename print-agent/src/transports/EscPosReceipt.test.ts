import assert from 'node:assert/strict';
import test from 'node:test';

import { buildEscPosReceipt, toThermalAscii } from './EscPosReceipt.js';

test('58mm ESC/POS receipt limits each line to 32 columns and preserves full order', () => {
  const source = [
    'NORTH PIZZA', 'PEDIDO #51', 'PAGAMENTO: CARTÃO - PAGO',
    'ENTREGA: Rua Francisco Calata, 1688',
    'BAIRRO: Floresta - Fortaleza - CE',
    '1x MOJITO',
    'OBS: SEM AÇÚCAR E SEM GELO',
  ].join('\n');
  const receipt = buildEscPosReceipt(source, 'MM58');
  const decoded = receipt.subarray(18).toString('ascii');
  assert.ok(decoded.split('\n').every((line) => line.length <= 32));
  assert.match(decoded, /NORTH PIZZA/);
  assert.match(decoded, /1688/);
  assert.match(decoded, /ACUCAR E SEM GELO/);
  assert.ok(receipt.subarray(0, 2).equals(Buffer.from([0x1b, 0x40])));
  assert.ok(receipt.includes(Buffer.from([0x1d, 0x57, 0x80, 0x01])));
});

test('80mm commands use 48-column region', () => {
  const data = buildEscPosReceipt('x'.repeat(49), 'MM80');
  assert.ok(data.includes(Buffer.from([0x1d, 0x57, 0x40, 0x02])));
  assert.match(data.toString('ascii'), /x{48}\nx/);
});

test('untrusted order text cannot inject ESC/POS control sequences', () => {
  const malicious = 'café\u001b\u0070\u0000\u000f\u001d\u0056\u0000\u2022';
  const text = toThermalAscii(malicious);
  assert.equal(text, 'cafe pV-');
  const receipt = buildEscPosReceipt(malicious, 'MM58');
  assert.equal(receipt.toString('ascii').includes('\x1bp'), false);
});

test('rejects oversized or unknown paper output', () => {
  assert.throws(() => buildEscPosReceipt('A'.repeat(130_000), 'MM58'), /excede/u);
  assert.throws(() => buildEscPosReceipt('x', 'MM99' as 'MM58'), /não suportada/u);
});
