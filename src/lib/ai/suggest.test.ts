import { beforeEach, describe, expect, it, vi } from "vitest";

// Claude API は本物を呼ばない（お金がかからないように、偽物に差し替える）
const parseMock = vi.fn();

vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@anthropic-ai/sdk")>();
  class FakeAnthropic {
    messages = { parse: parseMock };
    static APIError = actual.default.APIError;
    static RateLimitError = actual.default.RateLimitError;
  }
  return { ...actual, default: FakeAnthropic };
});

const { default: Anthropic } = await import("@anthropic-ai/sdk");
const { SuggestError, suggestOtsumami, SUGGEST_MODEL } = await import("./suggest");

const input = { drinkType: "beer" as const, ingredients: "キャベツ", maxMinutes: 10 };

function recipe(title: string, cookMinutes = 5) {
  return { title, ingredients: [{ name: "キャベツ", amount: "1/4玉" }], steps: ["切る"], cookMinutes };
}

beforeEach(() => {
  parseMock.mockReset();
});

describe("suggestOtsumami", () => {
  it("お酒・時間・食材をプロンプトに入れて、指定のモデルで呼び出す", async () => {
    parseMock.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { recipes: [recipe("A")] } });

    await suggestOtsumami(input);

    const request = parseMock.mock.calls[0][0];
    expect(request.model).toBe(SUGGEST_MODEL);
    expect(request.messages[0].content).toContain("ビール");
    expect(request.messages[0].content).toContain("10分");
    expect(request.messages[0].content).toContain("キャベツ");
  });

  it("食材が空なら「指定なし」として送る", async () => {
    parseMock.mockResolvedValue({ stop_reason: "end_turn", parsed_output: { recipes: [recipe("A")] } });

    await suggestOtsumami({ ...input, ingredients: "   " });

    expect(parseMock.mock.calls[0][0].messages[0].content).toContain("手元の食材: 指定なし");
  });

  it("4品以上返ってきても3品に絞り、調理時間を整数かつ上限以内に直す", async () => {
    parseMock.mockResolvedValue({
      stop_reason: "end_turn",
      parsed_output: { recipes: [recipe("A", 4.6), recipe("B", 99), recipe("C", 0), recipe("D")] },
    });

    const result = await suggestOtsumami(input);

    expect(result.map((r) => r.title)).toEqual(["A", "B", "C"]);
    expect(result.map((r) => r.cookMinutes)).toEqual([5, 10, 1]);
  });

  it("AI が回答を断ったら refused エラーにする", async () => {
    parseMock.mockResolvedValue({ stop_reason: "refusal", parsed_output: null });

    await expect(suggestOtsumami(input)).rejects.toMatchObject({ reason: "refused" });
  });

  it("回答を読み取れなかったら invalid_output エラーにする", async () => {
    parseMock.mockResolvedValue({ stop_reason: "max_tokens", parsed_output: null });

    await expect(suggestOtsumami(input)).rejects.toMatchObject({ reason: "invalid_output" });
  });

  it("混雑（429）なら rate_limited、それ以外の API エラーなら unavailable にする", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    parseMock.mockRejectedValueOnce(new Anthropic.RateLimitError(429, undefined, "rate limited", new Headers()));
    await expect(suggestOtsumami(input)).rejects.toMatchObject({ reason: "rate_limited" });

    parseMock.mockRejectedValueOnce(new Anthropic.APIError(500, undefined, "server error", new Headers()));
    await expect(suggestOtsumami(input)).rejects.toMatchObject({ reason: "unavailable" });

    parseMock.mockRejectedValueOnce(new Error("network down"));
    const error = await suggestOtsumami(input).catch((e) => e);
    expect(error).toBeInstanceOf(SuggestError);
    expect(error.reason).toBe("unavailable");
  });
});
