module.exports = {
  env: {
    browser: true,
    es2022: true,
    webextensions: true,  // provides chrome.* globals
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-alert': 'error',
  },
};
