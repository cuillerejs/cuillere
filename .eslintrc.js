module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: ['airbnb-base', 'plugin:@typescript-eslint/recommended'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.ts', '.js'],
      },
    },
  },
  rules: {
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/indent': ['error', 2],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/member-delimiter-style': [
      'error',
      {
        multiline: {
          delimiter: 'none',
          requireLast: false,
        },
        singleline: {
          delimiter: 'semi',
          requireLast: false,
        },
      },
    ],
    'arrow-parens': [2, 'as-needed', { requireForBlockBody: true }],
    'consistent-return': 'off',
    eqeqeq: 'off',
    'func-names': 'off',
    'implicit-arrow-linebreak': 'off',
    'import/extensions': [
      'error',
      {
        ts: 'never',
      },
    ],
    'import/no-extraneous-dependencies': 'off',
    'import/prefer-default-export': 'off',
    indent: 'off',
    'max-classes-per-file': 'off',
    'max-len': [
      'error',
      {
        code: 160,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      },
    ],
    'no-await-in-loop': 'off',
    'no-cond-assign': 'off',
    'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
    'no-continue': 'off',
    'no-dupe-class-members': 'off',
    'no-multi-assign': 'off',
    'no-multiple-empty-lines': ['warn', { max: 1 }],
    'no-new-wrappers': 'off',
    'no-param-reassign': ['error', { props: false }],
    'no-plusplus': 'off',
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ForInStatement',
        message:
          'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.',
      },
      {
        selector: 'LabeledStatement',
        message:
          'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
      },
      {
        selector: 'WithStatement',
        message:
          '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
      },
    ],
    'no-return-assign': 'off',
    'no-shadow': 'off',
    'no-use-before-define': 'off',
    'object-curly-newline': ['error', { consistent: true }],
    'object-shorthand': ['error', 'always', { avoidQuotes: false }],
    'require-yield': 'off',
    semi: ['error', 'never'],
    'no-underscore-dangle': 'off',
    'dot-notation': 'off',
    quotes: ['error', 'single', { avoidEscape: true }],
  },
}
