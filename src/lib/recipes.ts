import "server-only";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { DrinkType, RecipeSource } from "@/generated/prisma/enums";

/**
 * レシピまわりのデータ取得をまとめた層（Java で言う DAO / Repository）。
 * どの関数も userId を必ず受け取り、「自分のレシピ」以外は絶対に返さない。
 */

export const RECIPES_PER_PAGE = 12;

const IngredientsSchema = z.array(z.object({ name: z.string(), amount: z.string() }));
const StepsSchema = z.array(z.string());

export type Ingredient = z.infer<typeof IngredientsSchema>[number];

export type RecipeSummary = {
  id: string;
  title: string;
  cookMinutes: number;
  drinkType: DrinkType;
  source: RecipeSource;
  isFavorite: boolean;
  createdAt: Date;
  cookCount: number;
  averageRating: number | null;
};

export type CookLogView = {
  id: string;
  rating: number;
  memo: string | null;
  cookedAt: Date;
};

export type RecipeDetail = Omit<RecipeSummary, "cookCount" | "averageRating"> & {
  ingredients: Ingredient[];
  steps: string[];
  cookLogs: CookLogView[];
};

export type RecipeFilter = {
  drinkType?: DrinkType;
  favoritesOnly?: boolean;
  page?: number;
};

/** DB の JSON 列は中身の形が保証されないので、読み込むときに検証する */
export function parseIngredients(value: unknown): Ingredient[] {
  const result = IngredientsSchema.safeParse(value);
  return result.success ? result.data : [];
}

export function parseSteps(value: unknown): string[] {
  const result = StepsSchema.safeParse(value);
  return result.success ? result.data : [];
}

/** URL などから来た ID が UUID の形をしているか（DB に変な値を渡さないため） */
export function isValidRecipeId(id: string): boolean {
  return z.uuid().safeParse(id).success;
}

/** 自分のレシピ一覧（新しい順・絞り込み・ページ送り） */
export async function listRecipes(
  userId: string,
  filter: RecipeFilter = {},
): Promise<{ items: RecipeSummary[]; total: number; page: number; totalPages: number }> {
  const where = {
    userId,
    ...(filter.drinkType ? { drinkType: filter.drinkType } : {}),
    ...(filter.favoritesOnly ? { isFavorite: true } : {}),
  };

  const total = await prisma.recipe.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / RECIPES_PER_PAGE));
  const page = Math.min(Math.max(1, Math.floor(filter.page ?? 1)), totalPages);

  const rows = await prisma.recipe.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * RECIPES_PER_PAGE,
    take: RECIPES_PER_PAGE,
    select: {
      id: true,
      title: true,
      cookMinutes: true,
      drinkType: true,
      source: true,
      isFavorite: true,
      createdAt: true,
      cookLogs: { select: { rating: true } },
    },
  });

  const items = rows.map(({ cookLogs, ...r }) => ({
    ...r,
    cookCount: cookLogs.length,
    averageRating:
      cookLogs.length > 0 ? cookLogs.reduce((sum, l) => sum + l.rating, 0) / cookLogs.length : null,
  }));

  return { items, total, page, totalPages };
}

/** 自分のレシピ1件（作った記録つき）。他人のレシピや存在しない ID なら null */
export async function getRecipe(userId: string, recipeId: string): Promise<RecipeDetail | null> {
  if (!isValidRecipeId(recipeId)) return null;

  const row = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    include: { cookLogs: { orderBy: { cookedAt: "desc" } } },
  });
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    cookMinutes: row.cookMinutes,
    drinkType: row.drinkType,
    source: row.source,
    isFavorite: row.isFavorite,
    createdAt: row.createdAt,
    ingredients: parseIngredients(row.ingredients),
    steps: parseSteps(row.steps),
    cookLogs: row.cookLogs.map((l) => ({
      id: l.id,
      rating: l.rating,
      memo: l.memo,
      cookedAt: l.cookedAt,
    })),
  };
}

/** お気に入りを反転させ、新しい値を返す。自分のレシピでなければ null */
export async function toggleFavorite(userId: string, recipeId: string): Promise<boolean | null> {
  if (!isValidRecipeId(recipeId)) return null;

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    select: { isFavorite: true },
  });
  if (!recipe) return null;

  const next = !recipe.isFavorite;
  // where に userId も入れて、更新の時点でも本人のレシピであることを保証する
  await prisma.recipe.updateMany({ where: { id: recipeId, userId }, data: { isFavorite: next } });
  return next;
}

/** 作った記録を追加する。自分のレシピでなければ false */
export async function addCookLog(
  userId: string,
  recipeId: string,
  input: { rating: number; memo: string | null },
): Promise<boolean> {
  if (!isValidRecipeId(recipeId)) return false;

  const recipe = await prisma.recipe.findFirst({ where: { id: recipeId, userId }, select: { id: true } });
  if (!recipe) return false;

  await prisma.cookLog.create({
    data: { recipeId, userId, rating: input.rating, memo: input.memo },
  });
  return true;
}
