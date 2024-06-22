// eslint.config.js
export default [
  {
    files: ["src/**/*.ts"],
    ignores: ["node_moduels", "build"],
    rules: {
      semi: "error",
      "prefer-const": "error",      
    }
  }
];
