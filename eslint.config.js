const globals = require('globals');

module.exports = [
  {
    files: ["web-app/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      // No specific rules needed for pure syntax checking
    }
  }
];
