"use client";

import { useState, useTransition } from "react";
import { toggleFavoriteAction } from "@/app/recipes/actions";

type Props = {
  recipeId: string;
  initialFavorite: boolean;
  size?: "sm" | "md";
};

/** お気に入りの ☆/★ ボタン。押すとすぐ見た目を変え、サーバーの結果で確定させる */
export function FavoriteButton({ recipeId, initialFavorite, size = "md" }: Props) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const optimistic = !isFavorite;
    setIsFavorite(optimistic);
    startTransition(async () => {
      const result = await toggleFavoriteAction(recipeId);
      // 失敗したら元に戻す
      setIsFavorite(result ?? !optimistic);
    });
  }

  const label = isFavorite ? "お気に入りから外す" : "お気に入りに追加";
  const sizeClass = size === "sm" ? "px-2 py-1 text-sm" : "px-3 py-1.5";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isFavorite}
      aria-label={label}
      title={label}
      className={`shrink-0 rounded-lg border transition disabled:opacity-60 ${sizeClass} ${
        isFavorite
          ? "border-amber-400 bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300"
          : "border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      }`}
    >
      {isFavorite ? "★ お気に入り" : "☆ お気に入り"}
    </button>
  );
}
