import Link from "next/link";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Stars } from "@/components/Stars";
import { requireUser } from "@/lib/auth";
import { DRINK_LABELS, DRINK_TYPES } from "@/lib/drinks";
import { listRecipes, type RecipeFilter } from "@/lib/recipes";
import type { DrinkType } from "@/generated/prisma/enums";

export default function RecipesPage({ searchParams }: PageProps<"/recipes">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10">
      <AppHeader />
      <h1 className="mt-10 text-2xl font-bold">これまでのおつまみ</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">AI が提案したおつまみの履歴です。</p>

      {/* 絞り込みと一覧は URL のパラメータとログイン情報を使うので、後から流し込む */}
      <Suspense fallback={<ListSkeleton />}>
        <RecipeList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** URL のパラメータ（?drink=beer&fav=1&page=2）を、安全な絞り込み条件に変換する */
function toFilter(params: Record<string, string | string[] | undefined>): RecipeFilter {
  const drink = typeof params.drink === "string" ? params.drink : undefined;
  const page = typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;
  return {
    drinkType: DRINK_TYPES.includes(drink as DrinkType) ? (drink as DrinkType) : undefined,
    favoritesOnly: params.fav === "1",
    page: Number.isFinite(page) ? page : 1,
  };
}

/** 現在の絞り込みを保ったまま、一部だけ変えた URL を作る */
function hrefWith(filter: RecipeFilter, change: Partial<RecipeFilter>) {
  const next = { ...filter, ...change };
  const params = new URLSearchParams();
  if (next.drinkType) params.set("drink", next.drinkType);
  if (next.favoritesOnly) params.set("fav", "1");
  if (next.page && next.page > 1) params.set("page", String(next.page));
  const query = params.toString();
  return query ? `/recipes?${query}` : "/recipes";
}

async function RecipeList({ searchParams }: Pick<PageProps<"/recipes">, "searchParams">) {
  const user = await requireUser();
  const filter = toFilter(await searchParams);
  const { items, total, page, totalPages } = await listRecipes(user.id, filter);

  const chip = (active: boolean) =>
    `inline-block rounded-full border px-3 py-1 text-sm transition ${
      active
        ? "border-amber-500 bg-amber-500 text-white"
        : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
    }`;

  return (
    <>
      <nav aria-label="絞り込み" className="mt-6 flex flex-wrap gap-2">
        <Link href={hrefWith(filter, { drinkType: undefined, page: 1 })} className={chip(!filter.drinkType)}>
          すべて
        </Link>
        {DRINK_TYPES.map((type) => (
          <Link
            key={type}
            href={hrefWith(filter, { drinkType: type, page: 1 })}
            className={chip(filter.drinkType === type)}
          >
            {DRINK_LABELS[type]}
          </Link>
        ))}
        <Link
          href={hrefWith(filter, { favoritesOnly: !filter.favoritesOnly, page: 1 })}
          className={chip(Boolean(filter.favoritesOnly))}
        >
          ★ お気に入りのみ
        </Link>
      </nav>

      <p className="mt-4 text-sm text-zinc-500">{total}件</p>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500 dark:border-zinc-700">
          {total === 0 && !filter.drinkType && !filter.favoritesOnly ? (
            <>
              まだ履歴がありません。
              <Link href="/" className="ml-1 font-semibold text-amber-600 underline">
                おつまみを提案してもらう
              </Link>
            </>
          ) : (
            "条件に合うおつまみはありません。"
          )}
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Link href={`/recipes/${r.id}`} className="min-w-0 flex-1">
                <p className="truncate font-semibold hover:underline">{r.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-zinc-500">
                  <span>{DRINK_LABELS[r.drinkType]}</span>
                  <span>⏱ {r.cookMinutes}分</span>
                  {r.averageRating !== null ? (
                    <span>
                      <Stars rating={r.averageRating} /> {r.cookCount}回作った
                    </span>
                  ) : (
                    <span>まだ作っていない</span>
                  )}
                </p>
              </Link>
              <FavoriteButton recipeId={r.id} initialFavorite={r.isFavorite} size="sm" />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav aria-label="ページ送り" className="mt-6 flex items-center justify-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={hrefWith(filter, { page: page - 1 })} className="rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700">
              ← 前へ
            </Link>
          ) : (
            <span className="px-3 py-1.5 text-zinc-300 dark:text-zinc-700">← 前へ</span>
          )}
          <span>
            {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={hrefWith(filter, { page: page + 1 })} className="rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700">
              次へ →
            </Link>
          ) : (
            <span className="px-3 py-1.5 text-zinc-300 dark:text-zinc-700">次へ →</span>
          )}
        </nav>
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="mt-6 space-y-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
      ))}
    </div>
  );
}
