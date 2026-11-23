"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { suggestAction, type SuggestState } from "./actions";
import { COOK_MINUTES_OPTIONS, DRINK_LABELS, DRINK_TYPES } from "@/lib/drinks";
import type { DrinkType } from "@/generated/prisma/enums";
import { FavoriteButton } from "@/components/FavoriteButton";

const initialState: SuggestState = { status: "idle" };

export function SuggestForm() {
  const [state, formAction, isPending] = useActionState(suggestAction, initialState);

  // React 19 ではフォーム送信後に入力欄が初期化されるため、
  // 入力内容を state として持ち、送信後も選んだ内容が残るようにする
  const [drinkType, setDrinkType] = useState<DrinkType>(DRINK_TYPES[0]);
  const [ingredients, setIngredients] = useState("");
  const [maxMinutes, setMaxMinutes] = useState<number>(15);

  return (
    <div className="mt-8">
      <form action={formAction} className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <fieldset>
          <legend className="font-semibold">今日のお酒は？</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {DRINK_TYPES.map((type) => (
              <label key={type} className="cursor-pointer">
                <input
                  type="radio"
                  name="drinkType"
                  value={type}
                  checked={drinkType === type}
                  onChange={() => setDrinkType(type)}
                  className="peer sr-only"
                />
                <span className="inline-block rounded-full border border-zinc-300 px-4 py-2 text-sm transition peer-checked:border-amber-500 peer-checked:bg-amber-500 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400 dark:border-zinc-700">
                  {DRINK_LABELS[type]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="ingredients" className="font-semibold">
            冷蔵庫にある食材 <span className="text-sm font-normal text-zinc-500">（任意）</span>
          </label>
          <input
            id="ingredients"
            name="ingredients"
            type="text"
            maxLength={200}
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="例: キャベツ、豚バラ、卵"
            className="mt-2 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 dark:border-zinc-700"
          />
        </div>

        <fieldset>
          <legend className="font-semibold">かけられる時間</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {COOK_MINUTES_OPTIONS.map((min) => (
              <label key={min} className="cursor-pointer">
                <input
                  type="radio"
                  name="maxMinutes"
                  value={min}
                  checked={maxMinutes === min}
                  onChange={() => setMaxMinutes(min)}
                  className="peer sr-only"
                />
                <span className="inline-block rounded-full border border-zinc-300 px-4 py-2 text-sm transition peer-checked:border-amber-500 peer-checked:bg-amber-500 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-amber-400 dark:border-zinc-700">
                  {min}分以内
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-amber-500 px-4 py-3 font-semibold text-white transition hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "考え中…🤔" : "おつまみを提案してもらう"}
        </button>
      </form>

      <div aria-live="polite">
        {state.status === "error" && (
          <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {state.message}
          </p>
        )}

        {state.status === "success" && (
          <ul className="mt-8 space-y-4">
            {state.recipes.map((recipe) => (
              <li key={recipe.id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">{recipe.title}</h3>
                    <span className="text-sm text-zinc-500">⏱ {recipe.cookMinutes}分</span>
                  </div>
                  <FavoriteButton recipeId={recipe.id} initialFavorite={false} size="sm" />
                </div>

                <h4 className="mt-4 text-sm font-semibold text-zinc-600 dark:text-zinc-400">材料</h4>
                <ul className="mt-1 grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i} className="flex justify-between border-b border-dashed border-zinc-200 py-1 dark:border-zinc-800">
                      <span>{ing.name}</span>
                      <span className="text-zinc-500">{ing.amount}</span>
                    </li>
                  ))}
                </ul>

                <h4 className="mt-4 text-sm font-semibold text-zinc-600 dark:text-zinc-400">作り方</h4>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
                  {recipe.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>

                <Link href={`/recipes/${recipe.id}`} className="mt-4 inline-block text-sm font-semibold text-amber-600 hover:underline">
                  作ったら記録する →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
