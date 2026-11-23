import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Stars } from "@/components/Stars";
import { requireUser } from "@/lib/auth";
import { DRINK_LABELS } from "@/lib/drinks";
import { getRecipe } from "@/lib/recipes";
import { CookLogForm } from "./CookLogForm";

export default function RecipeDetailPage({ params }: PageProps<"/recipes/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10">
      <AppHeader />
      <Link href="/recipes" className="mt-8 text-sm text-zinc-500 hover:underline">
        ← 履歴に戻る
      </Link>
      <Suspense fallback={<div className="mt-4 h-96 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />}>
        <RecipeDetail params={params} />
      </Suspense>
    </main>
  );
}

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "Asia/Tokyo",
});

async function RecipeDetail({ params }: Pick<PageProps<"/recipes/[id]">, "params">) {
  const user = await requireUser();
  const { id } = await params;
  // 他人のレシピの ID を直接 URL に入れても、自分のものでなければ「見つからない」扱いにする
  const recipe = await getRecipe(user.id, id);
  if (!recipe) notFound();

  return (
    <>
      <article className="mt-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{recipe.title}</h1>
          <FavoriteButton recipeId={recipe.id} initialFavorite={recipe.isFavorite} />
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 text-sm text-zinc-500">
          <span>🍶 {DRINK_LABELS[recipe.drinkType]}</span>
          <span>⏱ {recipe.cookMinutes}分</span>
          <span>{recipe.source === "ai" ? "AI の提案" : "自分で登録"}・{dateFormatter.format(recipe.createdAt)}</span>
        </p>

        <h2 className="mt-6 font-semibold">材料</h2>
        <ul className="mt-2 grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
          {recipe.ingredients.map((ing, i) => (
            <li key={i} className="flex justify-between border-b border-dashed border-zinc-200 py-1 dark:border-zinc-800">
              <span>{ing.name}</span>
              <span className="text-zinc-500">{ing.amount}</span>
            </li>
          ))}
        </ul>

        <h2 className="mt-6 font-semibold">作り方</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
          {recipe.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </article>

      <section className="mt-8">
        <h2 className="text-lg font-bold">作った記録</h2>
        <CookLogForm recipeId={recipe.id} />

        {recipe.cookLogs.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">まだ記録がありません。作ったら評価を残しておきましょう。</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {recipe.cookLogs.map((log) => (
              <li key={log.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <Stars rating={log.rating} className="text-base" />
                  <time className="text-zinc-500" dateTime={log.cookedAt.toISOString()}>
                    {dateFormatter.format(log.cookedAt)}
                  </time>
                </div>
                {log.memo && <p className="mt-2 whitespace-pre-wrap text-sm">{log.memo}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
