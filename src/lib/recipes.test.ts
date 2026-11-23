import { describe, expect, it } from "vitest";
import { isValidRecipeId, parseIngredients, parseSteps } from "./recipes";

describe("parseIngredients", () => {
  it("正しい形の材料はそのまま返す", () => {
    const value = [{ name: "キャベツ", amount: "1/4玉" }];
    expect(parseIngredients(value)).toEqual(value);
  });

  it("形が崩れたデータは空の配列にする（画面が壊れないように）", () => {
    expect(parseIngredients(null)).toEqual([]);
    expect(parseIngredients("キャベツ")).toEqual([]);
    expect(parseIngredients([{ name: "キャベツ" }])).toEqual([]);
  });
});

describe("parseSteps", () => {
  it("文字列の配列だけを受け付ける", () => {
    expect(parseSteps(["切る", "和える"])).toEqual(["切る", "和える"]);
    expect(parseSteps([1, 2])).toEqual([]);
    expect(parseSteps({ step: "切る" })).toEqual([]);
  });
});

describe("isValidRecipeId", () => {
  it("UUID の形だけを有効にする", () => {
    expect(isValidRecipeId("6f1c2b8e-3a4d-4e5f-9a6b-7c8d9e0f1a2b")).toBe(true);
    expect(isValidRecipeId("123")).toBe(false);
    expect(isValidRecipeId("'; DROP TABLE recipes; --")).toBe(false);
  });
});
