module.exports = {
  env: {
    browser: true,
    es2022: true,
    webextensions: true
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    'no-undef': 'off',        // Chrome APIs are global
    'no-unused-vars': 'warn',
    'no-alert': 'error',      // Use showToast() instead
    'no-inner-declaration': 'off',
    'no-constant-condition': 'off'
  }
};