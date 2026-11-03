import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// 開発中はファイル保存のたびにモジュールが読み直されるため、
// 接続が増え続けないように PrismaClient を1つだけ使い回す（シングルトン）
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL が設定されていません（.env を確認してください）");
  }
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  globalForPrisma.prisma = client;
  return client;
}

/**
 * 実際に DB を使った時点で初めて接続を作る（遅延初期化）。
 * import しただけでは何もしないので、DATABASE_URL のないビルド時にも落ちない。
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
