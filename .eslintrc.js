module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
    mocha: true, // For test files
    browser: true // For frontend files
  },
  extends: 'airbnb-base',
  overrides: [
    {
      env: {
        node: true
      },
      files: [
        '.eslintrc.{js,cjs}'
      ],
      parserOptions: {
        sourceType: 'script'
      }
    }
  ],
  parserOptions: {
    ecmaVersion: 'latest'
  },
  rules: {
    'no-console': 'off', // Allows console.log for our debugging
    'comma-dangle': ['error', 'never'], // Prevents trailing commas
    'no-unused-vars': ['warn', { args: 'none' }], // Warns about unused variables, but not unused function arguments
    'max-len': ['warn', { code: 120 }] // Warns if a line is longer than 120 characters
  }
};
