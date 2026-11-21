// ESLint flat config (Next.js 16 — `next lint` 제거, `next build`가 lint를 돌리지 않으므로 `npm run lint`로 실행)
// 참고: node_modules/next/dist/docs/01-app/03-api-reference/05-config/03-eslint.md
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // eslint-config-next 기본 무시 목록
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
