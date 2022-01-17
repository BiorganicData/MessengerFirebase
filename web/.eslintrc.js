module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['plugin:react/recommended', 'airbnb', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: ['react', '@typescript-eslint'],
  rules: {
    'react/jsx-filename-extension': [
      1,
      { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
    ],
    'import/no-unresolved': 0,
    'no-use-before-define': 0,
    'jsx-a11y/label-has-associated-control': 0,
    'react/require-default-props': 0,
    'jsx-a11y/click-events-have-key-events': 0,
    'jsx-a11y/no-noninteractive-element-interactions': 0,
    'import/prefer-default-export': 0,
    'jsx-a11y/control-has-associated-label': 0,
    'react/button-has-type': 0,
    'no-console': 0,
    'jsx-a11y/media-has-caption': 0,
    radix: 0,
  },
};
