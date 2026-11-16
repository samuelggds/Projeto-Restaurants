import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/types/**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // Keep the migrated utilities strict while larger page modules are modernized.
    files: [
      'src/utils/adminAiArea.ts',
      'src/utils/adminAiArea.test.ts',
      'src/utils/commercialPlanPresentation.ts',
      'src/utils/commercialPlanPresentation.test.ts',
      'src/utils/deliveryTime.ts',
      'src/utils/deliveryTime.test.ts',
      'src/utils/restaurantMonogram.ts',
      'src/utils/restaurantMonogram.test.ts',
    ],
    rules: {
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-nocheck': true, 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]);
