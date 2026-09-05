import nextPlugin from "eslint-config-next";

const OTHER_FEATURE_DEEP_IMPORT_MESSAGE =
  "Import another feature's public API from its barrel (e.g. '@/features/library'), not its internals.";

// One block per feature: block every OTHER feature's internals, but never the
// feature's own (no-restricted-imports can't express "not my own feature" in
// a single glob, so each feature lists its siblings explicitly).
const FEATURES = ["auth", "library", "activities", "articles", "profile", "landing"];

const featureBoundaryRules = FEATURES.map((feature) => ({
  files: [`features/${feature}/**/*.{ts,tsx}`],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: FEATURES.filter((other) => other !== feature).map((other) => ({
          group: [`@/features/${other}/*`],
          message: OTHER_FEATURE_DEEP_IMPORT_MESSAGE,
        })),
      },
    ],
  },
}));

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
    files: ["shared/lib/redirect.ts"],
    rules: {
      "@next/next/no-location-assign-relative-destination": "off",
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/lib/apis/*",
                "@/interfaces/*",
                "@/store/*",
                "@/static-content/*",
                "@/hooks/*",
                "@/components/ui/*",
                "@/components/listing/*",
                "@/components/common/*",
                "@/components/layouts/*",
              ],
              message: "This moved under shared/ or features/ in the 2026 refactor.",
            },
          ],
        },
      ],
    },
  },
  ...featureBoundaryRules,
];

export default eslintConfig;
