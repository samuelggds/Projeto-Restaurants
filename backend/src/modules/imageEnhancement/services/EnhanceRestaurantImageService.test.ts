import assert from 'node:assert/strict';
import test from 'node:test';
import { getImageEnhancementProfile } from './EnhanceRestaurantImageService.js';

test('usa uma composição quadrada e sem texto para a capa de acesso', () => {
  const profile = getImageEnhancementProfile('COVER');

  assert.equal(profile.size, '1024x1024');
  assert.match(profile.prompt, /square login hero/i);
  assert.match(profile.prompt, /do not add new text/i);
});

test('usa composição horizontal com área segura para o texto do banner', () => {
  const profile = getImageEnhancementProfile('BANNER');

  assert.equal(profile.size, '1536x1024');
  assert.match(profile.prompt, /1440 by 560/i);
  assert.match(profile.prompt, /safe area on the left/i);
  assert.match(profile.prompt, /do not add any words/i);
});
