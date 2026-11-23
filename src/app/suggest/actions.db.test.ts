import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { createRecipe, createUser, resetDb } from "../../../tests/db/helpers";

// ログイン中のユーザーと AI の呼び出しは偽物に差し替える（AI にお金がかからないように）
vi.mock("@/lib/auth", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/ai/suggest", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/suggest")>();
  return { ...actual, suggestOtsumami: vi.fn() };
});

const { requireUser } = await import("@/lib/auth");
const { SuggestError, suggestOtsumami } = await import("@/lib/ai/suggest");
const { suggestAction } = await import("./actions");

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

const validInput = { drinkType: "beer", ingredients: "キャベツ", maxMinutes: "15" };
const suggestion = (title: string) => ({
  title,
  ingredients: [{ name: "キャベツ", amount: "1/4玉" }],
  steps: ["ちぎる"],
  cookMinutes: 5,
});

async function loginAs() {
  const user = await createUser();
  vi.mocked(requireUser).mockResolvedValue({ id: user.id, email: user.email, name: user.name });
  return user;
}

beforeEach(async () => {
  await resetDb();
  vi.mocked(suggestOtsumami).mockReset();
});
afterAll(() => prisma.$disconnect());

describe("suggestAction", () => {
  it("AI の提案を、ログイン中のユーザーのレシピとして保存して返す", async () => {
    const user = await loginAs();
    vi.mocked(suggestOtsumami).mockResolvedValue([suggestion("A"), suggestion("B"), suggestion("C")]);

    const result = await suggestAction({ status: "idle" }, form(validInput));

    expect(result.status).toBe("success");
    const saved = await prisma.recipe.findMany({ orderBy: { title: "asc" } });
    expect(saved.map((r) => [r.title, r.userId, r.source, r.drinkType])).toEqual([
      ["A", user.id, "ai", "beer"],
      ["B", user.id, "ai", "beer"],
      ["C", user.id, "ai", "beer"],
    ]);
    if (result.status === "success") {
      expect(result.recipes.map((r) => r.id).sort()).toEqual(saved.map((r) => r.id).sort());
    }
  });

  it.each([
    ["お酒の種類が不正", { ...validInput, drinkType: "cola" }],
    ["調理時間が選択肢にない", { ...validInput, maxMinutes: "7" }],
    ["食材が200文字を超える", { ...validInput, ingredients: "あ".repeat(201) }],
  ])("入力が不正なとき（%s）は AI を呼ばずにエラーを返す", async (_label, input) => {
    await loginAs();

    const result = await suggestAction({ status: "idle" }, form(input));

    expect(result.status).toBe("error");
    expect(suggestOtsumami).not.toHaveBeenCalled();
  });

  it("24時間で10回（30品）使ったら、AI を呼ばずに断る", async () => {
    const user = await loginAs();
    for (let i = 0; i < 30; i++) await createRecipe(user.id, { source: "ai" });

    const result = await suggestAction({ status: "idle" }, form(validInput));

    expect(result).toEqual({ status: "error", message: expect.stringContaining("1日10回まで") });
    expect(suggestOtsumami).not.toHaveBeenCalled();
  });

  it("24時間より前の提案や、他人の提案は回数に数えない", async () => {
    const user = await loginAs();
    const other = await createUser();
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    for (let i = 0; i < 30; i++) await createRecipe(user.id, { source: "ai", createdAt: twoDaysAgo });
    for (let i = 0; i < 30; i++) await createRecipe(other.id, { source: "ai" });
    vi.mocked(suggestOtsumami).mockResolvedValue([suggestion("A")]);

    const result = await suggestAction({ status: "idle" }, form(validInput));

    expect(result.status).toBe("success");
  });

  it("AI が失敗したら、わかりやすいメッセージを返して何も保存しない", async () => {
    await loginAs();
    vi.mocked(suggestOtsumami).mockRejectedValue(new SuggestError("refused", "refused"));

    const result = await suggestAction({ status: "idle" }, form(validInput));

    expect(result).toEqual({ status: "error", message: expect.stringContaining("提案できませんでした") });
    expect(await prisma.recipe.count()).toBe(0);
  });
});
