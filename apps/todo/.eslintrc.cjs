module.exports = {
  root: true,
  plugins: ['@typescript-eslint', 'eslint-plugin-jsdoc'],
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsdoc/recommended-typescript',
    'prettier',
  ],
  globals: {
    React: true,
    JSX: true,
  },
  rules: {
    'react/no-unescaped-entities': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'react/no-children-prop': 'off',
    'sort-imports': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/no-unused-expressions': 'off',
    '@next/next/no-img-element': 'off',
    '@next/next/no-html-link-for-pages': 'off',
    'jsdoc/require-jsdoc': 0,
  },
};
