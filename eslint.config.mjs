import nextPlugin from "eslint-config-next";

const eslintConfig = [
  ...nextPlugin,
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "payload-types.ts",
    ],
  },
  {
    files: ["lib/redirect.ts"],
    rules: {
      "@next/next/no-location-assign-relative-destination": "off",
    },
  },
];

export default eslintConfig;
