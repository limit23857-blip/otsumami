"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { COOK_MINUTES_OPTIONS, DRINK_TYPES } from "@/lib/drinks";
import { SuggestError, suggestOtsumami } from "@/lib/ai/suggest";
import type { DrinkType } from "@/generated/prisma/enums";

/** 1人あたり、24時間に AI 提案を使える回数（API 料金の使いすぎ防止） */
const DAILY_LIMIT = 10;
const RECIPES_PER_SUGGESTION = 3;

const InputSchema = z.object({
  drinkType: z.enum(DRINK_TYPES as [DrinkType, ...DrinkType[]]),
  ingredients: z.string().max(200, "食材は200文字以内で入力してください"),
  maxMinutes: z.coerce
    .number()
    .refine((n) => (COOK_MINUTES_OPTIONS as readonly number[]).includes(n), "調理時間を選んでください"),
});

export type SuggestedRecipeView = {
  id: string;
  title: string;
  ingredients: { name: string; amount: string }[];
  steps: string[];
  cookMinutes: number;
};

export type SuggestState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; recipes: SuggestedRecipeView[] };

const ERROR_MESSAGES: Record<SuggestError["reason"], string> = {
  refused: "この内容ではおつまみを提案できませんでした。食材を変えて試してください。",
  rate_limited: "AI が混み合っています。少し時間をおいて試してください。",
  unavailable: "AI を呼び出せませんでした。時間をおいて試してください。",
  invalid_output: "AI の回答をうまく読み取れませんでした。もう一度お試しください。",
};

export async function suggestAction(_prev: SuggestState, formData: FormData): Promise<SuggestState> {
  const user = await requireUser();

  // 1. 入力チェック（画面側のチェックは書き換えられるので、サーバーでも必ず行う）
  const parsed = InputSchema.safeParse({
    drinkType: formData.get("drinkType"),
    ingredients: formData.get("ingredients") ?? "",
    maxMinutes: formData.get("maxMinutes"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "入力内容を確認してください" };
  }
  const input = parsed.data;

  // 2. 回数制限
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = await prisma.recipe.count({
    where: { userId: user.id, source: "ai", createdAt: { gte: since } },
  });
  if (recentCount >= DAILY_LIMIT * RECIPES_PER_SUGGESTION) {
    return {
      status: "error",
      message: `AI 提案は1日${DAILY_LIMIT}回までです。また明日お試しください。`,
    };
  }

  // 3. AI に提案してもらう
  let suggestions;
  try {
    suggestions = await suggestOtsumami(input);
  } catch (e) {
    if (e instanceof SuggestError) {
      return { status: "error", message: ERROR_MESSAGES[e.reason] };
    }
    throw e;
  }

  // 4. 提案されたレシピを保存（あとで履歴やお気に入りとして見返せるように）
  const saved = await prisma.recipe.createManyAndReturn({
    data: suggestions.map((s) => ({
      userId: user.id,
      title: s.title,
      ingredients: s.ingredients,
      steps: s.steps,
      cookMinutes: s.cookMinutes,
      drinkType: input.drinkType,
      source: "ai" as const,
    })),
  });

  return {
    status: "success",
    recipes: saved.map((r, i) => ({
      id: r.id,
      title: r.title,
      ingredients: suggestions[i].ingredients,
      steps: suggestions[i].steps,
      cookMinutes: r.cookMinutes,
    })),
  };
}
