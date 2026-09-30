import { describe, expect, it } from 'vitest';
import { createReadyProductConfiguration, resolveProductEntryKind } from './productEntryFlow';

describe('fluxo de entrada dos produtos', () => {
  it('abre configurador para produto BUILDABLE/personalizado', () => {
    expect(resolveProductEntryKind({ kind: 'STANDARD', saleMode: 'BUILDABLE' })).toBe(
      'CUSTOMIZABLE',
    );
  });

  it('manda produto COMPLETE/pronto direto para o carrinho', () => {
    expect(resolveProductEntryKind({ kind: 'STANDARD', saleMode: 'COMPLETE' })).toBe('READY');
  });

  it('mantém combo em fluxo próprio', () => {
    expect(resolveProductEntryKind({ kind: 'COMBO', saleMode: 'BUILDABLE' })).toBe('COMBO');
  });

  it('cria configuração vazia segura para produto pronto', () => {
    expect(createReadyProductConfiguration(7)).toEqual({
      selectedOptions: [],
      selectedOptionIds: [],
      observation: '',
      configurationVersion: 7,
    });
  });
});
