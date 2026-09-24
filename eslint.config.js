import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['**/dist/**', '**/node_modules/**'] },
  js.configs.recommended,
  { rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  },
  {
    files: ['scripts/**/*.js', 'tests/**/*.js', 'apps/api/**/*.js', '**/*.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/src/**/*.{js,jsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z]' }],
    },
  },
  {
    files: ['apps/extension/**/*.js', 'tests/fixtures/capture-browser.js'],
    languageOptions: { globals: { ...globals.browser, chrome: 'readonly', DsaAdapters: 'readonly', DsaCapture: 'readonly', DsaLegacy: 'readonly' } },
  },
];
