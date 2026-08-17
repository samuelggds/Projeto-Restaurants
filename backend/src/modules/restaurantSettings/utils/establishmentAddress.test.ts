import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeEstablishmentAddress,
  validateEstablishmentAddress,
} from './establishmentAddress.js';

test('normaliza e valida endereço do estabelecimento', () => {
  const address = normalizeEstablishmentAddress({
    address: ' Rua das Flores ',
    number: '123',
    district: 'Centro',
    city: 'Fortaleza',
    state: 'ce',
    zipCode: '60100-000',
  });
  assert.equal(address.zipCode, '60100000');
  assert.equal(address.state, 'CE');
  assert.equal(validateEstablishmentAddress(address), null);
});

test('rejeita CEP e UF inválidos', () => {
  const address = normalizeEstablishmentAddress({
    address: 'Rua A',
    number: '1',
    district: 'Centro',
    city: 'Fortaleza',
    state: 'C',
    zipCode: '12',
  });
  assert.match(validateEstablishmentAddress(address) || '', /CEP/);
});
