import globals from 'globals';

export default [
  {
    ignores: ['node_modules/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        // Chrome extension APIs
        chrome: 'readonly',
        // WebHID API
        HIDDevice: 'readonly',
        // OffscreenCanvas for icon manipulation
        OffscreenCanvas: 'readonly',
      },
    },
    rules: {
      // Possible Errors
      'no-console': 'off', // Console is useful for extension debugging
      'no-debugger': 'warn',
      'no-dupe-args': 'error',
      'no-dupe-keys': 'error',
      'no-duplicate-case': 'error',
      'no-empty': 'warn',
      'no-extra-semi': 'error',
      'no-func-assign': 'error',
      'no-irregular-whitespace': 'error',
      'no-unreachable': 'error',
      'no-unsafe-negation': 'error',
      'valid-typeof': 'error',

      // Best Practices
      'curly': ['error', 'multi-line'],
      'eqeqeq': ['error', 'always', { 'null': 'ignore' }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-multi-spaces': 'error',
      'no-redeclare': 'error',
      'no-unused-expressions': 'warn',
      'no-useless-return': 'warn',

      // Variables
      'no-shadow': 'warn',
      'no-undef': 'error',
      'no-unused-vars': ['warn', {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
      }],
      'no-use-before-define': ['error', { 'functions': false }],

      // Stylistic
      'comma-dangle': ['error', 'always-multiline'],
      'comma-spacing': 'error',
      'indent': ['error', 2, { 'SwitchCase': 1 }],
      'key-spacing': 'error',
      'keyword-spacing': 'error',
      'no-trailing-spaces': 'error',
      'object-curly-spacing': ['error', 'always'],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'semi': ['error', 'always'],
      'space-before-blocks': 'error',
      'space-before-function-paren': ['error', {
        'anonymous': 'always',
        'named': 'never',
        'asyncArrow': 'always',
      }],
      'space-infix-ops': 'error',
    },
  },
  {
    // Content scripts don't use ES modules
    files: ['content-scripts/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        chrome: 'readonly',
      },
    },
  },
];
