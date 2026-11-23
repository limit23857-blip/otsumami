/**
 * テスト専用 DB の接続先。
 * TEST_DATABASE_URL があればそれを使い、なければ docker-compose.yml の PostgreSQL 上の otsumami_test を使う。
 *
 * 安全装置: 本番 DB を誤って消さないよう、localhost / 127.0.0.1 以外には接続させない。
 */
const DEFAULT_URL = "postgresql://postgres:postgres@localhost:5432/otsumami_test";

const url = process.env.TEST_DATABASE_URL ?? DEFAULT_URL;
const { hostname, pathname } = new URL(url);

if (!["localhost", "127.0.0.1"].includes(hostname)) {
  throw new Error(
    `テスト用 DB は localhost にしか接続できません（指定された接続先: ${hostname}）。` +
      "本番 DB のデータを消さないための安全装置です。",
  );
}
if (!pathname.endsWith("_test")) {
  throw new Error(`テスト用 DB の名前は "_test" で終わる必要があります（指定: ${pathname.slice(1)}）。`);
}

export const TEST_DATABASE_URL = url;
