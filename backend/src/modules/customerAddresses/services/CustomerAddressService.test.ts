import assert from 'node:assert/strict';
import test from 'node:test';
import { CustomerAddressService } from './CustomerAddressService.js';
import type {
  CustomerAddressRepositoryPort,
  CustomerAddressUnitOfWork,
} from '../repositories/CustomerAddressRepository.js';
import type { CustomerAddressInput, CustomerAddressRecord } from '../domain/CustomerAddress.js';

const input: CustomerAddressInput = {
  label: 'Casa',
  address: 'Rua das Flores',
  number: '10',
  district: 'Centro',
  city: 'Fortaleza',
  state: 'CE',
  zipCode: '60000000',
  complement: '',
  isDefault: false,
};

function fixture(seed: CustomerAddressRecord[] = []) {
  let stored = [...seed];
  const calls: string[] = [];
  const port: CustomerAddressRepositoryPort = {
    async listByUser(userId) {
      return stored.filter((address) => address.userId === userId)
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
    },
    async transaction<T>(execute: (unit: CustomerAddressUnitOfWork) => Promise<T>) {
      calls.push('begin');
      const snapshot = stored.map((row) => ({ ...row }));
      const unit: CustomerAddressUnitOfWork = {
        async countByUser(userId) { return stored.filter((address) => address.userId === userId).length; },
        async clearDefaults(userId) {
          calls.push('clear');
          stored = stored.map((address) => address.userId === userId ? { ...address, isDefault: false } : address);
        },
        async create(userId, data) {
          calls.push('create');
          const address: CustomerAddressRecord = {
            ...data, userId, id: stored.length + 10,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-01T00:00:00Z'),
          };
          stored.push(address);
          return address;
        },
        async findOwned(userId, id) { return stored.some((address) => address.userId === userId && address.id === id); },
        async setDefault(userId, id) {
          calls.push('default');
          const owned = stored.find((address) => address.userId === userId && address.id === id);
          if (owned) owned.isDefault = true;
          return owned || null;
        },
      };
      try {
        const result = await execute(unit);
        calls.push('commit');
        return result;
      } catch (error) {
        stored = snapshot;
        calls.push('rollback');
        throw error;
      }
    },
  };
  return { service: new CustomerAddressService(port), calls, rows: () => stored };
}

test('primeiro endereço do cliente vira padrão dentro da transação', async () => {
  const { service, calls } = fixture();
  const first = await service.create(7, input);
  assert.equal(first.userId, 7);
  assert.equal(first.isDefault, true);
  assert.deepEqual(calls, ['begin', 'clear', 'create', 'commit']);
});

test('segundo endereço não desativa o padrão existente se não for solicitado', async () => {
  const { service } = fixture();
  const first = await service.create(7, input);
  const second = await service.create(7, { ...input, label: 'Trabalho' });
  assert.equal(first.isDefault, true);
  assert.equal(second.isDefault, false);
  assert.deepEqual((await service.list(7)).map((address) => address.label), ['Casa', 'Trabalho']);
});

test('alteração de endereço padrão mantém endereços dos demais usuários isolados', async () => {
  const { service, rows, calls } = fixture();
  const mine = await service.create(7, input);
  const other = await service.create(8, { ...input, label: 'Outro' });
  const second = await service.create(7, { ...input, label: 'Trabalho' });
  const result = await service.setDefault(7, second.id);
  assert.equal(result?.id, second.id);
  assert.equal(rows().find((address) => address.id === mine.id)?.isDefault, false);
  assert.equal(rows().find((address) => address.id === second.id)?.isDefault, true);
  assert.equal(rows().find((address) => address.id === other.id)?.isDefault, true);
  assert.ok(calls.includes('default'));
});

test('nega alteração cruzada sem limpar o padrão do cliente', async () => {
  const { service, rows, calls } = fixture();
  const mine = await service.create(7, input);
  const other = await service.create(8, input);
  const before = calls.length;
  const result = await service.setDefault(7, other.id);
  assert.equal(result, null);
  assert.equal(rows().find((address) => address.id === mine.id)?.isDefault, true);
  assert.equal(rows().find((address) => address.id === other.id)?.isDefault, true);
  assert.deepEqual(calls.slice(before), ['begin', 'commit']);
});
