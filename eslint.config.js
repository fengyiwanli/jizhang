import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: ['dist', 'node_modules'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // N-2 结构约束：UI 层不得直接访问仓库 / AppContext，只能走 @/data/services
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['@/data/repositories', '@/data/repositories/*'],
          message: 'UI 层请通过 @/data/services 访问数据（N-2 架构约束）',
        }],
        paths: [{
          name: '@/data/init',
          importNames: ['getAppContext'],
          message: 'UI 层请通过 @/data/services 访问数据（N-2 架构约束）',
        }],
      }],
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  {
    // data 层内部允许直接使用仓库与 AppContext
    files: ['src/data/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
];
