import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// テスト専用 DB の接続先（tests/db/test-database-url.ts と同じ値）。
// localhost 以外を指していないかの安全チェックは、DB テストの最初（global-setup）で行う
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/otsumami_test";

// "server-only" はサーバー以外で読み込むとエラーにする部品。テストでは中身を空にする
const serverOnlyStub = fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // tsconfig.json の "@/*" → "src/*" の設定をテストでも使う
    tsconfigPaths: true,
    alias: { "server-only": serverOnlyStub },
  },
  test: {
    restoreMocks: true,
    projects: [
      {
        // 単体テスト: DB も AI も使わない
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.db.test.ts"],
        },
      },
      {
        // 画面のテスト: ブラウザの代わりに jsdom で動かす
        extends: true,
        test: {
          name: "component",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
        },
      },
      {
        // DB を使うテスト: テスト専用の PostgreSQL（localhost のみ）を使う
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: ["src/**/*.db.test.ts"],
          globalSetup: ["./tests/db/global-setup.ts"],
          // テスト同士が同じ DB を使うので、ファイルを1つずつ順番に実行する
          fileParallelism: false,
          // .env の DATABASE_URL（本番の Supabase）は絶対に使わない
          env: { DATABASE_URL: TEST_DATABASE_URL },
        },
      },
    ],
  },
});
