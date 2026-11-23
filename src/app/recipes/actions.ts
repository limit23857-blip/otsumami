"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { addCookLog, toggleFavorite } from "@/lib/recipes";

/** お気に入りを切り替える。新しい状態を返す（見つからなければ null） */
export async function toggleFavoriteAction(recipeId: string): Promise<boolean | null> {
  const user = await requireUser();
  const next = await toggleFavorite(user.id, recipeId);
  if (next !== null) refresh();
  return next;
}

const CookLogSchema = z.object({
  rating: z.coerce
    .number({ error: "評価を選んでください" })
    .int("評価を選んでください")
    .min(1, "評価を選んでください")
    .max(5, "評価を選んでください"),
  memo: z
    .string()
    .trim()
    .max(500, "メモは500文字以内で入力してください")
    .transform((s) => (s === "" ? null : s)),
});

export type CookLogState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; savedAt: number };

/** 作った記録（評価とメモ）を登録する */
export async function addCookLogAction(
  recipeId: string,
  _prev: CookLogState,
  formData: FormData,
): Promise<CookLogState> {
  const user = await requireUser();

  const parsed = CookLogSchema.safeParse({
    rating: formData.get("rating") ?? "",
    memo: formData.get("memo") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "入力内容を確認してください" };
  }

  const ok = await addCookLog(user.id, recipeId, parsed.data);
  if (!ok) {
    return { status: "error", message: "レシピが見つかりませんでした" };
  }

  refresh();
  return { status: "success", savedAt: Date.now() };
}
