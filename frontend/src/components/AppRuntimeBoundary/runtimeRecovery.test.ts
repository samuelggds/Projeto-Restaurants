import { describe, expect, it } from 'vitest';
import { isRecoverableRuntimeError } from './runtimeRecovery';

describe('runtimeRecovery', () => {
  it.each([
    new TypeError('Failed to fetch dynamically imported module: /src/pages/Login.tsx'),
    new Error('Importing a module script failed.'),
    new Error('ChunkLoadError: Loading chunk Admin failed'),
    'Unable to preload CSS for /assets/Admin.css',
  ])('reconhece falhas causadas por módulos antigos do frontend', (error) => {
    expect(isRecoverableRuntimeError(error)).toBe(true);
  });

  it('não recarrega automaticamente para um erro comum da aplicação', () => {
    expect(isRecoverableRuntimeError(new Error('Dados inválidos'))).toBe(false);
  });
});
