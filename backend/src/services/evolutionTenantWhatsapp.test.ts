import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildTenantEvolutionInstanceName,
  extractEvolutionQrPayload,
  isSafeDisposableOrphanEvolutionInstance,
  isTenantEvolutionInstanceName,
} from './evolutionTenantWhatsapp.js';

test('considera descartável somente instância órfã fechada e sem identidade ou dados', () => {
  assert.equal(
    isSafeDisposableOrphanEvolutionInstance({
      name: 'gastronexa-2',
      connectionStatus: 'close',
      ownerJid: null,
      number: null,
      profileName: null,
      _count: { Message: 0, Contact: 0, Chat: 0 },
    }),
    true,
  );
});

test('preserva instância que já possui identidade de WhatsApp', () => {
  for (const instance of [
    {
      name: 'gastronexa-2',
      connectionStatus: 'close',
      ownerJid: '5585999999999@s.whatsapp.net',
      number: null,
      profileName: null,
      _count: { Message: 0, Contact: 0, Chat: 0 },
    },
    {
      name: 'gastronexa-2',
      connectionStatus: 'close',
      ownerJid: null,
      number: '5585999999999',
      profileName: null,
      _count: { Message: 0, Contact: 0, Chat: 0 },
    },
    {
      name: 'gastronexa-2',
      connectionStatus: 'close',
      ownerJid: null,
      number: null,
      profileName: 'North Pizza',
      _count: { Message: 0, Contact: 0, Chat: 0 },
    },
  ]) {
    assert.equal(isSafeDisposableOrphanEvolutionInstance(instance), false);
  }
});

test('preserva instância com histórico ou estado ativo', () => {
  assert.equal(
    isSafeDisposableOrphanEvolutionInstance({
      name: 'gastronexa-2',
      connectionStatus: 'open',
      _count: { Message: 0, Contact: 0, Chat: 0 },
    }),
    false,
  );

  assert.equal(
    isSafeDisposableOrphanEvolutionInstance({
      name: 'gastronexa-2',
      connectionStatus: 'close',
      _count: { Message: 1, Contact: 0, Chat: 0 },
    }),
    false,
  );
});


test('gera nome de instância não reutilizável por restaurante e ambiente', () => {
  const name = buildTenantEvolutionInstanceName(7, '0123456789abcdef');
  assert.match(name, /^gastronexa-(?:dev|test|stage|prod)-7-0123456789abcdef$/u);
  assert.equal(isTenantEvolutionInstanceName(name), true);
});

test('extrai QR Code nos formatos suportados pela Evolution 2.3.7', () => {
  const rawBase64 = 'A'.repeat(256);

  assert.deepEqual(extractEvolutionQrPayload({ base64: rawBase64 }), {
    qrCode: `data:image/png;base64,${rawBase64}`,
    qrContent: '',
    pairingCode: null,
  });

  assert.deepEqual(
    extractEvolutionQrPayload({
      qrcode: {
        base64: `data:image/png;base64,${rawBase64}`,
        code: '2@conteudo-qr',
      },
    }),
    {
      qrCode: `data:image/png;base64,${rawBase64}`,
      qrContent: '2@conteudo-qr',
      pairingCode: null,
    },
  );

  assert.deepEqual(
    extractEvolutionQrPayload({
      data: {
        qrcode: {
          code: '2@qr-aninhado',
          pairingCode: 'ABC-DEF',
        },
      },
    }),
    {
      qrCode: '',
      qrContent: '2@qr-aninhado',
      pairingCode: 'ABC-DEF',
    },
  );
});

test('não trata texto arbitrário como imagem base64 de QR Code', () => {
  assert.deepEqual(extractEvolutionQrPayload({ base64: 'erro upstream' }), {
    qrCode: '',
    qrContent: '',
    pairingCode: null,
  });
});

test('mantém compatibilidade com nomes legados de instância', () => {
  assert.equal(isTenantEvolutionInstanceName('gastronexa-7'), true);
  assert.equal(isTenantEvolutionInstanceName('gastronexa-prod-7-0123456789abcdef'), true);
  assert.equal(isTenantEvolutionInstanceName('gastronexa-7-outro-restaurante'), false);
});
