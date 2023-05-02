module.exports = {
  extends: ['eslint-config-salesforce-typescript', 'plugin:sf-plugin/recommended'],
  root: true,
  rules: {
    "@typescript-eslint/prefer-nullish-coalescing": "off",
  }
};
