import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createRecipe, createUser, resetDb } from "../../tests/db/helpers";
import { addCookLog, getRecipe, listRecipes, RECIPES_PER_PAGE, toggleFavorite } from "./recipes";

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("他人のデータへのアクセス制御", () => {
  it("一覧には自分のレシピしか出ない", async () => {
    const me = await createUser("自分");
    const other = await createUser("他人");
    await createRecipe(me.id, { title: "自分のレシピ" });
    await createRecipe(other.id, { title: "他人のレシピ" });

    const { items, total } = await listRecipes(me.id);

    expect(total).toBe(1);
    expect(items.map((r) => r.title)).toEqual(["自分のレシピ"]);
  });

  it("他人のレシピの ID を指定しても取得できない", async () => {
    const me = await createUser();
    const other = await createUser();
    const othersRecipe = await createRecipe(other.id);

    expect(await getRecipe(me.id, othersRecipe.id)).toBeNull();
  });

  it("他人のレシピのお気に入りは変更できない", async () => {
    const me = await createUser();
    const other = await createUser();
    const othersRecipe = await createRecipe(other.id, { isFavorite: false });

    expect(await toggleFavorite(me.id, othersRecipe.id)).toBeNull();

    const after = await prisma.recipe.findUniqueOrThrow({ where: { id: othersRecipe.id } });
    expect(after.isFavorite).toBe(false);
  });

  it("他人のレシピに作った記録は付けられない", async () => {
    const me = await createUser();
    const other = await createUser();
    const othersRecipe = await createRecipe(other.id);

    expect(await addCookLog(me.id, othersRecipe.id, { rating: 5, memo: null })).toBe(false);
    expect(await prisma.cookLog.count()).toBe(0);
  });

  it("存在しない ID や UUID でない ID は「見つからない」扱いにする", async () => {
    const me = await createUser();

    expect(await getRecipe(me.id, randomUUID())).toBeNull();
    expect(await getRecipe(me.id, "not-a-uuid")).toBeNull();
    expect(await toggleFavorite(me.id, "not-a-uuid")).toBeNull();
  });
});

describe("listRecipes", () => {
  it("新しい順に並び、お酒の種類とお気に入りで絞り込める", async () => {
    const me = await createUser();
    await createRecipe(me.id, { title: "古いビール", drinkType: "beer", createdAt: new Date("2026-01-01") });
    await createRecipe(me.id, { title: "新しいビール", drinkType: "beer", isFavorite: true, createdAt: new Date("2026-02-01") });
    await createRecipe(me.id, { title: "日本酒", drinkType: "sake", createdAt: new Date("2026-03-01") });

    expect((await listRecipes(me.id)).items.map((r) => r.title)).toEqual(["日本酒", "新しいビール", "古いビール"]);
    expect((await listRecipes(me.id, { drinkType: "beer" })).items.map((r) => r.title)).toEqual(["新しいビール", "古いビール"]);
    expect((await listRecipes(me.id, { favoritesOnly: true })).items.map((r) => r.title)).toEqual(["新しいビール"]);
  });

  it("ページ送りができ、範囲外のページ番号は端に寄せる", async () => {
    const me = await createUser();
    for (let i = 0; i < RECIPES_PER_PAGE + 2; i++) {
      await createRecipe(me.id, { title: `レシピ${i}`, createdAt: new Date(2026, 0, i + 1) });
    }

    const page1 = await listRecipes(me.id, { page: 1 });
    const page2 = await listRecipes(me.id, { page: 2 });
    const tooBig = await listRecipes(me.id, { page: 999 });
    const tooSmall = await listRecipes(me.id, { page: -5 });

    expect(page1.items).toHaveLength(RECIPES_PER_PAGE);
    expect(page2.items).toHaveLength(2);
    expect(page1.totalPages).toBe(2);
    expect(tooBig.page).toBe(2);
    expect(tooSmall.page).toBe(1);
  });

  it("作った回数と平均評価を計算する", async () => {
    const me = await createUser();
    const recipe = await createRecipe(me.id);
    await addCookLog(me.id, recipe.id, { rating: 5, memo: null });
    await addCookLog(me.id, recipe.id, { rating: 2, memo: "しょっぱかった" });

    const [item] = (await listRecipes(me.id)).items;

    expect(item.cookCount).toBe(2);
    expect(item.averageRating).toBe(3.5);
  });
});

describe("toggleFavorite / getRecipe", () => {
  it("お気に入りを付けたり外したりでき、詳細に作った記録が新しい順で付く", async () => {
    const me = await createUser();
    const recipe = await createRecipe(me.id);

    expect(await toggleFavorite(me.id, recipe.id)).toBe(true);
    expect(await toggleFavorite(me.id, recipe.id)).toBe(false);

    await prisma.cookLog.create({ data: { recipeId: recipe.id, userId: me.id, rating: 3, cookedAt: new Date("2026-01-01") } });
    await prisma.cookLog.create({ data: { recipeId: recipe.id, userId: me.id, rating: 4, cookedAt: new Date("2026-02-01") } });

    const detail = await getRecipe(me.id, recipe.id);
    expect(detail?.ingredients).toEqual([{ name: "キャベツ", amount: "1/4玉" }]);
    expect(detail?.cookLogs.map((l) => l.rating)).toEqual([4, 3]);
  });
});
