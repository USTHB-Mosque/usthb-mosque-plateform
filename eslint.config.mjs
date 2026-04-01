import nextPlugin from "eslint-config-next";

const eslintConfig = [
  ...nextPlugin,
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "payload-types.ts"],
  },
];

export default eslintConfig;
