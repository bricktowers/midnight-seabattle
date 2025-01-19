module.exports = {
  extends: [
    'plugin:react/recommended',
    'standard-with-typescript',
    'plugin:prettier/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },
  plugins: ['react'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-misused-promises': 'off', // https://github.com/typescript-eslint/typescript-eslint/issues/5807
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/promise-function-async': 'off',
    '@typescript-eslint/no-redeclare': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ['tsconfig.json', 'tsconfig.node.json'],
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
};
