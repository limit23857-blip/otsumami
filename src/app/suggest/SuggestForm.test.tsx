import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// サーバー側の処理（AI 呼び出し・DB 保存）は偽物に差し替えて、画面の動きだけを確かめる
vi.mock("./actions", () => ({
  suggestAction: vi.fn(async () => ({
    status: "success",
    recipes: [
      {
        id: "6f1c2b8e-3a4d-4e5f-9a6b-7c8d9e0f1a2b",
        title: "豚バラとキャベツの塩だれ炒め",
        ingredients: [{ name: "豚バラ", amount: "150g" }],
        steps: ["炒める"],
        cookMinutes: 8,
      },
    ],
  })),
}));
vi.mock("@/app/recipes/actions", () => ({ toggleFavoriteAction: vi.fn() }));

const { SuggestForm } = await import("./SuggestForm");
const { suggestAction } = await import("./actions");

describe("SuggestForm", () => {
  it("提案したあとも、選んだお酒・食材・時間が残っている", async () => {
    const user = userEvent.setup();
    render(<SuggestForm />);

    await user.click(screen.getByLabelText("ハイボール"));
    await user.type(screen.getByLabelText(/冷蔵庫にある食材/), "豚バラ、キャベツ");
    await user.click(screen.getByLabelText("10分以内"));
    await user.click(screen.getByRole("button", { name: "おつまみを提案してもらう" }));

    // 結果が表示されるまで待つ
    expect(await screen.findByText("豚バラとキャベツの塩だれ炒め")).toBeTruthy();

    // サーバーには選んだ内容が送られている
    const formData = vi.mocked(suggestAction).mock.calls[0][1] as FormData;
    expect(formData.get("drinkType")).toBe("highball");
    expect(formData.get("ingredients")).toBe("豚バラ、キャベツ");
    expect(formData.get("maxMinutes")).toBe("10");

    // 送信後も入力欄がリセットされていない
    expect((screen.getByLabelText(/冷蔵庫にある食材/) as HTMLInputElement).value).toBe("豚バラ、キャベツ");
    expect((screen.getByLabelText("ハイボール") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("10分以内") as HTMLInputElement).checked).toBe(true);
  });
});
