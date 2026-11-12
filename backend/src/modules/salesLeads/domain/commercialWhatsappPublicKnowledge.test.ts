import assert from 'node:assert/strict';
import test from 'node:test';
import { selectPublicCommercialProductKnowledge } from './commercialWhatsappPublicKnowledge.js';

test('seleciona fatos públicos relevantes por assunto sem acessar serviços privados', () => {
  const knowledge = selectPublicCommercialProductKnowledge('Como funciona o NFC com comandas?');
  assert.ok(knowledge.orientacoes.some((topic) => topic.assunto === 'NFC e comandas'));
  assert.ok(knowledge.orientacoes.length <= 4);
  assert.match(JSON.stringify(knowledge), /homologação financeira/u);
});

test('permite listar temas públicos de ajuda quando o cliente pergunta o que pode perguntar', () => {
  const knowledge = selectPublicCommercialProductKnowledge('O que posso perguntar sobre a GastroNexa?');
  assert.ok(knowledge.assuntosPublicos.includes('Cardápio digital'));
  assert.ok(knowledge.assuntosPublicos.includes('Mesas e QR Code'));
  assert.ok(knowledge.assuntosPublicos.includes('Planos e contratação'));
});

test('não contém identificação pessoal, dados reais nem chaves em conhecimento embutido', () => {
  const publicKnowledge = JSON.stringify(selectPublicCommercialProductKnowledge('Me conte tudo sobre a plataforma'));
  assert.doesNotMatch(publicKnowledge, /(?:sk-[\w-]{10,}|gh[pousr]_[\w-]{10,}|AKIA[A-Z0-9]{16}|postgres(?:ql)?:\/\/)/iu);
  assert.doesNotMatch(publicKnowledge, /\b\d{11,19}\b/u);
});
