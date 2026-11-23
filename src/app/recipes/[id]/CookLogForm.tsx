"use client";

import { useActionState, useState } from "react";
import { addCookLogAction, type CookLogState } from "@/app/recipes/actions";

const initialState: CookLogState = { status: "idle" };

/** 作った記録（★評価とメモ）の入力フォーム */
export function CookLogForm({ recipeId }: { recipeId: string }) {
  // recipeId をあらかじめ渡しておいた Server Action を作る
  const action = addCookLogAction.bind(null, recipeId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [rating, setRating] = useState(0);
  const [memo, setMemo] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // 保存に成功したら入力欄を空に戻す（保存のたびに1回だけ）
  if (state.status === "success" && state.savedAt !== lastSavedAt) {
    setLastSavedAt(state.savedAt);
    setRating(0);
    setMemo("");
  }

  return (
    <form action={formAction} className="mt-4 space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <fieldset>
        <legend className="text-sm font-semibold">評価</legend>
        <div className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer text-2xl leading-none">
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={`rounded peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400 ${
                  n <= rating ? "text-amber-500" : "text-zinc-300 dark:text-zinc-700"
                }`}
              >
                ★
              </span>
              <span className="sr-only">{n}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="memo" className="text-sm font-semibold">
          メモ <span className="font-normal text-zinc-500">（任意）</span>
        </label>
        <textarea
          id="memo"
          name="memo"
          rows={2}
          maxLength={500}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="例: 塩を少なめにしたらちょうどよかった"
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-zinc-700"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
        >
          {isPending ? "保存中…" : "記録する"}
        </button>
        <p aria-live="polite" className="text-sm">
          {state.status === "error" && <span className="text-red-600 dark:text-red-400">{state.message}</span>}
          {state.status === "success" && <span className="text-green-700 dark:text-green-400">記録しました 🍺</span>}
        </p>
      </div>
    </form>
  );
}
