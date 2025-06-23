module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  overrides: [
    {
      files: ["backend/**/*.ts", "backend/**/*.tsx"],
      parserOptions: {
        project: "./backend/tsconfig.json",
      },
    },
    {
      files: ["frontend/**/*.ts", "frontend/**/*.tsx"],
      parserOptions: {
        project: "./frontend/tsconfig.json",
      },
      extends: ["next/core-web-vitals"],
    },
  ],
};
