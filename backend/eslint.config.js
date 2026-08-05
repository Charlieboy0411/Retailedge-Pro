const js = require('@eslint/js');

module.exports = [
  // Ignore legacy temporary script files, browser automation logs, and assets
  {
    ignores: [
      '**/node_modules/**',
      '**/coverage/**',
      '*.js', // Ignore root level scripts in backend folder
      'produce_*.js',
      'test_*.js',
      'tests/k6_ws_load_test.js', // uses k6 specific ES Module format
    ]
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        // Node.js globals
        process: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Buffer: 'readonly',
        // Jest globals
        jest: 'readonly',
        describe: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      }
    },
    rules: {
      // Warnings instead of errors for formatting and unused elements to keep CI clean but informative
      'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
      'no-undef': 'error',
      'no-unreachable': 'warn',
      'no-duplicate-case': 'error',
      'no-empty': 'warn',
      'semi': ['warn', 'always'],
      'quotes': ['warn', 'single', { 'avoidEscape': true }]
    }
  }
];
