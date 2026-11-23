// 安全装置: 読み込んだ時点で接続先が localhost の "_test" DB かを確認する（違えば例外で止まる）
import "./test-database-url";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { DrinkType } from "@/generated/prisma/enums";

/** テストごとに DB を空にする */
export async function resetDb() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "cook_logs", "recipes", "users" CASCADE');
}

export async function createUser(name = "テストユーザー") {
  const id = randomUUID();
  return prisma.user.create({ data: { id, email: `${id}@example.com`, name } });
}

export async function createRecipe(
  userId: string,
  overrides: Partial<{ title: string; drinkType: DrinkType; isFavorite: boolean; createdAt: Date; source: "ai" | "manual" }> = {},
) {
  return prisma.recipe.create({
    data: {
      userId,
      title: overrides.title ?? "やみつきキャベツ",
      ingredients: [{ name: "キャベツ", amount: "1/4玉" }],
      steps: ["ちぎる", "和える"],
      cookMinutes: 5,
      drinkType: overrides.drinkType ?? "beer",
      source: overrides.source ?? "ai",
      isFavorite: overrides.isFavorite ?? false,
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    },
  });
}
