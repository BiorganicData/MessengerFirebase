module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 9,
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
    },
  },
  extends: ["eslint:recommended", "google", "prettier"],
  rules: {
    quotes: ["error", "double"],
    "max-len": "off",
    "new-cap": "off",
    camelcase: "off",
  },
};
