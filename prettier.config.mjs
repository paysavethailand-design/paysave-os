/** @type {import("prettier").Config} */
const config = {
  plugins: ["prettier-plugin-tailwindcss"],
  printWidth: 100,
  proseWrap: "preserve",
  semi: true,
  singleQuote: false,
  tabWidth: 2,
  tailwindStylesheet: "./apps/web/src/app/globals.css",
  trailingComma: "all",
};

export default config;
