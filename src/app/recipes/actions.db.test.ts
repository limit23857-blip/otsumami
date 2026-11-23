import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createRecipe, createUser, resetDb } from "../../../tests/db/helpers";

vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
// refresh() は Server Action の中でしか動かないので、テストでは呼ばれたかだけを確認する
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const { requireUser } = await import("@/lib/auth");
const { refresh } = await import("next/cache");
const { addCookLogAction, toggleFavoriteAction } = await import("./actions");

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

async function loginAs() {
  const user = await createUser();
  vi.mocked(requireUser).mockResolvedValue({ id: user.id, email: user.email, name: user.name });
  return user;
}

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe("addCookLogAction", () => {
  it("評価とメモを保存し、画面を更新する", async () => {
    const user = await loginAs();
    const recipe = await createRecipe(user.id);

    const result = await addCookLogAction(recipe.id, { status: "idle" }, form({ rating: "4", memo: "  ごま油多めが正解  " }));

    expect(result.status).toBe("success");
    const logs = await prisma.cookLog.findMany();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ rating: 4, memo: "ごま油多めが正解", userId: user.id });
    expect(refresh).toHaveBeenCalled();
  });

  it("メモが空なら null で保存する", async () => {
    const user = await loginAs();
    const recipe = await createRecipe(user.id);

    await addCookLogAction(recipe.id, { status: "idle" }, form({ rating: "3", memo: "   " }));

    expect((await prisma.cookLog.findFirstOrThrow()).memo).toBeNull();
  });

  it.each([
    ["評価なし", { memo: "" }],
    ["評価が0", { rating: "0", memo: "" }],
    ["評価が6", { rating: "6", memo: "" }],
    ["評価が小数", { rating: "3.5", memo: "" }],
    ["メモが500文字超", { rating: "3", memo: "あ".repeat(501) }],
  ])("入力が不正なとき（%s）は保存しない", async (_label, input) => {
    const user = await loginAs();
    const recipe = await createRecipe(user.id);

    const result = await addCookLogAction(recipe.id, { status: "idle" }, form(input as Record<string, string>));

    expect(result.status).toBe("error");
    expect(await prisma.cookLog.count()).toBe(0);
  });

  it("他人のレシピには記録できない", async () => {
    await loginAs();
    const other = await createUser();
    const othersRecipe = await createRecipe(other.id);

    const result = await addCookLogAction(othersRecipe.id, { status: "idle" }, form({ rating: "5", memo: "" }));

    expect(result).toEqual({ status: "error", message: "レシピが見つかりませんでした" });
    expect(await prisma.cookLog.count()).toBe(0);
  });
});

describe("toggleFavoriteAction", () => {
  it("自分のレシピなら切り替えて画面を更新し、他人のレシピなら何もしない", async () => {
    const user = await loginAs();
    const mine = await createRecipe(user.id);
    const other = await createUser();
    const others = await createRecipe(other.id);

    expect(await toggleFavoriteAction(mine.id)).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(1);

    expect(await toggleFavoriteAction(others.id)).toBeNull();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
