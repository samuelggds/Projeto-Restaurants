// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { adminPortalRateLimitKey } from './AdminPortalRoutes.js';

function request(ip: string, slug: string) {
  return {
    ip,
    params: { slug },
  };
}

test('separa a cota do portal administrativo por restaurante no mesmo IP', () => {
  const northPizza = adminPortalRateLimitKey(request('127.0.0.1', 'north-pizza'));
  const sushiHouse = adminPortalRateLimitKey(request('127.0.0.1', 'sushi-house'));

  assert.notEqual(northPizza, sushiHouse);
});

test('normaliza o slug ao montar a chave do rate limit', () => {
  const first = adminPortalRateLimitKey(request('127.0.0.1', 'North-Pizza'));
  const second = adminPortalRateLimitKey(request('127.0.0.1', ' north-pizza '));

  assert.equal(first, second);
});

test('mantém IPs diferentes em cotas diferentes para o mesmo restaurante', () => {
  const first = adminPortalRateLimitKey(request('127.0.0.1', 'north-pizza'));
  const second = adminPortalRateLimitKey(request('127.0.0.2', 'north-pizza'));

  assert.notEqual(first, second);
});
