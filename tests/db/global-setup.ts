import { execFileSync } from "node:child_process";
import { Client } from "pg";
import { TEST_DATABASE_URL } from "./test-database-url";

/** DB テストの前に1回だけ実行: テスト用 DB がなければ作り、マイグレーションを適用する */
export default async function setup() {
  const target = new URL(TEST_DATABASE_URL);
  const dbName = target.pathname.slice(1);

  // 管理用の "postgres" DB につないで、テスト用 DB の有無を確認する
  const admin = new URL(TEST_DATABASE_URL);
  admin.pathname = "/postgres";
  admin.search = "";
  const client = new Client({ connectionString: admin.toString() });
  try {
    await client.connect();
  } catch (e) {
    throw new Error(
      `テスト用の PostgreSQL（${target.host}）に接続できません。` +
        "`docker compose up -d` で起動してから実行してください。\n" +
        String(e),
    );
  }
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (exists.rowCount === 0) {
    // DB 名は test-database-url.ts で検証済み（"_test" で終わる名前）
    await client.query(`CREATE DATABASE "${dbName.replaceAll('"', "")}"`);
  }
  await client.end();

  // 本番と同じマイグレーションを適用する（DATABASE_URL を明示的に上書きして .env を使わせない）
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });
}
