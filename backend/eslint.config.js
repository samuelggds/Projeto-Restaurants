import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'node_modules', 'prisma/migrations']),
  {
    files: ['**/*.{js,mjs,ts}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: globals.node,
      parser: tseslint.parser,
    },
    rules: {
      'no-undef': 'off',
      // Baseline para adoção gradual: o projeto já possui módulos legados e
      // testes com @ts-nocheck. Essas regras podem ser endurecidas por módulo
      // conforme os arquivos forem sendo migrados.
      'no-unused-vars': 'off',
      'preserve-caught-error': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
]);
