import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isValidCnpj,
  isValidCpf,
  normalizeFontFamily,
  normalizeIntegerInRange,
  normalizeNonNegativeMoney,
  normalizePrimaryColor,
  normalizeSocialReference,
  normalizeWhatsappNumber,
} from './adminSettingsValidation.js';

test('normaliza valores monetários e rejeita números negativos', () => {
  assert.equal(normalizeNonNegativeMoney('12.349', 'Taxa'), 12.35);
  assert.throws(() => normalizeNonNegativeMoney(-1, 'Taxa'), /não negativo/);
});

test('aceita somente cores e fontes disponíveis na interface', () => {
  assert.equal(normalizePrimaryColor('#C95D3D'), '#c95d3d');
  assert.equal(normalizeFontFamily('DM Sans'), 'DM Sans');
  assert.throws(() => normalizePrimaryColor('red'), /Cor principal inválida/);
  assert.throws(() => normalizeFontFamily('Comic Sans'), /Fonte inválida/);
});

test('valida redes sociais e bloqueia referências inseguras ou ambíguas', () => {
  assert.equal(normalizeSocialReference('@restaurante', 'Instagram'), '@restaurante');
  assert.equal(
    normalizeSocialReference('https://youtube.com/@restaurante', 'YouTube'),
    'https://youtube.com/@restaurante',
  );
  assert.throws(() => normalizeSocialReference('javascript:alert(1)', 'Instagram'), /inválido/);
  assert.throws(() => normalizeSocialReference('perfil com espaço', 'Instagram'), /inválido/);
});

test('normaliza WhatsApp no limite internacional E.164', () => {
  assert.equal(normalizeWhatsappNumber('+55 (85) 99999-9999'), '5585999999999');
  assert.equal(normalizeWhatsappNumber('123456789012345'), '123456789012345');
  assert.throws(() => normalizeWhatsappNumber('123'), /WhatsApp inválido/);
});

test('valida inteiros operacionais e dígitos de CPF/CNPJ', () => {
  assert.equal(normalizeIntegerInRange('45', 'Prazo', 1, 240), 45);
  assert.throws(() => normalizeIntegerInRange(2.5, 'Prazo', 1, 240), /número inteiro/);
  assert.throws(() => normalizeIntegerInRange(241, 'Prazo', 1, 240), /entre 1 e 240/);
  assert.equal(isValidCpf('529.982.247-25'), true);
  assert.equal(isValidCpf('529.982.247-24'), false);
  assert.equal(isValidCnpj('11.222.333/0001-81'), true);
  assert.equal(isValidCnpj('11.222.333/0001-80'), false);
});
