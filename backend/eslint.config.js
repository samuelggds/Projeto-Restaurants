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
  {
    // Migrated financial domain: no file-level TypeScript suppression or explicit any.
    files: [
      'src/modules/tableAccount/domain/tableAccountContracts.ts',
      'src/modules/tableAccount/domain/tableAccountRules.ts',
      'src/modules/tableAccount/domain/tablePaymentAllocation.ts',
      'src/modules/tableAccount/domain/tablePaymentAllocation.test.ts',
    ],
    rules: {
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-nocheck': true, 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Operational role middlewares and HTTP test harness are strictly typed.
    files: [
      'src/middlewares/security/roleAccessTestHarness.ts',
      'src/middlewares/waiterMiddleware.ts',
      'src/middlewares/attendantMiddleware.ts',
      'src/middlewares/waiterMiddleware.test.ts',
      'src/middlewares/attendantMiddleware.test.ts',
    ],
    rules: {
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-nocheck': true, 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
]);
